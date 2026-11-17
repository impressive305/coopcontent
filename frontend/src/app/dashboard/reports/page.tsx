"use client";

import { StudentOnly } from "@/components/dashboard/role-only";
import { TrainingReports } from "@/components/student/training";

export default function Page() {
  return (
    <StudentOnly>
      <TrainingReports />
    </StudentOnly>
  );
}
