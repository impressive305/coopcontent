"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// Role-specific sections redirect other roles back to their dashboard.
// This only shapes the UI: the API enforces every role itself.
export function RoleOnly({ role, children }: { role: Role | Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = !!user && ([] as Role[]).concat(role).includes(user.role);
  useEffect(() => {
    if (user && !allowed) router.replace("/dashboard");
  }, [user, allowed, router]);
  return allowed ? <>{children}</> : null;
}

export const StudentOnly = ({ children }: { children: React.ReactNode }) => <RoleOnly role="STUDENT">{children}</RoleOnly>;
export const AdminOnly = ({ children }: { children: React.ReactNode }) => <RoleOnly role="ADMIN">{children}</RoleOnly>;
// Everyone who can open support tickets (admins answer them instead).
export const TicketAuthorOnly = ({ children }: { children: React.ReactNode }) => <RoleOnly role={["STUDENT", "COMPANY", "SUPERVISOR"]}>{children}</RoleOnly>;
