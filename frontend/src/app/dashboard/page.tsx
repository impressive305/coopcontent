"use client";

import { useAuth } from "@/lib/auth-context";
import { SUPERVISOR_ROLE_ENABLED } from "@/lib/features";
import { StudentOverview } from "@/components/student/overview";
import { CompanyDashboard } from "@/components/dashboards/company";
import { SupervisorDashboard } from "@/components/dashboards/supervisor";
import { AdminDashboard } from "@/components/dashboards/admin";

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case "STUDENT":
      return <StudentOverview />;
    case "COMPANY":
      return <CompanyDashboard user={user} />;
    case "SUPERVISOR":
      // The API refuses paused supervisor accounts; this covers a session that predates the pause.
      return SUPERVISOR_ROLE_ENABLED ? <SupervisorDashboard /> : <p className="text-sm text-subtle">دور المشرف الأكاديمي معطّل حالياً.</p>;
    case "ADMIN":
      return <AdminDashboard />;
  }
}
