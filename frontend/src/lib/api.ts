export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export type Role = "STUDENT" | "SUPERVISOR" | "COMPANY" | "ADMIN";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

// Sessions live in an httpOnly cookie set by the API; this code never sees the token.
// Earlier versions kept it in localStorage: remove any copy left in this browser.
export const clearLegacyToken = () => {
  try {
    localStorage.removeItem("coopconnect.token");
  } catch {
    // Storage unavailable: nothing to clear.
  }
};

// Arabic wording for the API's common errors; anything else is shown as sent.
const ERROR_MESSAGES: Record<string, string> = {
  "Invalid email or password": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "This account is suspended": "هذا الحساب موقوف. تواصل مع وحدة التدريب.",
  "The supervisor role is currently disabled": "دور المشرف الأكاديمي معطّل حالياً.",
  "Duplicate value": "هذه البيانات مسجّلة مسبقاً، مثل البريد الإلكتروني أو الرقم الجامعي.",
  "Validation failed": "تحقّق من البيانات المدخلة.",
  "Authentication required": "سجّل الدخول للمتابعة.",
  "Invalid or expired token": "انتهت الجلسة، سجّل الدخول مجدداً.",
  "Forbidden": "ليست لديك صلاحية لهذا الإجراء.",
  "Internal server error": "حدث خطأ في الخادم، حاول لاحقاً.",
  "Logo must be a PNG, JPEG or WebP image": "الشعار يجب أن يكون صورة PNG أو JPEG أو WebP.",
  "Logo must be 300 KB or smaller": "حجم الشعار يجب ألا يتجاوز 300 كيلوبايت.",
  "Request origin not allowed": "رُفض الطلب لأنه لم يصدر من المنصة.",
  "Password must be at least 10 characters": "كلمة المرور يجب ألا تقل عن 10 أحرف.",
  "Password is too long": "كلمة المرور طويلة جداً.",
  "Password must include letters and numbers": "كلمة المرور يجب أن تجمع أحرفاً وأرقاماً.",
  "Password is too common": "كلمة المرور شائعة وسهلة التخمين، اختر غيرها.",
  "Password must not contain your name or email": "كلمة المرور يجب ألا تحتوي على اسمك أو بريدك.",
};

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "تعذّر الاتصال بالخادم. تأكد من اتصالك أو حاول بعد قليل.");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const details = data?.details;
    // A validation error says which rule failed; show that rule rather than a generic message.
    const detail = Array.isArray(details) ? details.map((d) => ERROR_MESSAGES[d?.message]).find(Boolean) : undefined;
    const translated = detail ?? ERROR_MESSAGES[data?.error];
    const first = !translated && Array.isArray(details) && details[0]?.message ? `: ${details[0].message}` : "";
    throw new ApiError(res.status, translated ?? `${data?.error ?? "تعذّر تنفيذ الطلب"}${first}`, details);
  }
  return data as T;
}

// Shapes returned by the API (only the fields the UI uses).
export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
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
  // Changes when the logo does; null when the company has none.
  logoVersion?: number | null;
};

export const logoUrl = (companyId: number, version: number) => `${API_URL}/logos/${companyId}?v=${version}`;

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
  // Null when the admin recorded a placement the student arranged directly.
  application: { opportunity: { title: string } } | null;
  title: string | null;
  _count: { reports: number };
};

export const placementTitle = (p: Pick<Placement, "title" | "application">) =>
  p.title ?? p.application?.opportunity.title ?? "تدريب تعاوني";

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
  major: string | null;
  focus: string | null;
  sector: string | null;
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
export type PlanSummary = Pick<TrainingPlan, "id" | "major" | "focus" | "durationWeeks" | "source" | "isActive" | "createdAt">;
export type PlanCatalog = {
  aiAvailable: boolean;
  major: string;
  majorGroups: { name: string; majors: string[] }[];
  sectors: string[];
  fields: string[];
  placement: { company: string; sector: string; opportunity: string | null; startDate: string; durationWeeks: number } | null;
};

// Plan progress helpers shared by the overview and plan pages.
export const planProgress = (plan: PlanContent) => {
  const tasks = plan.weeks.flatMap((w) => w.tasks);
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
};

// The calendar week if the plan has a start date, else the first week with open
// tasks (the last week once everything is done, the first while nothing is planned).
export const currentWeekNo = (plan: TrainingPlan) => {
  const weeks = plan.content.weeks;
  if (plan.startDate) {
    const elapsed = Math.floor((Date.now() - Date.parse(plan.startDate)) / (7 * 864e5)) + 1;
    return Math.min(Math.max(elapsed, 1), weeks.length);
  }
  const open = weeks.find((w) => w.tasks.some((t) => !t.done));
  if (open) return open.weekNo;
  return weeks.some((w) => w.tasks.length) ? weeks.length : 1;
};

export const TASK_KINDS: Record<TaskKind, string> = { field: "تدريب ميداني", learning: "تعلّم ذاتي" };

export const tasksByKind = (plan: PlanContent) => {
  const counts: Record<TaskKind, number> = { field: 0, learning: 0 };
  for (const t of plan.weeks.flatMap((w) => w.tasks)) counts[t.kind ?? "field"] += 1;
  return counts;
};

// Weeks of a placement that have already started, capped at its length.
export const placementWeeksElapsed = (p: Pick<Placement, "startDate" | "endDate">) => {
  const week = 7 * 864e5;
  const total = Math.round((Date.parse(p.endDate) - Date.parse(p.startDate)) / week);
  return Math.max(0, Math.min(Math.ceil((Date.now() - Date.parse(p.startDate)) / week), total));
};
