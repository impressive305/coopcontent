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
  student?: { major: string; university: string; universityId: string; gpa: string | null; gpaScale: number | null; skills: string[] } | null;
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

export type CompanyProfile = {
  id: number;
  name: string;
  city: string;
  sector: string;
  verified: boolean;
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  majors: string[];
  coopOpen: boolean;
};

// A company as students see it in the directory; `email` is where they apply.
export type DirectoryCompany = Omit<CompanyProfile, "verified"> & {
  email: string | null;
  _count?: { opportunities: number };
  opportunities?: Opportunity[];
};

export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export type Application = {
  id: number;
  status: ApplicationStatus;
  coverLetter?: string | null;
  createdAt: string;
  opportunity?: Opportunity;
  student?: { major: string; university: string; gpa?: string | null; gpaScale?: number | null; skills: string[]; user: { name: string; email: string } };
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

export type TaskKind = "field" | "learning";
// Plans created before task kinds existed have no kind; treat those tasks as field work.
export type PlanTask = { id: string; title: string; done: boolean; kind?: TaskKind };
export type PlanWeek = {
  weekNo: number;
  phase: string;
  theme: string;
  objectives: string[];
  tasks: PlanTask[];
  deliverable: string;
  skills: string[];
};
export type PlanContent = {
  title: string;
  summary: string;
  goals: string[];
  skills: { name: string; category: "technical" | "professional" }[];
  phases: { key: string; name: string; startWeek: number; endWeek: number }[];
  weeks: PlanWeek[];
  milestones: { weekNo: number; title: string }[];
  evaluation: { criterion: string; weight: number }[];
};
export type TrainingPlan = {
  id: number;
  majorKey: string | null;
  trackKey: string | null;
  durationWeeks: number;
  hoursPerWeek: number;
  startDate: string | null;
  source: "ENGINE" | "AI" | "MANUAL";
  model: string | null;
  content: PlanContent;
  isActive: boolean;
  createdAt: string;
  notice?: string | null;
};
export type PlanSummary = Pick<TrainingPlan, "id" | "majorKey" | "trackKey" | "durationWeeks" | "source" | "isActive" | "createdAt">;
export type PlanCatalog = {
  aiAvailable: boolean;
  suggestedMajor: string | null;
  placement: { company: string; opportunity: string; startDate: string; durationWeeks: number } | null;
  majors: { key: string; name: string; nameEn: string; tracks: { key: string; name: string; tools: string[]; project: string }[] }[];
};

// Plan progress helpers shared by the overview and plan pages.
export const planProgress = (plan: PlanContent) => {
  const tasks = plan.weeks.flatMap((w) => w.tasks);
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
};

// The calendar week if the plan has a start date, else the first week with open tasks.
export const currentWeekNo = (plan: TrainingPlan) => {
  const weeks = plan.content.weeks;
  if (plan.startDate) {
    const elapsed = Math.floor((Date.now() - Date.parse(plan.startDate)) / (7 * 864e5)) + 1;
    return Math.min(Math.max(elapsed, 1), weeks.length);
  }
  return weeks.find((w) => w.tasks.some((t) => !t.done))?.weekNo ?? weeks.length;
};

export const TASK_KINDS: Record<TaskKind, string> = { field: "تدريب ميداني", learning: "تعلّم ذاتي" };

export const tasksByKind = (plan: PlanContent) => {
  const counts: Record<TaskKind, number> = { field: 0, learning: 0 };
  for (const t of plan.weeks.flatMap((w) => w.tasks)) counts[t.kind ?? "field"] += 1;
  return counts;
};
