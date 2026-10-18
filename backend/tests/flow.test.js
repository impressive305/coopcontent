import { api, auth, createStaff, prisma, resetDb } from './setup.js';

const student = {
  name: 'Noura',
  email: 'noura@example.com',
  password: 'Password123',
  universityId: '441000123',
  university: 'KSU',
  major: 'Computer Science',
  skills: ['React'],
};

const company = {
  name: 'Khalid',
  email: 'hr@example.com',
  password: 'Password123',
  companyName: 'Riyadh Tech',
  crNumber: '1010123456',
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
    const me = await api().get('/api/auth/me').set(auth(login.body.token));
    expect(me.body.student.major).toBe('Computer Science');
  });

  test('rejects bad credentials, duplicates and invalid input', async () => {
    await api().post('/api/auth/register/student').send(student);
    expect((await api().post('/api/auth/register/student').send(student)).status).toBe(409);
    expect((await api().post('/api/auth/login').send({ email: student.email, password: 'wrong-pass' })).status).toBe(401);
    expect((await api().post('/api/auth/register/company').send({ ...company, crNumber: '12' })).status).toBe(400);
  });

  test('enforces roles', async () => {
    const { body } = await api().post('/api/auth/register/student').send(student);
    expect((await api().get('/api/admin/stats').set(auth(body.token))).status).toBe(403);
    expect((await api().get('/api/admin/stats')).status).toBe(401);
  });
});

describe('co-op lifecycle', () => {
  test('opportunity → application → placement → reports → completion', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const supervisor = await createStaff('SUPERVISOR', 'sup@example.com');
    const supervisorId = (await prisma.user.findUnique({ where: { email: 'sup@example.com' } })).id;
    const s = (await api().post('/api/auth/register/student').send(student)).body.token;
    const c = (await api().post('/api/auth/register/company').send(company)).body.token;

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

    await api().patch(`/api/placements/${placementId}/supervisor`).set(auth(admin)).send({ supervisorId });

    const weekly = await api()
      .post(`/api/placements/${placementId}/reports`)
      .set(auth(s))
      .send({ type: 'WEEKLY', weekNo: 1, ...report });
    expect(weekly.status).toBe(201);

    // Returning a report requires feedback; the student can then revise it.
    expect((await api().patch(`/api/reports/${weekly.body.id}/review`).set(auth(supervisor)).send({ status: 'RETURNED' })).status).toBe(400);
    await api().patch(`/api/reports/${weekly.body.id}/review`).set(auth(supervisor)).send({ status: 'RETURNED', feedback: 'Add detail' });
    const revised = await api().put(`/api/reports/${weekly.body.id}`).set(auth(s)).send({ ...report, hours: 38 });
    expect(revised.body.status).toBe('SUBMITTED');
    await api().patch(`/api/reports/${weekly.body.id}/review`).set(auth(supervisor)).send({ status: 'APPROVED' });

    // Completion needs an approved final report.
    expect((await api().patch(`/api/placements/${placementId}/complete`).set(auth(supervisor))).status).toBe(409);
    const final = await api().post(`/api/placements/${placementId}/reports`).set(auth(s)).send({ type: 'FINAL', ...report });
    await api().patch(`/api/reports/${final.body.id}/review`).set(auth(supervisor)).send({ status: 'APPROVED' });
    const done = await api().patch(`/api/placements/${placementId}/complete`).set(auth(supervisor));
    expect(done.body.status).toBe('COMPLETED');

    const stats = await api().get('/api/admin/stats').set(auth(admin));
    expect(stats.body).toMatchObject({ students: 1, companies: 1, applications: { ACCEPTED: 1 } });
  });

  test('participants only: another student cannot see or report on a placement', async () => {
    const admin = await createStaff('ADMIN', 'admin@example.com');
    const c = (await api().post('/api/auth/register/company').send(company)).body.token;
    await prisma.company.updateMany({ data: { verified: true } });
    const opp = await api().post('/api/opportunities').set(auth(c)).send({ ...opportunity, seats: 1 });
    const s1 = (await api().post('/api/auth/register/student').send(student)).body.token;
    const s2 = (await api().post('/api/auth/register/student').send({ ...student, email: 'b@example.com', universityId: '441000999' })).body.token;
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
