"use client";

import { StudentOnly } from "@/components/dashboard/student-only";
import { StudentProfile } from "@/components/student/profile";

export default function Page() {
  return (
    <StudentOnly>
      <StudentProfile />
    </StudentOnly>
  );
}
