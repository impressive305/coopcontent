"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard/shell";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (!user) return <p className="p-10 text-center text-sm text-gray-500">جارٍ التحميل...</p>;
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
