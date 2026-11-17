import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound, forbidden } from '../lib/errors.js';
import { currentCompany } from '../lib/actors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

export const opportunitySchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(10),
  major: z.string().trim().min(2),
  city: z.string().trim().min(2),
  seats: z.int().min(1).max(500),
  durationWeeks: z.int().min(4).max(52),
  deadline: z.coerce.date(),
});

const listQuery = z.object({
  q: z.string().trim().optional(),
  major: z.string().trim().optional(),
  city: z.string().trim().optional(),
});

const companySummary = { select: { id: true, name: true, city: true, sector: true } };

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { q, major, city } = req.validQuery;
  const opportunities = await prisma.opportunity.findMany({
    where: {
      isOpen: true,
      deadline: { gte: new Date() },
      company: { verified: true },
      major: major ? { equals: major, mode: 'insensitive' } : undefined,
      city: city ? { equals: city, mode: 'insensitive' } : undefined,
      OR: q
        ? [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        : undefined,
    },
    include: { company: companySummary },
    orderBy: { deadline: 'asc' },
  });
  res.json(opportunities);
});

router.get('/mine', requireRole('COMPANY'), async (req, res) => {
  const company = await currentCompany(req.user.id);
  const opportunities = await prisma.opportunity.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(opportunities);
});

router.get('/:id', async (req, res) => {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: Number(req.params.id) },
    include: { company: companySummary },
  });
  if (!opportunity) throw notFound('Opportunity');
  res.json(opportunity);
});

router.post('/', requireRole('COMPANY'), validate(opportunitySchema), async (req, res) => {
  const company = await currentCompany(req.user.id);
  if (!company.verified) throw new HttpError(403, 'Company must be verified by an admin first');
  const opportunity = await prisma.opportunity.create({ data: { ...req.body, companyId: company.id } });
  res.status(201).json(opportunity);
});

router.patch(
  '/:id',
  requireRole('COMPANY'),
  validate(opportunitySchema.extend({ isOpen: z.boolean() }).partial()),
  async (req, res) => {
    const company = await currentCompany(req.user.id);
    const existing = await prisma.opportunity.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw notFound('Opportunity');
    if (existing.companyId !== company.id) throw forbidden();
    const opportunity = await prisma.opportunity.update({ where: { id: existing.id }, data: req.body });
    res.json(opportunity);
  },
);

router.get('/:id/applications', requireRole('COMPANY'), async (req, res) => {
  const company = await currentCompany(req.user.id);
  const opportunity = await prisma.opportunity.findUnique({ where: { id: Number(req.params.id) } });
  if (!opportunity) throw notFound('Opportunity');
  if (opportunity.companyId !== company.id) throw forbidden();
  const applications = await prisma.application.findMany({
    where: { opportunityId: opportunity.id },
    include: { student: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(applications);
});

export default router;
