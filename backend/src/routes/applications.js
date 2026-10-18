import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound, forbidden } from '../lib/errors.js';
import { currentCompany, currentStudent } from '../lib/actors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const applySchema = z.object({
  opportunityId: z.int().positive(),
  coverLetter: z.string().trim().max(2000).optional(),
});

const decisionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ACCEPTED'), startDate: z.coerce.date() }),
  z.object({ status: z.literal('REJECTED') }),
]);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

router.post('/', requireRole('STUDENT'), validate(applySchema), async (req, res) => {
  const student = await currentStudent(req.user.id);
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: req.body.opportunityId },
    include: { company: true },
  });
  if (!opportunity || !opportunity.company.verified) throw notFound('Opportunity');
  if (!opportunity.isOpen || opportunity.deadline < new Date()) {
    throw new HttpError(409, 'Opportunity is closed');
  }
  const active = await prisma.placement.findFirst({ where: { studentId: student.id, status: 'ACTIVE' } });
  if (active) throw new HttpError(409, 'Student already has an active placement');

  const application = await prisma.application.create({
    data: { studentId: student.id, opportunityId: opportunity.id, coverLetter: req.body.coverLetter },
  });
  res.status(201).json(application);
});

router.get('/mine', requireRole('STUDENT'), async (req, res) => {
  const student = await currentStudent(req.user.id);
  const applications = await prisma.application.findMany({
    where: { studentId: student.id },
    include: { opportunity: { include: { company: { select: { name: true, city: true } } } }, placement: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(applications);
});

router.patch('/:id/withdraw', requireRole('STUDENT'), async (req, res) => {
  const student = await currentStudent(req.user.id);
  const application = await prisma.application.findUnique({ where: { id: Number(req.params.id) } });
  if (!application) throw notFound('Application');
  if (application.studentId !== student.id) throw forbidden();
  if (application.status !== 'PENDING') throw new HttpError(409, 'Only pending applications can be withdrawn');
  res.json(await prisma.application.update({ where: { id: application.id }, data: { status: 'WITHDRAWN' } }));
});

router.patch('/:id/decision', requireRole('COMPANY'), validate(decisionSchema), async (req, res) => {
  const company = await currentCompany(req.user.id);
  const application = await prisma.application.findUnique({
    where: { id: Number(req.params.id) },
    include: { opportunity: true },
  });
  if (!application) throw notFound('Application');
  if (application.opportunity.companyId !== company.id) throw forbidden();
  if (application.status !== 'PENDING') throw new HttpError(409, 'Application has already been decided');

  if (req.body.status === 'REJECTED') {
    const rejected = await prisma.application.update({
      where: { id: application.id },
      data: { status: 'REJECTED', decidedAt: new Date() },
    });
    return res.json(rejected);
  }

  const { opportunity } = application;
  const result = await prisma.$transaction(async (tx) => {
    const filled = await tx.application.count({
      where: { opportunityId: opportunity.id, status: 'ACCEPTED' },
    });
    if (filled >= opportunity.seats) throw new HttpError(409, 'All seats are filled');
    const active = await tx.placement.findFirst({
      where: { studentId: application.studentId, status: 'ACTIVE' },
    });
    if (active) throw new HttpError(409, 'Student already has an active placement');

    const accepted = await tx.application.update({
      where: { id: application.id },
      data: { status: 'ACCEPTED', decidedAt: new Date() },
    });
    const startDate = req.body.startDate;
    const placement = await tx.placement.create({
      data: {
        applicationId: application.id,
        studentId: application.studentId,
        companyId: company.id,
        startDate,
        endDate: new Date(startDate.getTime() + opportunity.durationWeeks * WEEK_MS),
      },
    });
    // The student is placed: their other pending applications are no longer relevant.
    await tx.application.updateMany({
      where: { studentId: application.studentId, status: 'PENDING' },
      data: { status: 'WITHDRAWN' },
    });
    return { ...accepted, placement };
  });
  res.json(result);
});

export default router;
