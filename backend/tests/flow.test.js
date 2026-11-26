import bcrypt from 'bcryptjs';
import { signToken } from '../src/lib/auth.js';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ORIGIN, api, auth, createStaff, prisma, rawApi, resetDb, sessionOf } from './setup.js';

const student = {
  name: 'Noura',
  email: 'noura@example.com',
  password: 'Coop-Train-2026',
  universityId: '441000123',
  university: 'KSU',
  major: 'Computer Science',
  degree: 'BACHELOR',
  skills: ['React'],
};

const company = {
  name: 'Khalid',
  email: 'hr@example.com',
  password: 'Coop-Train-2026',
  companyName: 'Riyadh Tech',
  city: 'Riyadh',
  sector: 'Software',
};

const opportunity = {
  title: 'Front-end intern',
  description: 'Build React interfaces for our products.',
  major: 'Computer Science',
  city: 'Riyadh',
  seats: 1,
  durationWeeks: 24,
  deadline: new Date(Date.now() + 7 * 864e5).toISOString(),
};

const report = { tasks: 'Built the login page and wrote tests.', hours: 35, skills: 'React, Jest' };

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('auth', () => {
  test('registers, logs in and returns the profile', async () => {
    const reg = await api().post('/api/auth/register/student').send(student);
    expect(reg.status).toBe(201);
    expect(reg.body.user.passwordHash).toBeUndefined();

    const login = await api().post('/api/auth/login').send({ email: student.email, password: student.password });
    expect(login.status).toBe(200);
    const me = await api().get('/api/auth/me').set(auth(sessionOf(login)));
    expect(me.body.student.major).toBe('Computer Science');
  });

  test('stores the GPA with its scale and rejects a GPA above the scale', async () => {
    const over = await api().post('/api/auth/register/student').send({ ...student, gpa: 4.5, gpaScale: 4 });
    expect(over.status).toBe(400);
    const noScale = await api().post('/api/auth/register/student').send({ ...student, gpa: 3.5 });
    expect(noScale.status).toBe(400);

    const reg = await api().post('/api/auth/register/student').send({ ...student, gpa: 3.75, gpaScale: 4 });
    expect(reg.status).toBe(201);
    const me = await api().get('/api/auth/me').set(auth(sessionOf(reg)));
    expect(me.body.student).toMatchObject({ gpa: '3.75', gpaScale: 4 });
  });

  test('requires the degree (diploma or bachelor) at sign-up and lets it be changed, not cleared', async () => {
    const { degree, ...withoutDegree } = student;
    expect((await api().post('/api/auth/register/student').send(withoutDegree)).status).toBe(400);
    expect((await api().post('/api/auth/register/student').send({ ...student, degree: 'MASTER' })).status).toBe(400);
    expect((await api().post('/api/auth/register/student').send({ ...student, degree: 'bachelor' })).status).toBe(400);
    expect(await prisma.user.count()).toBe(0);

    const reg = await api().post('/api/auth/register/student').send({ ...student, degree: 'DIPLOMA' });
    expect(reg.status).toBe(201);
    const token = sessionOf(reg);
    expect((await api().get('/api/auth/me').set(auth(token))).body.student.degree).toBe('DIPLOMA');

    expect((await api().patch('/api/students/me').set(auth(token)).send({ degree })).body.student.degree).toBe('BACHELOR');
    expect((await api().patch('/api/students/me').set(auth(token)).send({ degree: null })).status).toBe(400);
    expect((await api().patch('/api/students/me').set(auth(token)).send({ degree: 'PHD' })).status).toBe(400);

    // The admin sees and can correct it.
    const admin = await createStaff('ADMIN', 'admin@example.com');
    expect((await api().get('/api/admin/users?role=STUDENT').set(auth(admin))).body[0].student.degree).toBe('BACHELOR');
    const fixed = await api().patch(`/api/admin/users/${reg.body.user.id}`).set(auth(admin)).send({ student: { degree: 'DIPLOMA' } });
    expect(fixed.body.student.degree).toBe('DIPLOMA');
  });

  test('rejects bad credentials, duplicates and invalid input', async () => {
    await api().post('/api/auth/register/student').send(student);
    expect((await api().post('/api/auth/register/student').send(student)).status).toBe(409);
    expect((await api().post('/api/auth/login').send({ email: student.email, password: 'wrong-pass' })).status).toBe(401);
    // Company sign-up takes only its six fields; anything else is refused, not ignored.
    expect((await api().post('/api/auth/register/company').send({ ...company, crNumber: '1010123456' })).status).toBe(400);
    expect((await api().post('/api/auth/register/company').send({ ...company, verified: true })).status).toBe(400);
    expect((await api().post('/api/auth/register/company').send({ ...company, city: '' })).status).toBe(400);
  });

  test('keeps the session in an httpOnly cookie and rejects cross-site writes', async () => {
    const reg = await api().post('/api/auth/register/student').send(student);
    const cookie = [reg.headers['set-cookie']].flat().find((c) => c.startsWith('coopconnect_session='));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/api/);
    expect(reg.body.token).toBeUndefined();
    const token = sessionOf(reg);

    // Tokens are accepted only from the cookie, never from a header a script could set.
    expect((await api().get('/api/auth/me').set({ Authorization: `Bearer ${token}` })).status).toBe(401);
    expect((await api().get('/api/auth/me').set(auth(token))).status).toBe(200);

    // A write from another site, or with no origin at all, is refused even with the cookie.
    const evil = await rawApi().patch('/api/students/me').set(auth(token)).set('Origin', 'https://evil.example').send({ major: 'Hacked' });
    expect(evil.status).toBe(403);
    expect((await rawApi().patch('/api/students/me').set(auth(token)).send({ major: 'Hacked' })).status).toBe(403);
    expect((await rawApi().post('/api/auth/login').send({ email: student.email, password: student.password })).status).toBe(403);
    expect((await prisma.student.findFirst()).major).toBe('Computer Science');

    // Logout expires the cookie.
    const out = await api().post('/api/auth/logout');
    expect(out.status).toBe(204);
    expect([out.headers['set-cookie']].flat().join()).toMatch(/coopconnect_session=;.*Expires=Thu, 01 Jan 1970/);
  });

  test('enforces the password policy on sign-up and on admin-set passwords', async () => {
    const weak = async (password, extra = {}) => (await api().post('/api/auth/register/student').send({ ...student, ...extra, password })).body.details?.map((d) => d.message);
    expect(await weak('Short1')).toContain('Password must be at least 10 characters');
    expect(await weak('onlyletterspass')).toContain('Password must include letters and numbers');
    expect(await weak('Password123')).toContain('Password is too common');
    expect(await weak('QWERTY12345')).toContain('Password is too common');
    expect(await weak('Noura-Pass-2026')).toContain('Password must not contain your name or email');
    expect(await weak('x'.repeat(40) + 'ع'.repeat(20) + '1')).toContain('Password is too long');
    expect(await prisma.user.count()).toBe(0);

    const ok = await api().post('/api/auth/register/student').send(student);
    expect(ok.status).toBe(201);

    // Admin resets follow the same policy, checked against the account's own name and email.
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const reset = await api().patch(`/api/admin/users/${ok.body.user.id}`).set(auth(admin)).send({ password: 'noura-reset-99' });
    expect(reset.status).toBe(400);
    expect(reset.body.details[0].message).toBe('Password must not contain your name or email');
    expect((await api().post('/api/admin/users').set(auth(admin)).send({ name: 'Ops', email: 'ops@example.com', password: 'admin12345', role: 'ADMIN' })).status).toBe(400);
  });

  test('stores password hashes, never passwords', async () => {
    await api().post('/api/auth/register/student').send(student);
    const { passwordHash } = await prisma.user.findFirst();
    expect(passwordHash).not.toContain(student.password);
    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  test('enforces roles', async () => {
    const reg = await api().post('/api/auth/register/student').send(student);
    expect((await api().get('/api/admin/stats').set(auth(sessionOf(reg)))).status).toBe(403);
    expect((await api().get('/api/admin/stats')).status).toBe(401);
  });
});

describe('co-op lifecycle', () => {
  test('opportunity → application → placement → reports → completion', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const s = sessionOf(await api().post('/api/auth/register/student').send(student));
    const c = sessionOf(await api().post('/api/auth/register/company').send(company));

    // Unverified companies cannot post.
    expect((await api().post('/api/opportunities').set(auth(c)).send(opportunity)).status).toBe(403);
    const pending = await api().get('/api/admin/companies?verified=false').set(auth(admin));
    await api().patch(`/api/admin/companies/${pending.body[0].id}/verify`).set(auth(admin));

    const opp = await api().post('/api/opportunities').set(auth(c)).send(opportunity);
    expect(opp.status).toBe(201);
    const list = await api().get('/api/opportunities?major=computer science').set(auth(s));
    expect(list.body).toHaveLength(1);

    const app = await api().post('/api/applications').set(auth(s)).send({ opportunityId: opp.body.id });
    expect(app.status).toBe(201);
    expect((await api().post('/api/applications').set(auth(s)).send({ opportunityId: opp.body.id })).status).toBe(409);

    const applicants = await api().get(`/api/opportunities/${opp.body.id}/applications`).set(auth(c));
    expect(applicants.body[0].student.user.name).toBe('Noura');

    const decision = await api()
      .patch(`/api/applications/${app.body.id}/decision`)
      .set(auth(c))
      .send({ status: 'ACCEPTED', startDate: '2026-01-04' });
    expect(decision.status).toBe(200);
    const placementId = decision.body.placement.id;
    expect(new Date(decision.body.placement.endDate).toISOString().slice(0, 10)).toBe('2026-06-21');

    const weekly = await api()
      .post(`/api/placements/${placementId}/reports`)
      .set(auth(s))
      .send({ type: 'WEEKLY', weekNo: 1, ...report });
    expect(weekly.status).toBe(201);

    // The admin reviews reports while the supervisor role is paused. Returning
    // a report requires feedback; the student can then revise it.
    expect((await api().patch(`/api/reports/${weekly.body.id}/review`).set(auth(s)).send({ status: 'APPROVED' })).status).toBe(403);
    expect((await api().patch(`/api/reports/${weekly.body.id}/review`).set(auth(admin)).send({ status: 'RETURNED' })).status).toBe(400);
    await api().patch(`/api/reports/${weekly.body.id}/review`).set(auth(admin)).send({ status: 'RETURNED', feedback: 'Add detail' });
    const revised = await api().put(`/api/reports/${weekly.body.id}`).set(auth(s)).send({ ...report, hours: 38 });
    expect(revised.body.status).toBe('SUBMITTED');
    await api().patch(`/api/reports/${weekly.body.id}/review`).set(auth(admin)).send({ status: 'APPROVED' });

    // Completion needs an approved final report.
    expect((await api().patch(`/api/placements/${placementId}/complete`).set(auth(admin))).status).toBe(409);
    const final = await api().post(`/api/placements/${placementId}/reports`).set(auth(s)).send({ type: 'FINAL', ...report });
    await api().patch(`/api/reports/${final.body.id}/review`).set(auth(admin)).send({ status: 'APPROVED' });
    const done = await api().patch(`/api/placements/${placementId}/complete`).set(auth(admin));
    expect(done.body.status).toBe('COMPLETED');

    const stats = await api().get('/api/admin/stats').set(auth(admin));
    expect(stats.body).toMatchObject({ students: 1, companies: 1, applications: { ACCEPTED: 1 } });
  });

  test('participants only: another student cannot see or report on a placement', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const c = sessionOf(await api().post('/api/auth/register/company').send(company));
    await prisma.company.updateMany({ data: { verified: true } });
    const opp = await api().post('/api/opportunities').set(auth(c)).send({ ...opportunity, seats: 1 });
    const s1 = sessionOf(await api().post('/api/auth/register/student').send(student));
    const s2 = sessionOf(await api().post('/api/auth/register/student').send({ ...student, email: 'b@example.com', universityId: '441000999' }));
    const a1 = await api().post('/api/applications').set(auth(s1)).send({ opportunityId: opp.body.id });
    const a2 = await api().post('/api/applications').set(auth(s2)).send({ opportunityId: opp.body.id });

    const accepted = await api().patch(`/api/applications/${a1.body.id}/decision`).set(auth(c)).send({ status: 'ACCEPTED', startDate: '2026-01-04' });
    // Only one seat.
    expect((await api().patch(`/api/applications/${a2.body.id}/decision`).set(auth(c)).send({ status: 'ACCEPTED', startDate: '2026-01-04' })).status).toBe(409);

    const pid = accepted.body.placement.id;
    expect((await api().get(`/api/placements/${pid}`).set(auth(s2))).status).toBe(404);
    expect((await api().post(`/api/placements/${pid}/reports`).set(auth(s2)).send({ type: 'FINAL', ...report })).status).toBe(404);
    expect((await api().get('/api/placements').set(auth(admin))).body).toHaveLength(1);
  });
});

describe('company directory', () => {
  test('lists verified companies that take co-op students, with their contact details', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const studentToken = sessionOf(await api().post('/api/auth/register/student').send(student));
    const companyToken = sessionOf(await api().post('/api/auth/register/company').send(company));

    // Self-registered companies stay hidden until verified.
    expect((await api().get('/api/companies').set(auth(studentToken))).body).toEqual([]);

    const profile = await api().patch('/api/companies/me').set(auth(companyToken))
      .send({ description: 'We build software.', website: 'https://example.com', majors: ['علوم الحاسب'] });
    expect(profile.status).toBe(200);
    expect((await api().patch('/api/companies/me').set(auth(companyToken)).send({ website: 'javascript:alert(1)' })).status).toBe(400);

    const added = await api().post('/api/admin/companies').set(auth(admin))
      .send({ name: 'Directory Co', city: 'Jeddah', sector: 'Energy', contactEmail: 'coop@example.com' });
    expect(added.status).toBe(201);
    expect((await api().post('/api/admin/companies').set(auth(studentToken)).send({ name: 'x', city: 'y', sector: 'z' })).status).toBe(403);

    const companies = await prisma.company.findMany({ where: { userId: { not: null } } });
    await api().patch(`/api/admin/companies/${companies[0].id}/verify`).set(auth(admin));

    const list = (await api().get('/api/companies').set(auth(studentToken))).body;
    expect(list.map((c) => c.name)).toEqual(['Directory Co', 'Riyadh Tech']);
    expect(list[0].email).toBe('coop@example.com');
    expect(list[1].email).toBe(company.email);
    expect(list[1].crNumber).toBeUndefined();

    const details = await api().get(`/api/companies/${list[1].id}`).set(auth(studentToken));
    expect(details.body).toMatchObject({ description: 'We build software.', website: 'https://example.com', opportunities: [] });

    await api().patch(`/api/admin/companies/${added.body.id}`).set(auth(admin)).send({ coopOpen: false });
    expect((await api().get('/api/companies').set(auth(studentToken))).body).toHaveLength(1);
  });
});

describe('accreditation badge', () => {
  test('self-registered companies carry it, admin-added ones do not until granted, and only the admin changes it', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const s = sessionOf(await api().post('/api/auth/register/student').send(student));
    const c = sessionOf(await api().post('/api/auth/register/company').send(company));
    const registered = await prisma.company.findFirst();
    await api().patch(`/api/admin/companies/${registered.id}/review`).set(auth(admin)).send({ status: 'APPROVED' });
    const added = (await api().post('/api/admin/companies').set(auth(admin)).send({ name: 'Directory Co', city: 'Jeddah', sector: 'Energy' })).body;
    expect(added.accredited).toBe(false);

    const badges = async () => Object.fromEntries((await api().get('/api/companies').set(auth(s))).body.map((x) => [x.name, x.accredited]));
    expect(await badges()).toEqual({ 'Directory Co': false, 'Riyadh Tech': true });

    // The client can never set it: not at sign-up, not on the company's own profile, not on admin create or edit.
    expect((await api().post('/api/auth/register/company').send({ ...company, email: 'x@example.com', accredited: false })).status).toBe(400);
    expect((await api().patch('/api/companies/me').set(auth(c)).send({ accredited: false })).status).toBe(400);
    expect((await api().patch('/api/companies/me').set(auth(c)).send({ verified: true })).status).toBe(400);
    expect((await api().post('/api/admin/companies').set(auth(admin)).send({ name: 'Sneaky', city: 'Riyadh', sector: 'IT', accredited: true })).status).toBe(400);
    expect((await api().patch(`/api/admin/companies/${added.id}`).set(auth(admin)).send({ accredited: true })).status).toBe(400);

    // Only the admin toggles it, through its own endpoint; each change is logged.
    expect((await api().patch(`/api/admin/companies/${added.id}/accreditation`).set(auth(c)).send({ accredited: true })).status).toBe(403);
    expect((await api().patch(`/api/admin/companies/${added.id}/accreditation`).set(auth(s)).send({ accredited: true })).status).toBe(403);
    expect((await api().patch(`/api/admin/companies/${added.id}/accreditation`).set(auth(admin)).send({ accredited: 'yes' })).status).toBe(400);
    expect((await api().patch(`/api/admin/companies/${added.id}/accreditation`).set(auth(admin)).send({ accredited: true, verified: false })).status).toBe(400);
    expect((await api().patch('/api/admin/companies/999999/accreditation').set(auth(admin)).send({ accredited: true })).status).toBe(404);
    const granted = await api().patch(`/api/admin/companies/${added.id}/accreditation`).set(auth(admin)).send({ accredited: true });
    expect(granted.body).toMatchObject({ accredited: true, verified: true });
    await api().patch(`/api/admin/companies/${registered.id}/accreditation`).set(auth(admin)).send({ accredited: false });
    expect(await badges()).toEqual({ 'Directory Co': true, 'Riyadh Tech': false });
    const log = (await api().get(`/api/admin/companies/${registered.id}`).set(auth(admin))).body.notes.map((n) => n.body);
    expect(log).toContain('سحب علامة الاعتماد');

    // The badge does not list a company: an unapproved request stays hidden even if it carries it.
    await api().patch(`/api/admin/companies/${registered.id}/accreditation`).set(auth(admin)).send({ accredited: true });
    await api().patch(`/api/admin/companies/${registered.id}/review`).set(auth(admin)).send({ status: 'REJECTED' });
    expect(Object.keys(await badges())).toEqual(['Directory Co']);
  });
});

describe('admin control panel', () => {
  test('lists, edits, suspends and deletes accounts', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const regRes = await api().post('/api/auth/register/student').send(student);
    const reg = { ...regRes.body, token: sessionOf(regRes) };
    const studentId = reg.user.id;

    const students = await api().get('/api/admin/users?role=STUDENT').set(auth(admin));
    expect(students.body.map((u) => u.email)).toEqual([student.email]);
    expect((await api().get('/api/admin/users?q=441000123').set(auth(admin))).body).toHaveLength(1);

    const details = await api().get(`/api/admin/users/${studentId}`).set(auth(admin));
    expect(details.body.student).toMatchObject({ universityId: '441000123', applications: [], placements: [], plans: [] });
    expect(details.body.passwordHash).toBeUndefined();

    const edited = await api().patch(`/api/admin/users/${studentId}`).set(auth(admin))
      .send({ name: 'Noura A', student: { major: 'Software Engineering' }, password: 'Fresh-Start-2026' });
    expect(edited.body).toMatchObject({ name: 'Noura A', student: { major: 'Software Engineering' } });
    expect((await api().post('/api/auth/login').send({ email: student.email, password: 'Fresh-Start-2026' })).status).toBe(200);

    // Suspension blocks both new logins and tokens already issued.
    await api().patch(`/api/admin/users/${studentId}`).set(auth(admin)).send({ isActive: false });
    expect((await api().post('/api/auth/login').send({ email: student.email, password: 'Fresh-Start-2026' })).status).toBe(403);
    expect((await api().get('/api/auth/me').set(auth(reg.token))).status).toBe(403);

    const adminId = (await api().get('/api/auth/me').set(auth(admin))).body.id;
    expect((await api().patch(`/api/admin/users/${adminId}`).set(auth(admin)).send({ isActive: false })).status).toBe(409);
    expect((await api().delete(`/api/admin/users/${adminId}`).set(auth(admin))).status).toBe(409);

    const staff = await api().post('/api/admin/users').set(auth(admin)).send({ name: 'Second Admin', email: 'a2@example.com', password: 'Ops-Desk-4410', role: 'ADMIN' });
    expect(staff.body.role).toBe('ADMIN');

    expect((await api().delete(`/api/admin/users/${studentId}`).set(auth(admin))).status).toBe(204);
    expect(await prisma.student.count()).toBe(0);
  });

  test('records placements and manages opportunities for any company', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const studentToken = sessionOf(await api().post('/api/auth/register/student').send(student));
    const studentProfile = await prisma.student.findFirst();
    const company = (await api().post('/api/admin/companies').set(auth(admin)).send({ name: 'Directory Co', city: 'Jeddah', sector: 'Energy' })).body;

    const opp = await api().post('/api/admin/opportunities').set(auth(admin)).send({ ...opportunity, companyId: company.id });
    expect(opp.status).toBe(201);
    await api().patch(`/api/admin/opportunities/${opp.body.id}`).set(auth(admin)).send({ isOpen: false });
    expect((await api().get('/api/admin/opportunities').set(auth(admin))).body[0].isOpen).toBe(false);
    expect((await api().delete(`/api/admin/opportunities/${opp.body.id}`).set(auth(admin))).status).toBe(204);

    const placementBody = { studentId: studentProfile.id, companyId: company.id, title: 'Field engineer co-op', startDate: '2026-09-01', endDate: '2026-12-01' };
    expect((await api().post('/api/admin/placements').set(auth(admin)).send({ ...placementBody, endDate: '2026-08-01' })).status).toBe(400);
    const placement = await api().post('/api/admin/placements').set(auth(admin)).send(placementBody);
    expect(placement.status).toBe(201);
    expect((await api().post('/api/admin/placements').set(auth(admin)).send(placementBody)).status).toBe(409);

    // The student sees it like any other placement, and reports work.
    const mine = await api().get('/api/placements').set(auth(studentToken));
    expect(mine.body[0]).toMatchObject({ title: 'Field engineer co-op', application: null });
    const reportRes = await api().post(`/api/placements/${placement.body.id}/reports`).set(auth(studentToken)).send({ ...report, type: 'WEEKLY', weekNo: 1 });
    expect(reportRes.status).toBe(201);

    const updated = await api().patch(`/api/admin/placements/${placement.body.id}`).set(auth(admin)).send({ status: 'COMPLETED' });
    expect(updated.body.status).toBe('COMPLETED');

    // Deleting a directory company removes its placements.
    expect((await api().delete(`/api/admin/companies/${company.id}`).set(auth(admin))).status).toBe(204);
    expect(await prisma.placement.count()).toBe(0);
  });
});

describe('paused supervisor role', () => {
  test('supervisors cannot sign in, be created or be assigned until the role is re-enabled', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const supervisorUser = await prisma.user.create({ data: { name: 'Sup', email: 'sup@example.com', role: 'SUPERVISOR', passwordHash: await bcrypt.hash('Password123', 4) } });
    const oldToken = signToken(supervisorUser);

    expect((await api().post('/api/auth/login').send({ email: 'sup@example.com', password: 'Password123' })).status).toBe(403);
    expect((await api().get('/api/auth/me').set(auth(oldToken))).status).toBe(403);
    expect((await api().post('/api/admin/users').set(auth(admin)).send({ name: 'New Sup', email: 's2@example.com', password: 'Advisor-Desk-77', role: 'SUPERVISOR' })).status).toBe(409);
    expect((await api().get('/api/admin/supervisors').set(auth(admin))).body).toEqual([]);

    const company = (await api().post('/api/admin/companies').set(auth(admin)).send({ name: 'Co', city: 'Riyadh', sector: 'Energy' })).body;
    await api().post('/api/auth/register/student').send(student);
    const studentId = (await prisma.student.findFirst()).id;
    const body = { studentId, companyId: company.id, title: 'Co-op', startDate: '2026-09-01', endDate: '2026-12-01', supervisorId: supervisorUser.id };
    expect((await api().post('/api/admin/placements').set(auth(admin)).send(body)).status).toBe(409);

    process.env.SUPERVISOR_ROLE_ENABLED = 'true';
    try {
      expect((await api().post('/api/auth/login').send({ email: 'sup@example.com', password: 'Password123' })).status).toBe(200);
      expect((await api().post('/api/admin/placements').set(auth(admin)).send(body)).status).toBe(201);
    } finally {
      delete process.env.SUPERVISOR_ROLE_ENABLED;
    }
  });
});

describe('company logos', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
  const asDataUrl = (buf, type = 'image/png') => `data:${type};base64,${buf.toString('base64')}`;

  test('accepts raster images only, from the company itself or the admin', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const c = sessionOf(await api().post('/api/auth/register/company').send(company));
    const s = sessionOf(await api().post('/api/auth/register/student').send(student));
    const companyId = (await prisma.company.findFirst()).id;

    const ok = await api().put('/api/companies/me/logo').set(auth(c)).send({ image: asDataUrl(png) });
    expect(ok.status).toBe(200);
    expect(ok.body.logoVersion).toEqual(expect.any(Number));

    // The type is read from the bytes: a script labelled as PNG, SVG and HTML are all refused.
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await api().put('/api/companies/me/logo').set(auth(c)).send({ image: asDataUrl(svg, 'image/svg+xml') })).status).toBe(400);
    expect((await api().put('/api/companies/me/logo').set(auth(c)).send({ image: asDataUrl(Buffer.from('<html>hi</html>')) })).status).toBe(400);
    expect((await api().put('/api/companies/me/logo').set(auth(c)).send({ image: 'not base64!' })).status).toBe(400);
    expect((await api().put('/api/companies/me/logo').set(auth(c)).send({ image: asDataUrl(png), extra: 1 })).status).toBe(400);
    const big = Buffer.concat([png, Buffer.alloc(301 * 1024)]);
    expect((await api().put('/api/companies/me/logo').set(auth(c)).send({ image: asDataUrl(big) })).status).toBeGreaterThanOrEqual(400);

    // Students cannot upload; only the admin can set another company's logo.
    expect((await api().put('/api/companies/me/logo').set(auth(s)).send({ image: asDataUrl(png) })).status).toBe(403);
    expect((await api().put(`/api/admin/companies/${companyId}/logo`).set(auth(s)).send({ image: asDataUrl(png) })).status).toBe(403);

    // Not served until the company is verified, so unreviewed accounts cannot host images here.
    expect((await api().get(`/api/logos/${companyId}`)).status).toBe(404);
    await api().patch(`/api/admin/companies/${companyId}/verify`).set(auth(admin));
    const served = await api().get(`/api/logos/${companyId}`);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['content-security-policy']).toBe("default-src 'none'");
    expect(Buffer.compare(served.body, png)).toBe(0);

    const listed = (await api().get('/api/companies').set(auth(s))).body[0];
    expect(listed.logoVersion).toEqual(expect.any(Number));
    expect(listed.logo).toBeUndefined();

    expect((await api().delete(`/api/admin/companies/${companyId}/logo`).set(auth(admin))).status).toBe(204);
    expect((await api().get(`/api/logos/${companyId}`)).status).toBe(404);
    expect((await api().get('/api/logos/abc')).status).toBe(404);
  });
});

describe('company registration requests', () => {
  test('a request is reviewed, noted, completed and then approved or rejected by the admin only', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const adminId = (await api().get('/api/auth/me').set(auth(admin))).body.id;
    const c = sessionOf(await api().post('/api/auth/register/company').send(company));
    const s = sessionOf(await api().post('/api/auth/register/student').send(student));
    const companyId = (await prisma.company.findFirst()).id;

    // A new request waits: hidden from students, cannot post, counted for the admin.
    expect((await api().get('/api/companies/me').set(auth(c))).body).toMatchObject({ reviewStatus: 'PENDING', verified: false, crNumber: null });
    expect((await api().get('/api/companies').set(auth(s))).body).toEqual([]);
    expect((await api().post('/api/opportunities').set(auth(c)).send(opportunity)).status).toBe(403);
    expect((await api().get('/api/admin/stats').set(auth(admin))).body.pendingCompanies).toBe(1);
    expect((await api().get('/api/admin/companies?status=PENDING,CONTACTED').set(auth(admin))).body).toHaveLength(1);

    // Only the admin moves a request or reads its notes.
    expect((await api().patch(`/api/admin/companies/${companyId}/review`).set(auth(c)).send({ status: 'APPROVED' })).status).toBe(403);
    expect((await api().get(`/api/admin/companies/${companyId}`).set(auth(c))).status).toBe(403);

    const contacted = await api().patch(`/api/admin/companies/${companyId}/review`).set(auth(admin)).send({ status: 'CONTACTED', note: 'Emailed for CR and website' });
    expect(contacted.body).toMatchObject({ reviewStatus: 'CONTACTED', verified: false });
    await api().post(`/api/admin/companies/${companyId}/notes`).set(auth(admin)).send({ body: 'CR received' });
    const details = (await api().get(`/api/admin/companies/${companyId}`).set(auth(admin))).body;
    expect(details.notes.map((n) => n.body)).toEqual(['CR received', 'Emailed for CR and website']);
    expect(details.notes[0].author).toMatchObject({ id: adminId });
    expect(details.user).toMatchObject({ name: company.name, email: company.email });
    const own = (await api().get('/api/companies/me').set(auth(c))).body;
    expect(own.reviewStatus).toBe('CONTACTED');
    expect(own.notes).toBeUndefined();

    // The admin completes the details; approval cannot be set through an edit.
    expect((await api().patch(`/api/admin/companies/${companyId}`).set(auth(admin)).send({ crNumber: '12' })).status).toBe(400);
    expect((await api().patch(`/api/admin/companies/${companyId}`).set(auth(admin)).send({ verified: true })).status).toBe(400);
    const completed = await api().patch(`/api/admin/companies/${companyId}`).set(auth(admin)).send({ crNumber: '1010123456', website: 'https://example.com' });
    expect(completed.body).toMatchObject({ crNumber: '1010123456', verified: false });

    await api().patch(`/api/admin/companies/${companyId}/review`).set(auth(admin)).send({ status: 'APPROVED' });
    expect((await api().get('/api/companies').set(auth(s))).body).toHaveLength(1);
    const posted = await api().post('/api/opportunities').set(auth(c)).send(opportunity);
    expect(posted.status).toBe(201);
    const oppUrl = `/api/opportunities/${posted.body.id}`;
    const seen = await api().get(oppUrl).set(auth(s));
    expect(seen.status).toBe(200);
    // Only the public summary: the review flag and the owner's user id stay server-side.
    expect(Object.keys(seen.body.company).sort()).toEqual(['city', 'id', 'name', 'sector']);
    expect((await api().get('/api/opportunities/abc').set(auth(s))).status).toBe(404);
    expect((await api().get('/api/opportunities/99999').set(auth(s))).status).toBe(404);
    expect((await api().get('/api/admin/stats').set(auth(admin))).body.pendingCompanies).toBe(0);

    // Rejecting takes the company out of the directory and stops new posts.
    const rejected = await api().patch(`/api/admin/companies/${companyId}/review`).set(auth(admin)).send({ status: 'REJECTED', note: 'Not a training organization' });
    expect(rejected.body).toMatchObject({ reviewStatus: 'REJECTED', verified: false });
    expect((await api().get('/api/companies').set(auth(s))).body).toEqual([]);
    expect((await api().post('/api/opportunities').set(auth(c)).send(opportunity)).status).toBe(403);

    // Its existing opportunity is hidden by id too, except from the company itself and admins.
    expect((await api().get(oppUrl).set(auth(s))).status).toBe(404);
    expect((await api().get(oppUrl).set(auth(c))).status).toBe(200);
    expect((await api().get(oppUrl).set(auth(admin))).status).toBe(200);
  });
});

describe('auth rate limit', () => {
  test('answers 429 with a JSON error the frontend can translate', async () => {
    const throttled = createApp({ throttleAuth: true });
    const hit = () => request(throttled).get('/api/auth/me').set('Origin', ORIGIN);
    for (let i = 0; i < 50; i++) expect((await hit()).status).toBe(401);
    const res = await hit();
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Too many requests' });
  });
});
