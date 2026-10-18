"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";
import { StudentDashboard } from "@/components/dashboards/student";
import { CompanyDashboard } from "@/components/dashboards/company";
import { SupervisorDashboard } from "@/components/dashboards/supervisor";
import { AdminDashboard } from "@/components/dashboards/admin";

const roleLabels = { STUDENT: "طالب", COMPANY: "جهة تدريب", SUPERVISOR: "مشرف أكاديمي", ADMIN: "مسؤول النظام" };

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (!user) return <p className="p-10 text-center text-sm text-gray-500">جارٍ التحميل...</p>;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <span className="font-bold text-brand">CoopConnect</span>
            <span className="ms-3 text-sm text-gray-500">لوحة {roleLabels[user.role]}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{user.name}</span>
            <Button variant="secondary" onClick={() => { logout(); router.push("/login"); }}>خروج</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        {user.role === "STUDENT" && <StudentDashboard />}
        {user.role === "COMPANY" && <CompanyDashboard user={user} />}
        {user.role === "SUPERVISOR" && <SupervisorDashboard />}
        {user.role === "ADMIN" && <AdminDashboard />}
      </main>
    </div>
  );
}
