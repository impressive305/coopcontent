// Mirrors the API's SUPERVISOR_ROLE_ENABLED switch (backend/src/lib/features.js).
// The API enforces it; this only hides the role's screens while it is paused.
export const SUPERVISOR_ROLE_ENABLED = process.env.NEXT_PUBLIC_SUPERVISOR_ROLE_ENABLED === "true";
