import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export const app = createApp();
export const api = () => request(app);

export const resetDb = () =>
  prisma.$executeRawUnsafe(
    'TRUNCATE reports, placements, applications, opportunities, companies, students, users RESTART IDENTITY CASCADE',
  );

export const createStaff = async (role, email) => {
  await prisma.user.create({
    data: { name: role, email, role, passwordHash: await bcrypt.hash('Password123', 4) },
  });
  const res = await api().post('/api/auth/login').send({ email, password: 'Password123' });
  return res.body.token;
};

export const auth = (token) => ({ Authorization: `Bearer ${token}` });
export { prisma };
