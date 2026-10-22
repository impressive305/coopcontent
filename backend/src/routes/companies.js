import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { currentCompany } from '../lib/actors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const optional = (schema) => schema.nullable().optional();

// The directory profile students see; edited by the company or the admin.
export const companyProfileSchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  sector: z.string().trim().min(2).max(100),
  description: optional(z.string().trim().max(3000)),
  website: optional(z.url({ protocol: /^https?$/ })),
  contactEmail: optional(z.string().trim().toLowerCase().pipe(z.email())),
  phone: optional(z.string().trim().max(30)),
  address: optional(z.string().trim().max(300)),
  majors: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  coopOpen: z.boolean().default(true),
});

const openOpportunity = () => ({ isOpen: true, deadline: { gte: new Date() } });

// Students apply to the contact email, falling back to the company account's email.
const forDirectory = ({ user, crNumber, userId, ...company }) => ({
  ...company,
  email: company.contactEmail ?? user?.email ?? null,
});

const directoryInclude = { user: { select: { email: true } } };

router.get('/', async (_req, res) => {
  const companies = await prisma.company.findMany({
    where: { verified: true, coopOpen: true },
    include: { ...directoryInclude, _count: { select: { opportunities: { where: openOpportunity() } } } },
    orderBy: { name: 'asc' },
  });
  res.json(companies.map(forDirectory));
});

router.get('/me', requireRole('COMPANY'), async (req, res) => {
  res.json(await currentCompany(req.user.id));
});

router.patch('/me', requireRole('COMPANY'), validate(companyProfileSchema.partial()), async (req, res) => {
  const company = await currentCompany(req.user.id);
  res.json(await prisma.company.update({ where: { id: company.id }, data: req.body }));
});

router.get('/:id', async (req, res) => {
  const company = await prisma.company.findFirst({
    where: { id: Number(req.params.id), verified: true },
    include: { ...directoryInclude, opportunities: { where: openOpportunity(), orderBy: { deadline: 'asc' } } },
  });
  if (!company) throw notFound('Company');
  res.json(forDirectory(company));
});

export default router;
