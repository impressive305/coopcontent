"use client";

import { useState } from "react";
import { api, type Placement } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { ReportsList } from "../reports";
import { Alert, Button, Card, Empty, StatusBadge, formatDate, useAction } from "../ui";

export function SupervisorDashboard() {
  const { data, error, reload } = useData<Placement[]>("/placements");
  const [open, setOpen] = useState<number | null>(null);
  const complete = useAction();

  const finish = (id: number) => complete.run(() => api(`/placements/${id}/complete`, { method: "PATCH" })).then((ok) => { if (ok) reload(); });
  const active = data?.filter((p) => p.status === "ACTIVE").length ?? 0;

  return (
    <Card title={`طلابي (${data?.length ?? 0})`} actions={<span className="text-sm text-gray-500">{active} قيد التدريب</span>}>
      <Alert>{error || complete.error}</Alert>
      {data?.length === 0 && <Empty>لم يُسند إليك أي طالب بعد.</Empty>}
      <div className="space-y-3">
        {data?.map((p) => (
          <div key={p.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{p.student.user.name} <StatusBadge status={p.status} /></p>
                <p className="text-sm text-gray-500">
                  {p.company.name} · {p.application.opportunity.title} · {formatDate(p.startDate)} إلى {formatDate(p.endDate)} · {p._count.reports} تقارير
                </p>
              </div>
              <div className="flex gap-2">
                {p.status === "ACTIVE" && <Button variant="secondary" disabled={complete.busy} onClick={() => finish(p.id)}>إنهاء التدريب</Button>}
                <Button onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? "إخفاء" : "التقارير"}</Button>
              </div>
            </div>
            {open === p.id && <div className="mt-4"><ReportsList placementId={p.id} mode="supervisor" onChange={reload} /></div>}
          </div>
        ))}
      </div>
    </Card>
  );
}
