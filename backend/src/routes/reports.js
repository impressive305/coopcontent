import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound, forbidden } from '../lib/errors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loadPlacementFor } from './placements.js';
import { supervisorRoleEnabled } from '../lib/features.js';

const router = Router();
router.use(authenticate);

const contentSchema = z.object({
  tasks: z.string().trim().min(10),
  hours: z.int().min(0).max(80),
  skills: z.string().trim().min(3),
  challenges: z.string().trim().optional(),
});

const submitSchema = z.discriminatedUnion('type', [
  contentSchema.extend({ type: z.literal('WEEKLY'), weekNo: z.int().min(1).max(52) }),
  contentSchema.extend({ type: z.literal('FINAL') }),
]);

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'RETURNED']),
  feedback: z.string().trim().max(2000).optional(),
}).refine((r) => r.status === 'APPROVED' || r.feedback, {
  message: 'Feedback is required when returning a report',
  path: ['feedback'],
});

router.get('/placements/:id/reports', async (req, res) => {
  const placement = await loadPlacementFor(req.user, Number(req.params.id));
  const reports = await prisma.report.findMany({
    where: { placementId: placement.id },
    orderBy: [{ type: 'asc' }, { weekNo: 'asc' }],
  });
  res.json(reports);
});

router.post('/placements/:id/reports', requireRole('STUDENT'), validate(submitSchema), async (req, res) => {
  const placement = await loadPlacementFor(req.user, Number(req.params.id));
  if (placement.status !== 'ACTIVE') throw new HttpError(409, 'Placement is not active');
  const { type } = req.body;
  if (type === 'FINAL') {
    const existing = await prisma.report.findFirst({ where: { placementId: placement.id, type: 'FINAL' } });
    if (existing) throw new HttpError(409, 'Final report already submitted');
  }
  const report = await prisma.report.create({
    data: { ...req.body, weekNo: type === 'WEEKLY' ? req.body.weekNo : null, placementId: placement.id },
  });
  res.status(201).json(report);
});

// A student revises a report that was returned for changes.
router.put('/reports/:id', requireRole('STUDENT'), validate(contentSchema), async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: Number(req.params.id) } });
  if (!report) throw notFound('Report');
  await loadPlacementFor(req.user, report.placementId);
  if (report.status !== 'RETURNED') throw new HttpError(409, 'Only returned reports can be revised');
  const updated = await prisma.report.update({
    where: { id: report.id },
    data: { ...req.body, status: 'SUBMITTED', submittedAt: new Date(), reviewedAt: null },
  });
  res.json(updated);
});

// The admin reviews any report; a supervisor (when the role is enabled) only their students'.
router.patch('/reports/:id/review', requireRole('SUPERVISOR', 'ADMIN'), validate(reviewSchema), async (req, res) => {
  const report = await prisma.report.findUnique({
    where: { id: Number(req.params.id) },
    include: { placement: true },
  });
  if (!report) throw notFound('Report');
  if (req.user.role === 'SUPERVISOR' && (!supervisorRoleEnabled() || report.placement.supervisorId !== req.user.id)) throw forbidden();
  if (report.status !== 'SUBMITTED') throw new HttpError(409, 'Report is not awaiting review');
  const updated = await prisma.report.update({
    where: { id: report.id },
    data: { status: req.body.status, feedback: req.body.feedback, reviewedAt: new Date() },
  });
  res.json(updated);
});

export default router;
