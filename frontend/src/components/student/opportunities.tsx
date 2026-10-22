"use client";

import { useEffect, useState } from "react";
import { Building2, CalendarCheck, ExternalLink, Globe, Mail, MapPin, Phone, Search, Send, Users, X } from "lucide-react";
import { api, type Application, type DirectoryCompany, type Opportunity, type Placement } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Empty, Field, Select, StatusBadge, formatDate, useAction } from "../ui";

const mapsUrl = (c: DirectoryCompany) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([c.name, c.address, c.city].filter(Boolean).join(" "))}`;

const applyMailto = (c: DirectoryCompany, studentName?: string) =>
  `mailto:${c.email}?subject=${encodeURIComponent(`طلب تدريب تعاوني${studentName ? ` - ${studentName}` : ""}`)}`;

const linkClass = "flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm hover:border-brand hover:text-brand dark:border-white/15";

function InPlatformOpportunity({ opp, applied, canApply, onApplied }: { opp: Opportunity; applied?: Application["status"]; canApply: boolean; onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const { busy, error, run } = useAction();
  const apply = () =>
    run(() => api("/applications", { method: "POST", body: { opportunityId: opp.id, coverLetter: coverLetter || undefined } })).then((ok) => ok && onApplied());

  return (
    <li className="space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{opp.title}</p>
        {applied && <StatusBadge status={applied} />}
      </div>
      <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{opp.description}</p>
      <p className="flex flex-wrap gap-x-3 text-xs text-gray-500">
        <span>{opp.major}</span><span>{opp.durationWeeks} أسبوعاً</span><span>{opp.seats} مقاعد</span><span>آخر موعد {formatDate(opp.deadline)}</span>
      </p>
      {canApply && !applied && !open && <Button variant="secondary" onClick={() => setOpen(true)}>التقديم عبر المنصة</Button>}
      {canApply && open && !applied && (
        <div className="space-y-2">
          <Field label="خطاب تعريفي (اختياري)" textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
          <Alert>{error}</Alert>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={apply}>تأكيد التقديم</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
        </div>
      )}
    </li>
  );
}

function CompanyDetails({ id, canApply, onClose }: { id: number; canApply: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data: c, error } = useData<DirectoryCompany>(`/companies/${id}`);
  const applications = useData<Application[]>("/applications/mine");
  const appliedStatus = new Map(applications.data?.map((a) => [a.opportunity?.id, a.status]));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="إغلاق" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={c?.name ?? "تفاصيل الجهة"} className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl">
        <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-black/5 bg-background/95 px-5 py-4 backdrop-blur dark:border-white/10">
          <h2 className="text-lg font-bold">{c?.name ?? "تفاصيل الجهة"}</h2>
          <button aria-label="إغلاق" onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"><X className="size-5" /></button>
        </header>
        <div className="space-y-6 p-5">
          <Alert>{error}</Alert>
          {!c && !error && <p className="text-sm text-gray-500">جارٍ التحميل...</p>}
          {c && (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-white/10">{c.sector}</span>
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 dark:bg-white/10"><MapPin className="size-3.5" />{c.city}</span>
              </div>
              {c.description && <p className="whitespace-pre-line text-sm leading-7 text-gray-700 dark:text-gray-300">{c.description}</p>}

              {c.majors.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">التخصصات المطلوبة</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {c.majors.map((m) => <span key={m} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-800 dark:bg-teal-500/15 dark:text-teal-100">{m}</span>)}
                  </div>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">التواصل والموقع</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className={linkClass}><Globe className="size-4 shrink-0" /><span className="truncate" dir="ltr">{c.website.replace(/^https?:\/\//, "")}</span><ExternalLink className="ms-auto size-3.5 shrink-0" /></a>}
                  {c.email && <a href={`mailto:${c.email}`} className={linkClass}><Mail className="size-4 shrink-0" /><span className="truncate" dir="ltr">{c.email}</span></a>}
                  {c.phone && <a href={`tel:${c.phone}`} className={linkClass}><Phone className="size-4 shrink-0" /><span dir="ltr">{c.phone}</span></a>}
                  <a href={mapsUrl(c)} target="_blank" rel="noopener noreferrer" className={linkClass}><MapPin className="size-4 shrink-0" /><span className="truncate">{[c.address, c.city].filter(Boolean).join("، ")}</span><ExternalLink className="ms-auto size-3.5 shrink-0" /></a>
                </div>
              </section>

              <section className="space-y-3 rounded-xl bg-teal-50/70 p-4 dark:bg-teal-500/10">
                <h3 className="text-sm font-semibold">كيف أقدّم؟</h3>
                <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">
                  تواصل مع الجهة مباشرة: أرسل سيرتك الذاتية وخطاب التدريب من جامعتك إلى بريدها، أو قدّم من موقعها الإلكتروني.
                </p>
                <div className="flex flex-wrap gap-2">
                  {c.email && <a href={applyMailto(c, user?.name)} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"><Send className="size-4" />راسل الجهة بالبريد</a>}
                  {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"><Globe className="size-4" />موقع الجهة</a>}
                </div>
              </section>

              {c.opportunities && c.opportunities.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">فرص منشورة على المنصة</h3>
                  {!canApply && <p className="mb-2 text-xs text-gray-500">التقديم عبر المنصة متوقف لأن لديك تدريباً نشطاً.</p>}
                  <ul className="space-y-3">
                    {c.opportunities.map((o) => (
                      <InPlatformOpportunity key={o.id} opp={o} applied={appliedStatus.get(o.id)} canApply={canApply} onApplied={applications.reload} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function CompanyCard({ company: c, onOpen }: { company: DirectoryCompany; onOpen: () => void }) {
  const openCount = c._count?.opportunities ?? 0;
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-brand dark:bg-teal-500/15"><Building2 className="size-5" /></span>
        <div className="min-w-0">
          <h3 className="font-semibold">{c.name}</h3>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-gray-500">
            <span className="flex items-center gap-1"><MapPin className="size-3.5" />{c.city}</span>
            <span>{c.sector}</span>
          </p>
        </div>
      </div>
      {c.description && <p className="line-clamp-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{c.description}</p>}
      {c.majors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.majors.slice(0, 4).map((m) => <span key={m} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-white/10">{m}</span>)}
          {c.majors.length > 4 && <span className="text-xs text-gray-500">+{c.majors.length - 4}</span>}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="flex items-center gap-3 text-xs text-gray-500">
          {openCount > 0 && <span className="flex items-center gap-1"><CalendarCheck className="size-3.5" />{openCount} فرص على المنصة</span>}
          {c.website && <span className="flex items-center gap-1"><Globe className="size-3.5" />موقع</span>}
          {c.email && <span className="flex items-center gap-1"><Users className="size-3.5" />تقديم بالبريد</span>}
        </span>
        <Button variant="secondary" onClick={onOpen}>تفاصيل الجهة</Button>
      </div>
    </article>
  );
}

export function OpportunitiesBrowser() {
  const companies = useData<DirectoryCompany[]>("/companies");
  const placements = useData<Placement[]>("/placements");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [major, setMajor] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const all = companies.data ?? [];
  const cities = [...new Set(all.map((c) => c.city))].sort();
  const majors = [...new Set(all.flatMap((c) => c.majors))].sort();
  const q = query.trim().toLowerCase();
  const shown = all.filter((c) =>
    (!q || [c.name, c.sector, c.description ?? ""].some((t) => t.toLowerCase().includes(q))) &&
    (!city || c.city === city) &&
    (!major || c.majors.includes(major)));
  const canApply = !placements.data?.some((p) => p.status === "ACTIVE");

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-l from-teal-700 to-teal-900 p-6 text-white">
        <h2 className="mb-1 text-lg font-bold">جهات تستقبل متدربي التدريب التعاوني</h2>
        <p className="max-w-2xl text-sm leading-7 text-teal-100">اطّلع على تفاصيل كل جهة وموقعها، ثم تواصل معها مباشرة عبر بريدها أو موقعها الإلكتروني. بعض الجهات تنشر فرصها على المنصة أيضاً.</p>
      </div>
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">بحث</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="اسم الجهة أو القطاع" className="w-full rounded-lg border border-black/15 bg-transparent py-2 ps-9 pe-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/20" />
            </span>
          </label>
          <Select label="المدينة" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">كل المدن</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="التخصص" value={major} onChange={(e) => setMajor(e.target.value)}>
            <option value="">كل التخصصات</option>
            {majors.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
      </Card>
      <Alert>{companies.error}</Alert>
      {companies.data && shown.length === 0 && <Card><Empty>لا توجد جهات مطابقة حالياً.</Empty></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((c) => <CompanyCard key={c.id} company={c} onOpen={() => setSelected(c.id)} />)}
      </div>
      {selected !== null && <CompanyDetails id={selected} canApply={canApply} onClose={() => setSelected(null)} />}
    </>
  );
}
