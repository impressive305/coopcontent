import { z } from 'zod';

// Password policy for every new or changed password (sign-up, admin-created
// accounts, admin resets). Existing passwords keep working at login.
export const MIN_LENGTH = 10;
// bcrypt ignores everything past 72 bytes, so a longer password would be
// silently truncated; Arabic letters take 2 bytes each in UTF-8.
const MAX_BYTES = 72;

// Common choices that guessing lists try first (compared case-insensitively).
const COMMON = new Set([
  'password123', 'password1234', 'passw0rd123', 'p@ssw0rd123', 'p@ssword123', 'newpassword1', 'mypassword1',
  '1234567890', '12345678910', '0123456789', '1234512345', '1122334455', '1qaz2wsx3edc', '1q2w3e4r5t', '1q2w3e4r5t6y',
  'qwerty1234', 'qwerty12345', 'qwertyuiop1', 'qwertyuiop', 'asdfghjkl1', 'zxcvbnm123', 'abc1234567', 'abcd123456',
  'admin12345', 'admin123456', 'welcome123', 'welcome1234', 'iloveyou12', 'iloveyou123', 'letmein123', 'changeme123',
  'football123', 'sunshine123', 'princess123', 'monkey12345', 'dragon12345', 'master12345', 'superman123',
  'saudi12345', 'saudia1234', 'ksa1234567', 'riyadh1234', 'jeddah1234', 'student123', 'student1234', 'coopconnect1',
]);

// Problems with a password, as messages the frontend translates; empty = acceptable.
export const passwordProblems = (password, { name = '', email = '' } = {}) => {
  const problems = [];
  const lower = password.toLowerCase();
  if ([...password].length < MIN_LENGTH) problems.push(`Password must be at least ${MIN_LENGTH} characters`);
  if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) problems.push('Password is too long');
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) problems.push('Password must include letters and numbers');
  if (COMMON.has(lower) || /^(.)\1+$/u.test(password)) problems.push('Password is too common');
  const personal = [email.split('@')[0], ...name.split(/\s+/)].map((p) => p.trim().toLowerCase()).filter((p) => p.length >= 4);
  if (personal.some((p) => lower.includes(p))) problems.push('Password must not contain your name or email');
  return problems;
};

// For object schemas that carry `password` with `name` and `email` beside it.
export const checkPassword = (value, ctx) => {
  if (value.password === undefined) return;
  for (const message of passwordProblems(value.password, value)) ctx.addIssue({ code: 'custom', path: ['password'], message });
};

export const passwordField = z.string().max(200);
