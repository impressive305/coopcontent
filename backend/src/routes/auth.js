import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { BCRYPT_ROUNDS, signToken } from '../lib/auth.js';
import { clearSession, setSession } from '../lib/session.js';
import { checkPassword, passwordField } from '../lib/password.js';
import { HttpError } from '../lib/errors.js';
import { authenticate } from '../middleware/auth.js';
import { supervisorRoleEnabled } from '../lib/features.js';
import { DEGREES } from '../lib/degrees.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const account = {
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: passwordField,
};

const studentSchema = z.object({
  ...account,
  universityId: z.string().trim().min(3),
  university: z.string().trim().min(2),
  major: z.string().trim().min(2),
  degree: z.enum(DEGREES),
  gpa: z.number().min(0).max(5).optional(),
  gpaScale: z.union([z.literal(4), z.literal(5)]).optional(),
  skills: z.array(z.string().trim().min(1)).max(30).default([]),
}).superRefine(checkPassword).refine((s) => s.gpa === undefined || (s.gpaScale && s.gpa <= s.gpaScale), {
  message: 'GPA must not exceed the selected scale',
  path: ['gpa'],
});

// A company signs up with contact and organization basics only. The training
// unit reviews the request, contacts the company outside the platform and
// completes the rest (commercial registration, website...) before approving it.
const companySchema = z.strictObject({
  ...account,
  name: account.name.max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  companyName: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  sector: z.string().trim().min(2).max(100),
}).superRefine(checkPassword);

// Login checks only that something was typed: older passwords predate the policy.
const loginSchema = z.object({ email: account.email, password: z.string().min(1).max(200) });

const publicUser = ({ passwordHash, ...user }) => user;

// Starts the session in the httpOnly cookie; the token is never in the body.
const startSession = (res, user, status = 200) => {
  setSession(res, signToken(user));
  res.status(status).json({ user: publicUser(user) });
};

router.post('/register/student', validate(studentSchema), async (req, res) => {
  const { name, email, password, ...profile } = req.body;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: 'STUDENT',
      student: { create: profile },
    },
  });
  startSession(res, user, 201);
});

router.post('/register/company', validate(companySchema), async (req, res) => {
  const { name, email, password, companyName, ...company } = req.body;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: 'COMPANY',
      company: { create: { name: companyName, ...company } },
    },
  });
  startSession(res, user, 201);
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new HttpError(403, 'This account is suspended');
  if (user.role === 'SUPERVISOR' && !supervisorRoleEnabled()) throw new HttpError(403, 'The supervisor role is currently disabled');
  startSession(res, user);
});

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.status(204).end();
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { student: true, company: true },
  });
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json(publicUser(user));
});

export default router;
