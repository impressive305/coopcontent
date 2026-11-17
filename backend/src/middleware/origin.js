import { HttpError } from '../lib/errors.js';

export const allowedOrigins = () => (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim()).filter(Boolean);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const refererOrigin = (referer) => {
  try {
    return referer ? new URL(referer).origin : null;
  } catch {
    return null;
  }
};

// CSRF guard: the browser sends the session cookie with any request to the API,
// so a request that changes data must come from our own frontend's origin.
export const requireTrustedOrigin = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin ?? refererOrigin(req.headers.referer);
  if (origin && allowedOrigins().includes(origin)) return next();
  next(new HttpError(403, 'Request origin not allowed'));
};
