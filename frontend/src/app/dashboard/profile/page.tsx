"use client";

import { StudentOnly } from "@/components/dashboard/role-only";
import { StudentProfile } from "@/components/student/profile";

export default function Page() {
  return (
    <StudentOnly>
      <StudentProfile />
    </StudentOnly>
  );
}
