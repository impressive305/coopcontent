"use client";

import Link from "next/link";
import type { Placement } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { ReportsList } from "../reports";
import { Card, Empty, StatusBadge, formatDate } from "../ui";

export function TrainingReports() {
  const { data } = useData<Placement[]>("/placements");
  if (!data) return null;
  const placement = data.find((p) => p.status === "ACTIVE") ?? data[0];
  if (!placement) {
    return (
      <Card>
        <Empty>تظهر التقارير بعد قبولك في فرصة تدريبية. <Link href="/dashboard/opportunities" className="text-brand underline">تصفّح الفرص</Link></Empty>
      </Card>
    );
  }
  return (
    <Card title={placement.application.opportunity.title} actions={<StatusBadge status={placement.status} />}>
      <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
        {placement.company.name} · {formatDate(placement.startDate)} إلى {formatDate(placement.endDate)} · المشرف الأكاديمي: {placement.supervisor?.name ?? "لم يُسند بعد"}
      </p>
      <ReportsList placementId={placement.id} mode={placement.status === "ACTIVE" ? "student" : "readonly"} />
    </Card>
  );
}
