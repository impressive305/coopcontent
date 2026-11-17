"use client";

import { AdminOnly } from "@/components/dashboard/role-only";
import { AdminOpportunities } from "@/components/admin/opportunities";

export default function Page() {
  return (
    <AdminOnly>
      <AdminOpportunities />
    </AdminOnly>
  );
}
