import type { ApplicationStatus, CompanyProfile, Role, TrainingPlan } from "@/lib/api";

// Shapes returned by the /admin endpoints (only the fields the UI uses).
export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  student: { id: number; universityId: string; university: string; major: string } | null;
  company: { id: number; name: string; verified: boolean } | null;
};

export type AdminPlacement = {
  id: number;
  title: string | null;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "COMPLETED";
  company: { id: number; name: string };
  supervisor: { id: number; name: string } | null;
  student: { id: number; user: { id: number; name: string } };
  application: { opportunity: { title: string } } | null;
  _count: { reports: number };
};

export type AdminOpportunity = {
  id: number;
  title: string;
  description: string;
  major: string;
  city: string;
  seats: number;
  durationWeeks: number;
  deadline: string;
  isOpen: boolean;
  createdAt: string;
  company: { id: number; name: string };
  _count: { applications: number };
};

export type AdminUserDetails = Omit<AdminUser, "student" | "company"> & {
  student: (NonNullable<AdminUser["student"]> & {
    gpa: string | null;
    gpaScale: number | null;
    skills: string[];
    applications: { id: number; status: ApplicationStatus; createdAt: string; opportunity: { title: string; company: { name: string } } }[];
    placements: AdminPlacement[];
    plans: (Pick<TrainingPlan, "id" | "source" | "durationWeeks" | "isActive" | "createdAt"> & { title: string; progress: { done: number; total: number } })[];
  }) | null;
  company: (CompanyProfile & { opportunities: AdminOpportunity[]; placements: AdminPlacement[] }) | null;
  supervisedUnits: AdminPlacement[];
};

export type AdminCompany = CompanyProfile & {
  crNumber: string | null;
  user: { id: number; name: string; email: string } | null;
  _count: { opportunities: number; placements: number };
};

export const ROLE_LABELS: Record<Role, string> = { STUDENT: "طالب", COMPANY: "جهة تدريب", SUPERVISOR: "مشرف أكاديمي", ADMIN: "مسؤول" };

// Confirmation for destructive actions that cannot be undone.
export const confirmDelete = (what: string) => window.confirm(`حذف ${what} نهائياً؟ لا يمكن التراجع عن ذلك.`);
