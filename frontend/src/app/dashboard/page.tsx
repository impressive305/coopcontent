"use client";

import { useAuth } from "@/lib/auth-context";
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
      return <SupervisorDashboard />;
    case "ADMIN":
      return <AdminDashboard />;
  }
}
