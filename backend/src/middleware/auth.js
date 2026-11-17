import { verifyToken } from '../lib/auth.js';
import { HttpError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { supervisorRoleEnabled } from '../lib/features.js';
import { readSession } from '../lib/session.js';

// Checks the token, then the account itself, so suspensions and role changes
// by the admin take effect immediately rather than when the token expires.
export const authenticate = async (req, _res, next) => {
  const token = readSession(req);
  if (!token) return next(new HttpError(401, 'Authentication required'));
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) }, select: { id: true, role: true, isActive: true } });
  if (!user) return next(new HttpError(401, 'Account no longer exists'));
  if (!user.isActive) return next(new HttpError(403, 'This account is suspended'));
  if (user.role === 'SUPERVISOR' && !supervisorRoleEnabled()) return next(new HttpError(403, 'The supervisor role is currently disabled'));
  req.user = { id: user.id, role: user.role };
  next();
};

// Role-based access control: allow only the listed roles.
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Forbidden'));
  next();
};
