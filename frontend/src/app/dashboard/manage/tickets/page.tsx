"use client";

import { AdminOnly } from "@/components/dashboard/role-only";
import { AdminTickets } from "@/components/admin/tickets";

export default function Page() {
  return (
    <AdminOnly>
      <AdminTickets />
    </AdminOnly>
  );
}
