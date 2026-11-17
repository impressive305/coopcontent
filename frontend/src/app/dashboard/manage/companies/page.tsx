"use client";

import { AdminOnly } from "@/components/dashboard/role-only";
import { AdminCompanies } from "@/components/admin/companies";

export default function Page() {
  return (
    <AdminOnly>
      <AdminCompanies />
    </AdminOnly>
  );
}
