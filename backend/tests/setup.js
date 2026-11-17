import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export const app = createApp();
export const ORIGIN = 'http://localhost:3000';

// Requests as the frontend sends them: from its origin (the CSRF guard rejects others).
export const api = () => new Proxy(request(app), { get: (target, method) => (...args) => target[method](...args).set('Origin', ORIGIN) });
// Requests with no Origin header, for testing the guard itself.
export const rawApi = () => request(app);

// The session token from a login/register response's httpOnly cookie.
export const sessionOf = (res) => {
  const cookie = [res.headers['set-cookie'] ?? []].flat().find((c) => c.startsWith('coopconnect_session='));
  return cookie?.split(';')[0].slice('coopconnect_session='.length);
};

export const resetDb = () =>
  prisma.$executeRawUnsafe(
    'TRUNCATE training_plans, reports, placements, applications, opportunities, companies, students, users RESTART IDENTITY CASCADE',
  );

export const createStaff = async (role, email) => {
  await prisma.user.create({
    data: { name: role, email, role, passwordHash: await bcrypt.hash('Password123', 4) },
  });
  const res = await api().post('/api/auth/login').send({ email, password: 'Password123' });
  return sessionOf(res);
};

export const auth = (token) => ({ Cookie: `coopconnect_session=${token}` });
export { prisma };
