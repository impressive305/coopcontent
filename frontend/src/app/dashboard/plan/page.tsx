"use client";

import { StudentOnly } from "@/components/dashboard/student-only";
import { TrainingPlanPage } from "@/components/student/plan";

export default function Page() {
  return (
    <StudentOnly>
      <TrainingPlanPage />
    </StudentOnly>
  );
}
