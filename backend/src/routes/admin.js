import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { BCRYPT_ROUNDS } from '../lib/auth.js';
import { checkPassword, passwordField, passwordProblems } from '../lib/password.js';
import { HttpError, notFound } from '../lib/errors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { companyProfileSchema } from './companies.js';
import { deleteLogo, logoUploadSchema, logoVersion, logoVersionSelect, saveLogo } from '../lib/logos.js';
import { opportunitySchema } from './opportunities.js';
import { assertSupervisorRoleEnabled, supervisorRoleEnabled } from '../lib/features.js';

// The training unit's control panel: every account, company, opportunity and placement.
const router = Router();
router.use(authenticate, requireRole('ADMIN'));

const id = (req) => Number(req.params.id);
const email = z.string().trim().toLowerCase().pipe(z.email());

// ---------- Users ----------

const staffSchema = z.object({
  name: z.string().trim().min(2),
  email,
  password: passwordField,
  role: z.enum(['SUPERVISOR', 'ADMIN']).default('SUPERVISOR'),
}).superRefine(checkPassword);

const userUpdateSchema = z.object({
  name: z.string().trim().min(2),
  email,
  password: passwordField,
  isActive: z.boolean(),
  student: z.object({
    universityId: z.string().trim().min(3),
    university: z.string().trim().min(2),
    major: z.string().trim().min(2),
    gpa: z.number().min(0).max(5).nullable(),
    gpaScale: z.union([z.literal(4), z.literal(5)]).nullable(),
    skills: z.array(z.string().trim().min(1)).max(30),
  }).partial(),
}).partial();

const userSummary = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  student: { select: { id: true, universityId: true, university: true, major: true } },
  company: { select: { id: true, name: true, verified: true } },
};

const progress = (content) => {
  const tasks = content.weeks.flatMap((w) => w.tasks);
  return { done: tasks.filter((t) => t.done).length, total: tasks.length };
};

const placementSummary = {
  company: { select: { id: true, name: true } },
  supervisor: { select: { id: true, name: true } },
  student: { select: { id: true, user: { select: { id: true, name: true } } } },
  application: { select: { opportunity: { select: { title: true } } } },
  _count: { select: { reports: true } },
};

const createUser = async ({ password, ...data }) =>
  prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) }, select: userSummary });

router.get('/users', validate(z.object({
  role: z.enum(['STUDENT', 'SUPERVISOR', 'COMPANY', 'ADMIN']).optional(),
  q: z.string().trim().optional(),
}), 'query'), async (req, res) => {
  const { role, q } = req.validQuery;
  const contains = q ? { contains: q, mode: 'insensitive' } : undefined;
  const users = await prisma.user.findMany({
    where: {
      role,
      OR: q
        ? [{ name: contains }, { email: contains }, { student: { universityId: contains } }, { company: { name: contains } }]
        : undefined,
    },
    select: userSummary,
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

router.post('/users', validate(staffSchema), async (req, res) => {
  if (req.body.role === 'SUPERVISOR') assertSupervisorRoleEnabled();
  res.status(201).json(await createUser(req.body));
});

// Kept for older clients; same as POST /users with role SUPERVISOR.
router.post('/supervisors', validate(staffSchema), async (req, res) => {
  assertSupervisorRoleEnabled();
  res.status(201).json(await createUser({ ...req.body, role: 'SUPERVISOR' }));
});

router.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: id(req) },
    select: {
      ...userSummary,
      student: {
        include: {
          applications: { include: { opportunity: { select: { title: true, company: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } },
          placements: { include: placementSummary, orderBy: { startDate: 'desc' } },
          plans: { orderBy: { createdAt: 'desc' } },
        },
      },
      company: {
        include: {
          opportunities: { include: { _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' } },
          placements: { include: placementSummary, orderBy: { startDate: 'desc' } },
        },
      },
      supervisedUnits: { include: placementSummary, orderBy: { startDate: 'desc' } },
    },
  });
  if (!user) throw notFound('User');
  if (user.student) {
    // Plan bodies are large; the admin view needs only their progress.
    user.student.plans = user.student.plans.map(({ content, ...plan }) => ({ ...plan, title: content.title, progress: progress(content) }));
  }
  res.json(user);
});

router.patch('/users/:id', validate(userUpdateSchema), async (req, res) => {
  const { password, student, ...data } = req.body;
  if (id(req) === req.user.id && data.isActive === false) throw new HttpError(409, 'You cannot suspend your own account');
  const existing = await prisma.user.findUnique({ where: { id: id(req) }, include: { student: true } });
  if (!existing) throw notFound('User');
  if (student && !existing.student) throw new HttpError(400, 'User has no student profile');
  if (password) {
    const problems = passwordProblems(password, { name: data.name ?? existing.name, email: data.email ?? existing.email });
    if (problems.length) throw new HttpError(400, 'Validation failed', problems.map((message) => ({ path: 'password', message })));
  }
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(password && { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) }),
      ...(student && { student: { update: student } }),
    },
    select: userSummary,
  });
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  if (id(req) === req.user.id) throw new HttpError(409, 'You cannot delete your own account');
  await prisma.user.delete({ where: { id: id(req) } });
  res.status(204).end();
});

// ---------- Supervisors ----------

router.get('/supervisors', async (_req, res) => {
  if (!supervisorRoleEnabled()) return res.json([]);
  const supervisors = await prisma.user.findMany({
    where: { role: 'SUPERVISOR', isActive: true },
    select: { id: true, name: true, email: true, _count: { select: { supervisedUnits: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(supervisors);
});

// ---------- Companies ----------

const REVIEW_STATUSES = ['PENDING', 'CONTACTED', 'APPROVED', 'REJECTED'];
// Requests still waiting on the training unit.
const OPEN_REQUESTS = ['PENDING', 'CONTACTED'];

router.get('/companies', validate(z.object({
  verified: z.enum(['true', 'false']).optional(),
  status: z.string().optional(),
}), 'query'), async (req, res) => {
  const { verified, status } = req.validQuery;
  const statuses = status?.split(',').filter((s) => REVIEW_STATUSES.includes(s));
  const companies = await prisma.company.findMany({
    where: { verified: verified === undefined ? undefined : verified === 'true', reviewStatus: statuses?.length ? { in: statuses } : undefined },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { opportunities: true, placements: true } },
      ...logoVersionSelect,
    },
    orderBy: { id: 'desc' },
  });
  res.json(companies.map(({ logo, ...c }) => ({ ...c, logoVersion: logoVersion(logo) })));
});

// Directory-only company: no account, approved by the admin who adds it.
router.post('/companies', validate(companyProfileSchema), async (req, res) => {
  const company = await prisma.company.create({ data: { ...req.body, verified: true, reviewStatus: 'APPROVED', reviewedAt: new Date() } });
  res.status(201).json(company);
});

// A request with its contact, details and the training unit's notes.
router.get('/companies/:id', async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: id(req) },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      _count: { select: { opportunities: true, placements: true } },
      ...logoVersionSelect,
    },
  });
  if (!company) throw notFound('Company');
  const { logo, ...rest } = company;
  res.json({ ...rest, logoVersion: logoVersion(logo) });
});

// Details the admin completes while reviewing, including the commercial
// registration. Approval is not set here; it goes through /review.
router.patch('/companies/:id', validate(companyProfileSchema.extend({
  crNumber: z.string().trim().regex(/^\d{10}$/, 'Commercial registration must be 10 digits').nullable(),
}).partial().strict()), async (req, res) => {
  const company = await prisma.company.update({ where: { id: id(req) }, data: req.body });
  res.json(company);
});

const noteBody = z.string().trim().min(1).max(2000);

// Moves a request along its review; `verified` follows the status so they never disagree.
const review = (companyId, status, note, authorId) =>
  prisma.$transaction(async (tx) => {
    const company = await tx.company.update({
      where: { id: companyId },
      data: { reviewStatus: status, verified: status === 'APPROVED', reviewedAt: ['APPROVED', 'REJECTED'].includes(status) ? new Date() : null },
    });
    if (note) await tx.companyNote.create({ data: { companyId, authorId, body: note } });
    return company;
  });

router.patch('/companies/:id/review', validate(z.strictObject({ status: z.enum(REVIEW_STATUSES), note: noteBody.optional() })), async (req, res) => {
  res.json(await review(id(req), req.body.status, req.body.note, req.user.id));
});

router.post('/companies/:id/notes', validate(z.strictObject({ body: noteBody })), async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: id(req) } });
  if (!company) throw notFound('Company');
  const note = await prisma.companyNote.create({
    data: { companyId: company.id, authorId: req.user.id, body: req.body.body },
    include: { author: { select: { id: true, name: true } } },
  });
  res.status(201).json(note);
});

router.put('/companies/:id/logo', validate(logoUploadSchema), async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: id(req) } });
  if (!company) throw notFound('Company');
  const logo = await saveLogo(company.id, req.body.image);
  res.json({ logoVersion: logoVersion(logo) });
});

router.delete('/companies/:id/logo', async (req, res) => {
  await deleteLogo(id(req));
  res.status(204).end();
});

// Kept for older clients; same as a review to APPROVED.
router.patch('/companies/:id/verify', async (req, res) => {
  res.json(await review(id(req), 'APPROVED', null, req.user.id));
});

// A registered company is removed with its account, so no company login is left without a profile.
router.delete('/companies/:id', async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: id(req) } });
  if (!company) throw notFound('Company');
  if (company.userId) await prisma.user.delete({ where: { id: company.userId } });
  else await prisma.company.delete({ where: { id: company.id } });
  res.status(204).end();
});

// ---------- Opportunities ----------

router.get('/opportunities', async (_req, res) => {
  const opportunities = await prisma.opportunity.findMany({
    include: { company: { select: { id: true, name: true } }, _count: { select: { applications: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(opportunities);
});

router.post('/opportunities', validate(opportunitySchema.extend({ companyId: z.int().positive() })), async (req, res) => {
  res.status(201).json(await prisma.opportunity.create({ data: req.body }));
});

router.patch('/opportunities/:id', validate(opportunitySchema.extend({ isOpen: z.boolean() }).partial()), async (req, res) => {
  res.json(await prisma.opportunity.update({ where: { id: id(req) }, data: req.body }));
});

router.delete('/opportunities/:id', async (req, res) => {
  await prisma.opportunity.delete({ where: { id: id(req) } });
  res.status(204).end();
});

// ---------- Applications ----------

router.get('/applications', async (_req, res) => {
  const applications = await prisma.application.findMany({
    include: {
      student: { select: { user: { select: { id: true, name: true } } } },
      opportunity: { select: { title: true, company: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(applications);
});

// ---------- Placements ----------

const placementSchema = z.object({
  studentId: z.int().positive(),
  companyId: z.int().positive(),
  title: z.string().trim().min(2).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  supervisorId: z.int().positive().nullable().optional(),
});

const checkDates = (startDate, endDate) => {
  if (startDate && endDate && endDate <= startDate) throw new HttpError(400, 'End date must be after the start date');
};

const checkSupervisor = async (supervisorId) => {
  if (!supervisorId) return;
  assertSupervisorRoleEnabled();
  const supervisor = await prisma.user.findUnique({ where: { id: supervisorId } });
  if (supervisor?.role !== 'SUPERVISOR') throw new HttpError(400, 'User is not a supervisor');
};

// Records a placement for a student who was accepted outside the platform.
router.post('/placements', validate(placementSchema), async (req, res) => {
  const { studentId, startDate, endDate, supervisorId } = req.body;
  checkDates(startDate, endDate);
  await checkSupervisor(supervisorId);
  const active = await prisma.placement.findFirst({ where: { studentId, status: 'ACTIVE' } });
  if (active) throw new HttpError(409, 'Student already has an active placement');
  res.status(201).json(await prisma.placement.create({ data: req.body, include: placementSummary }));
});

router.patch('/placements/:id', validate(placementSchema.omit({ studentId: true }).extend({ status: z.enum(['ACTIVE', 'COMPLETED']) }).partial()), async (req, res) => {
  const existing = await prisma.placement.findUnique({ where: { id: id(req) } });
  if (!existing) throw notFound('Placement');
  checkDates(req.body.startDate ?? existing.startDate, req.body.endDate ?? existing.endDate);
  await checkSupervisor(req.body.supervisorId);
  res.json(await prisma.placement.update({ where: { id: existing.id }, data: req.body, include: placementSummary }));
});

router.delete('/placements/:id', async (req, res) => {
  await prisma.placement.delete({ where: { id: id(req) } });
  res.status(204).end();
});

// ---------- Stats ----------

router.get('/stats', async (_req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, newUsers, suspended, companies, pendingCompanies, openOpportunities, applications, activePlacements, pendingReports, plans, openTickets] =
    await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.company.count({ where: { verified: true } }),
      prisma.company.count({ where: { reviewStatus: { in: OPEN_REQUESTS } } }),
      prisma.opportunity.count({ where: { isOpen: true } }),
      prisma.application.groupBy({ by: ['status'], _count: true }),
      prisma.placement.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count({ where: { status: 'SUBMITTED' } }),
      prisma.trainingPlan.count({ where: { isActive: true } }),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
    ]);
  const byRole = Object.fromEntries(users.map((u) => [u.role, u._count]));
  res.json({
    students: byRole.STUDENT ?? 0,
    users: byRole,
    newUsers,
    suspended,
    companies,
    pendingCompanies,
    openOpportunities,
    applications: Object.fromEntries(applications.map((a) => [a.status, a._count])),
    activePlacements,
    pendingReports,
    activePlans: plans,
    openTickets,
  });
});

export default router;
