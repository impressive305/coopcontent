"use client";

import { StudentOnly } from "@/components/dashboard/student-only";
import { OpportunitiesBrowser } from "@/components/student/opportunities";

export default function Page() {
  return (
    <StudentOnly>
      <OpportunitiesBrowser />
    </StudentOnly>
  );
}
