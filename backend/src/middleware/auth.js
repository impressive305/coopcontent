import { verifyToken } from '../lib/auth.js';
import { HttpError } from '../lib/errors.js';

export const authenticate = (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Authentication required'));
  try {
    const payload = verifyToken(token);
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};

// Role-based access control: allow only the listed roles.
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Forbidden'));
  next();
};
