import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { currentStudent } from '../lib/actors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { DEGREES } from '../lib/degrees.js';

const router = Router();
router.use(authenticate, requireRole('STUDENT'));

const profileSchema = z.object({
  name: z.string().trim().min(2),
  university: z.string().trim().min(2),
  major: z.string().trim().min(2),
  // Can be changed but not cleared once set.
  degree: z.enum(DEGREES),
  gpa: z.number().min(0).max(5).nullable(),
  gpaScale: z.union([z.literal(4), z.literal(5)]).nullable(),
  skills: z.array(z.string().trim().min(1)).max(30),
}).partial().refine((s) => s.gpa == null || s.gpa <= (s.gpaScale ?? 5), {
  message: 'GPA must not exceed the selected scale',
  path: ['gpa'],
});

router.patch('/me', validate(profileSchema), async (req, res) => {
  await currentStudent(req.user.id);
  const { name, ...profile } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name, student: { update: profile } },
    include: { student: true },
  });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

export default router;
