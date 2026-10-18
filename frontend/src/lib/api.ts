const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "coopconnect.token";

export type Role = "STUDENT" | "SUPERVISOR" | "COMPANY" | "ADMIN";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage unavailable (private mode): the session lasts until reload.
    }
  },
};

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const details = data?.details;
    const first = Array.isArray(details) && details[0]?.message ? `: ${details[0].message}` : "";
    throw new ApiError(res.status, `${data?.error ?? "Request failed"}${first}`, details);
  }
  return data as T;
}

// Shapes returned by the API (only the fields the UI uses).
export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  student?: { major: string; university: string; universityId: string } | null;
  company?: { id: number; name: string; verified: boolean } | null;
};

export type Opportunity = {
  id: number;
  title: string;
  description: string;
  major: string;
  city: string;
  seats: number;
  durationWeeks: number;
  deadline: string;
  isOpen: boolean;
  company?: { name: string; city: string; sector: string };
  _count?: { applications: number };
};

export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export type Application = {
  id: number;
  status: ApplicationStatus;
  coverLetter?: string | null;
  createdAt: string;
  opportunity?: Opportunity;
  student?: { major: string; university: string; gpa?: string | null; skills: string[]; user: { name: string; email: string } };
};

export type Placement = {
  id: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "COMPLETED";
  student: { major: string; university: string; user: { name: string; email: string } };
  company: { name: string; city: string };
  supervisor: { id: number; name: string } | null;
  application: { opportunity: { title: string } };
  _count: { reports: number };
};

export type Report = {
  id: number;
  type: "WEEKLY" | "FINAL";
  weekNo: number | null;
  tasks: string;
  hours: number;
  skills: string;
  challenges?: string | null;
  status: "SUBMITTED" | "APPROVED" | "RETURNED";
  feedback?: string | null;
  submittedAt: string;
};
