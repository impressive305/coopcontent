import jwt from 'jsonwebtoken';

// The session token lives only in an httpOnly cookie: page scripts (and so any
// injected script) cannot read it. It is sent only to /api routes.
export const SESSION_COOKIE = 'coopconnect_session';

const cookieOptions = () => {
  const sameSite = process.env.COOKIE_SAMESITE || 'lax';
  const secure = sameSite === 'none' || (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production');
  return { httpOnly: true, secure, sameSite, path: '/api' };
};

export const setSession = (res, token) => {
  const { exp } = jwt.decode(token);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: exp * 1000 - Date.now() });
};

export const clearSession = (res) => res.clearCookie(SESSION_COOKIE, cookieOptions());

export const readSession = (req) => {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
};
