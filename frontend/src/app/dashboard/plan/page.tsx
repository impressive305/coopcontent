"use client";

import { StudentOnly } from "@/components/dashboard/role-only";
import { TrainingPlanPage } from "@/components/student/plan";

export default function Page() {
  return (
    <StudentOnly>
      <TrainingPlanPage />
    </StudentOnly>
  );
}
