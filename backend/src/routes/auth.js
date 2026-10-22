import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { HttpError } from '../lib/errors.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const account = {
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8),
};

const studentSchema = z.object({
  ...account,
  universityId: z.string().trim().min(3),
  university: z.string().trim().min(2),
  major: z.string().trim().min(2),
  gpa: z.number().min(0).max(5).optional(),
  gpaScale: z.union([z.literal(4), z.literal(5)]).optional(),
  skills: z.array(z.string().trim().min(1)).max(30).default([]),
}).refine((s) => s.gpa === undefined || (s.gpaScale && s.gpa <= s.gpaScale), {
  message: 'GPA must not exceed the selected scale',
  path: ['gpa'],
});

const companySchema = z.object({
  ...account,
  companyName: z.string().trim().min(2),
  crNumber: z.string().trim().regex(/^\d{10}$/, 'Commercial registration must be 10 digits'),
  city: z.string().trim().min(2),
  sector: z.string().trim().min(2),
});

const loginSchema = z.object({ email: account.email, password: z.string().min(1) });

const publicUser = ({ passwordHash, ...user }) => user;

const authResponse = (user) => ({ token: signToken(user), user: publicUser(user) });

router.post('/register/student', validate(studentSchema), async (req, res) => {
  const { name, email, password, ...profile } = req.body;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'STUDENT',
      student: { create: profile },
    },
  });
  res.status(201).json(authResponse(user));
});

router.post('/register/company', validate(companySchema), async (req, res) => {
  const { name, email, password, companyName, ...company } = req.body;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'COMPANY',
      company: { create: { name: companyName, ...company } },
    },
  });
  res.status(201).json(authResponse(user));
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  res.json(authResponse(user));
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
