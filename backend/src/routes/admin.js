import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

const supervisorSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8),
});

router.post('/supervisors', validate(supervisorSchema), async (req, res) => {
  const { name, email, password } = req.body;
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: 'SUPERVISOR' },
    select: { id: true, name: true, email: true, role: true },
  });
  res.status(201).json(user);
});

router.get('/supervisors', async (_req, res) => {
  const supervisors = await prisma.user.findMany({
    where: { role: 'SUPERVISOR' },
    select: { id: true, name: true, email: true, _count: { select: { supervisedUnits: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(supervisors);
});

router.get('/companies', async (req, res) => {
  const verified = req.query.verified === undefined ? undefined : req.query.verified === 'true';
  const companies = await prisma.company.findMany({
    where: { verified },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { id: 'desc' },
  });
  res.json(companies);
});

router.patch('/companies/:id/verify', async (req, res) => {
  const company = await prisma.company.update({
    where: { id: Number(req.params.id) },
    data: { verified: true },
  });
  res.json(company);
});

router.get('/stats', async (_req, res) => {
  const [students, companies, openOpportunities, applications, activePlacements, pendingReports] =
    await Promise.all([
      prisma.student.count(),
      prisma.company.count({ where: { verified: true } }),
      prisma.opportunity.count({ where: { isOpen: true } }),
      prisma.application.groupBy({ by: ['status'], _count: true }),
      prisma.placement.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count({ where: { status: 'SUBMITTED' } }),
    ]);
  res.json({
    students,
    companies,
    openOpportunities,
    applications: Object.fromEntries(applications.map((a) => [a.status, a._count])),
    activePlacements,
    pendingReports,
  });
});

export default router;
