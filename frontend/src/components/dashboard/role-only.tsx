"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// Role-specific sections redirect other roles back to their dashboard.
export function RoleOnly({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user?.role === role;
  useEffect(() => {
    if (user && !allowed) router.replace("/dashboard");
  }, [user, allowed, router]);
  return allowed ? <>{children}</> : null;
}

export const StudentOnly = ({ children }: { children: React.ReactNode }) => <RoleOnly role="STUDENT">{children}</RoleOnly>;
export const AdminOnly = ({ children }: { children: React.ReactNode }) => <RoleOnly role="ADMIN">{children}</RoleOnly>;
