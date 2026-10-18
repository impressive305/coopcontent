"use client";

import { useState } from "react";
import { api, type Application, type Opportunity, type Placement } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { ReportsList } from "../reports";
import { Alert, Button, Card, Empty, Field, StatusBadge, formValues, formatDate, useAction } from "../ui";

function ActivePlacement({ placement }: { placement: Placement }) {
  return (
    <Card title={`تدريبي: ${placement.application.opportunity.title}`} actions={<StatusBadge status={placement.status} />}>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        {placement.company.name} · {formatDate(placement.startDate)} إلى {formatDate(placement.endDate)} · المشرف: {placement.supervisor?.name ?? "لم يُسند بعد"}
      </p>
      <ReportsList placementId={placement.id} mode={placement.status === "ACTIVE" ? "student" : "readonly"} />
    </Card>
  );
}

function OpportunityCard({ opp, applied, onApplied }: { opp: Opportunity; applied?: Application["status"]; onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const { busy, error, run } = useAction();
  const apply = () =>
    run(() => api("/applications", { method: "POST", body: { opportunityId: opp.id, coverLetter: coverLetter || undefined } })).then((ok) => ok && onApplied());

  return (
    <article className="space-y-2 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{opp.title}</h3>
          <p className="text-sm text-gray-500">{opp.company?.name} · {opp.city} · {opp.durationWeeks} أسبوعاً · {opp.seats} مقاعد</p>
        </div>
        {applied ? <StatusBadge status={applied} /> : <Button variant="secondary" onClick={() => setOpen(!open)}>تقديم</Button>}
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{opp.description}</p>
      <p className="text-xs text-gray-500">التخصص: {opp.major} · آخر موعد: {formatDate(opp.deadline)}</p>
      {open && !applied && (
        <div className="space-y-2 pt-2">
          <Field label="خطاب تعريفي (اختياري)" textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
          <Alert>{error}</Alert>
          <Button disabled={busy} onClick={apply}>تأكيد التقديم</Button>
        </div>
      )}
    </article>
  );
}

export function StudentDashboard() {
  const [filters, setFilters] = useState("");
  const opportunities = useData<Opportunity[]>(`/opportunities${filters}`);
  const applications = useData<Application[]>("/applications/mine");
  const placements = useData<Placement[]>("/placements");
  const { error, run } = useAction();

  const applyFilters = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(Object.entries(formValues(e.currentTarget)).filter(([, v]) => v));
    setFilters(params.size ? `?${params}` : "");
  };

  const withdraw = (id: number) => run(() => api(`/applications/${id}/withdraw`, { method: "PATCH" })).then(() => applications.reload());

  const appliedStatus = new Map(applications.data?.map((a) => [a.opportunity?.id, a.status]));
  const current = placements.data?.find((p) => p.status === "ACTIVE") ?? placements.data?.[0];

  return (
    <>
      {current && <ActivePlacement placement={current} />}

      <Card title="طلباتي">
        <Alert>{applications.error || error}</Alert>
        {applications.data?.length === 0 && <Empty>لم تقدّم على أي فرصة بعد.</Empty>}
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {applications.data?.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium">{a.opportunity?.title}</p>
                <p className="text-gray-500">{a.opportunity?.company?.name} · قُدّم في {formatDate(a.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                {a.status === "PENDING" && <Button variant="secondary" onClick={() => withdraw(a.id)}>سحب</Button>}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {!placements.data?.some((p) => p.status === "ACTIVE") && (
        <Card title="الفرص التدريبية المتاحة">
          <form onSubmit={applyFilters} className="mb-4 grid gap-3 sm:grid-cols-4 sm:items-end">
            <Field label="بحث" name="q" />
            <Field label="التخصص" name="major" />
            <Field label="المدينة" name="city" />
            <Button type="submit" variant="secondary">تصفية</Button>
          </form>
          <Alert>{opportunities.error}</Alert>
          {opportunities.data?.length === 0 && <Empty>لا توجد فرص مطابقة حالياً.</Empty>}
          <div className="grid gap-3 md:grid-cols-2">
            {opportunities.data?.map((o) => (
              <OpportunityCard key={o.id} opp={o} applied={appliedStatus.get(o.id)} onApplied={applications.reload} />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
