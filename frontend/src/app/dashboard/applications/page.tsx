"use client";

import { StudentOnly } from "@/components/dashboard/student-only";
import { ApplicationsList } from "@/components/student/applications";

export default function Page() {
  return (
    <StudentOnly>
      <ApplicationsList />
    </StudentOnly>
  );
}
