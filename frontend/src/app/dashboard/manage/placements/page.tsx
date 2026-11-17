"use client";

import { AdminOnly } from "@/components/dashboard/role-only";
import { AdminPlacements } from "@/components/admin/placements";

export default function Page() {
  return (
    <AdminOnly>
      <AdminPlacements />
    </AdminOnly>
  );
}
