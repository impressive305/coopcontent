"use client";

import { StudentOnly } from "@/components/dashboard/role-only";
import { ApplicationsList } from "@/components/student/applications";

export default function Page() {
  return (
    <StudentOnly>
      <ApplicationsList />
    </StudentOnly>
  );
}
