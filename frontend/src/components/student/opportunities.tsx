"use client";

import { useState } from "react";
import { Building2, CalendarCheck, MapPin, Search, Users } from "lucide-react";
import { api, type Application, type Opportunity, type Placement } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Empty, Field, StatusBadge, formValues, formatDate, useAction } from "../ui";

function OpportunityCard({ opp, applied, onApplied }: { opp: Opportunity; applied?: Application["status"]; onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const { busy, error, run } = useAction();
  const apply = () =>
    run(() => api("/applications", { method: "POST", body: { opportunityId: opp.id, coverLetter: coverLetter || undefined } })).then((ok) => ok && onApplied());

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{opp.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500"><Building2 className="size-4" />{opp.company?.name}</p>
        </div>
        {applied && <StatusBadge status={applied} />}
      </div>
      <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">{opp.description}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="flex items-center gap-1"><MapPin className="size-3.5" />{opp.city}</span>
        <span className="flex items-center gap-1"><CalendarCheck className="size-3.5" />{opp.durationWeeks} أسبوعاً</span>
        <span className="flex items-center gap-1"><Users className="size-3.5" />{opp.seats} مقاعد</span>
        <span>التخصص: {opp.major}</span>
        <span>آخر موعد: {formatDate(opp.deadline)}</span>
      </div>
      {!applied && !open && <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>تقديم على الفرصة</Button>}
      {open && !applied && (
        <div className="space-y-2 border-t border-black/5 pt-3 dark:border-white/10">
          <Field label="خطاب تعريفي (اختياري)" textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
          <Alert>{error}</Alert>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={apply}>تأكيد التقديم</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
        </div>
      )}
    </article>
  );
}

export function OpportunitiesBrowser() {
  const [filters, setFilters] = useState("");
  const opportunities = useData<Opportunity[]>(`/opportunities${filters}`);
  const applications = useData<Application[]>("/applications/mine");
  const placements = useData<Placement[]>("/placements");

  const applyFilters = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(Object.entries(formValues(e.currentTarget)).filter(([, v]) => v));
    setFilters(params.size ? `?${params}` : "");
  };
  const appliedStatus = new Map(applications.data?.map((a) => [a.opportunity?.id, a.status]));

  if (placements.data?.some((p) => p.status === "ACTIVE")) {
    return <Card><Alert tone="green">أنت حالياً في تدريب نشط، لذلك أُوقف التقديم على فرص جديدة.</Alert></Card>;
  }

  return (
    <>
      <Card>
        <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <Field label="بحث" name="q" placeholder="مثال: واجهات، بيانات" />
          <Field label="التخصص" name="major" placeholder="Computer Science" />
          <Field label="المدينة" name="city" placeholder="Riyadh" />
          <Button type="submit" className="flex items-center justify-center gap-2"><Search className="size-4" />بحث</Button>
        </form>
      </Card>
      <Alert>{opportunities.error}</Alert>
      {opportunities.data?.length === 0 && <Card><Empty>لا توجد فرص مطابقة حالياً.</Empty></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.data?.map((o) => (
          <OpportunityCard key={o.id} opp={o} applied={appliedStatus.get(o.id)} onApplied={applications.reload} />
        ))}
      </div>
    </>
  );
}
