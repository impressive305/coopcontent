import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound, forbidden } from '../lib/errors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const placementInclude = {
  student: { include: { user: { select: { name: true, email: true } } } },
  company: { select: { id: true, name: true, city: true } },
  supervisor: { select: { id: true, name: true, email: true } },
  application: { select: { opportunity: { select: { id: true, title: true } } } },
  _count: { select: { reports: true } },
};

// Which placements each role may see.
const scopeFor = async ({ id, role }) => {
  switch (role) {
    case 'ADMIN':
      return {};
    case 'SUPERVISOR':
      return { supervisorId: id };
    case 'STUDENT':
      return { student: { userId: id } };
    case 'COMPANY':
      return { company: { userId: id } };
    default:
      throw forbidden();
  }
};

// Loads a placement only if the user is a participant (or admin).
export const loadPlacementFor = async (user, placementId) => {
  const placement = await prisma.placement.findFirst({
    where: { id: placementId, ...(await scopeFor(user)) },
    include: placementInclude,
  });
  if (!placement) throw notFound('Placement');
  return placement;
};

router.get('/', async (req, res) => {
  const placements = await prisma.placement.findMany({
    where: await scopeFor(req.user),
    include: placementInclude,
    orderBy: { startDate: 'desc' },
  });
  res.json(placements);
});

router.get('/:id', async (req, res) => {
  res.json(await loadPlacementFor(req.user, Number(req.params.id)));
});

router.patch(
  '/:id/supervisor',
  requireRole('ADMIN'),
  validate(z.object({ supervisorId: z.int().positive() })),
  async (req, res) => {
    const supervisor = await prisma.user.findUnique({ where: { id: req.body.supervisorId } });
    if (!supervisor || supervisor.role !== 'SUPERVISOR') throw new HttpError(400, 'User is not a supervisor');
    const placement = await prisma.placement.update({
      where: { id: Number(req.params.id) },
      data: { supervisorId: supervisor.id },
      include: placementInclude,
    });
    res.json(placement);
  },
);

router.patch('/:id/complete', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
  const placement = await loadPlacementFor(req.user, Number(req.params.id));
  if (placement.status === 'COMPLETED') throw new HttpError(409, 'Placement already completed');
  const finalApproved = await prisma.report.count({
    where: { placementId: placement.id, type: 'FINAL', status: 'APPROVED' },
  });
  if (!finalApproved) throw new HttpError(409, 'An approved final report is required');
  const updated = await prisma.placement.update({
    where: { id: placement.id },
    data: { status: 'COMPLETED' },
    include: placementInclude,
  });
  res.json(updated);
});

export default router;
