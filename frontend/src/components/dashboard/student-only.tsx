"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Student-only sections redirect other roles back to their dashboard.
export function StudentOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user?.role === "STUDENT";
  useEffect(() => {
    if (user && !allowed) router.replace("/dashboard");
  }, [user, allowed, router]);
  return allowed ? <>{children}</> : null;
}
