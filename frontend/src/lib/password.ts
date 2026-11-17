// Client-side hints for the password policy. The API enforces the full policy
// (backend/src/lib/password.js), including common passwords and the user's name.
export const PASSWORD_MIN_LENGTH = 10;

export const passwordChecks = (value: string) => [
  { ok: [...value].length >= PASSWORD_MIN_LENGTH, label: `${PASSWORD_MIN_LENGTH} أحرف على الأقل` },
  { ok: /\p{L}/u.test(value) && /\p{N}/u.test(value), label: "أحرف وأرقام معاً" },
];

export const PASSWORD_HINT = "10 أحرف على الأقل، تجمع أحرفاً وأرقاماً، وليست كلمة شائعة ولا تحتوي اسمك أو بريدك.";
