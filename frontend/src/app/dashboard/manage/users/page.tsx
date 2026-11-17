"use client";

import { AdminOnly } from "@/components/dashboard/role-only";
import { AdminUsers } from "@/components/admin/users";

export default function Page() {
  return (
    <AdminOnly>
      <AdminUsers />
    </AdminOnly>
  );
}
