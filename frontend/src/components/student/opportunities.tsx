"use client";

import { useState } from "react";
import { CalendarCheck, ExternalLink, Globe, Mail, MapPin, Phone, Search, Send } from "lucide-react";
import { api, type Application, type DirectoryCompany, type Opportunity, type Placement } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/use-data";
import { CompanyLogo } from "../company-logo";
import { Alert, Button, Card, Drawer, Empty, Field, Select, StatusBadge, formatDate, inputClass, useAction } from "../ui";

const mapsUrl = (c: DirectoryCompany) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([c.name, c.address, c.city].filter(Boolean).join(" "))}`;

const applyMailto = (c: DirectoryCompany, studentName?: string) =>
  `mailto:${c.email}?subject=${encodeURIComponent(`طلب تدريب تعاوني${studentName ? ` - ${studentName}` : ""}`)}`;

const linkClass = "flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm transition hover:border-brand hover:text-brand";

function InPlatformOpportunity({ opp, applied, canApply, onApplied }: { opp: Opportunity; applied?: Application["status"]; canApply: boolean; onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const { busy, error, run } = useAction();
  const apply = () =>
    run(() => api("/applications", { method: "POST", body: { opportunityId: opp.id, coverLetter: coverLetter || undefined } })).then((ok) => ok && onApplied());

  return (
    <li className="space-y-2 rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{opp.title}</p>
        {applied && <StatusBadge status={applied} />}
      </div>
      <p className="text-sm leading-6 text-subtle">{opp.description}</p>
      <p className="flex flex-wrap gap-x-3 text-xs text-subtle">
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

  return (
    <Drawer title={c?.name ?? "تفاصيل الجهة"} onClose={onClose}>
          <Alert>{error}</Alert>
          {!c && !error && <p className="text-sm text-subtle">جارٍ التحميل...</p>}
          {c && (
            <>
              <div className="flex items-center gap-4">
                <CompanyLogo id={c.id} name={c.name} version={c.logoVersion} className="size-20" />
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-muted px-3 py-1">{c.sector}</span>
                  <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1"><MapPin className="size-3.5" />{c.city}</span>
                </div>
              </div>
              {c.description && <p className="whitespace-pre-line text-sm leading-7 text-subtle">{c.description}</p>}

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

              <section className="space-y-3 rounded-2xl bg-brand-soft p-5">
                <h3 className="text-sm font-semibold">كيف أقدّم؟</h3>
                <p className="text-sm leading-6 text-subtle">
                  {c.email
                    ? "تواصل مع الجهة مباشرة: أرسل سيرتك الذاتية وخطاب التدريب من جامعتك إلى بريدها، أو قدّم من موقعها الإلكتروني."
                    : "تستقبل الجهة الطلبات من صفحتها الرسمية. جهّز سيرتك الذاتية وسجلك الأكاديمي وخطاب التدريب من جامعتك، وتابع مواعيد التقديم وشروطه هناك."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {c.email && <a href={applyMailto(c, user?.name)} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"><Send className="size-4" />راسل الجهة بالبريد</a>}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer" className={c.email ? "flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10" : "flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"}>
                      <Globe className="size-4" />{c.email ? "موقع الجهة" : "التقديم من صفحة البرنامج"}
                    </a>
                  )}
                </div>
              </section>

              {c.opportunities && c.opportunities.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">فرص منشورة على المنصة</h3>
                  {!canApply && <p className="mb-2 text-xs text-subtle">التقديم عبر المنصة متوقف لأن لديك تدريباً نشطاً.</p>}
                  <ul className="space-y-3">
                    {c.opportunities.map((o) => (
                      <InPlatformOpportunity key={o.id} opp={o} applied={appliedStatus.get(o.id)} canApply={canApply} onApplied={applications.reload} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
    </Drawer>
  );
}

function CompanyCard({ company: c, onOpen }: { company: DirectoryCompany; onOpen: () => void }) {
  const openCount = c._count?.opportunities ?? 0;
  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-brand/40 hover:shadow-md">
      <div className="flex items-start gap-4">
        <CompanyLogo id={c.id} name={c.name} version={c.logoVersion} className="size-14" />
        <div className="min-w-0">
          <h3 className="font-semibold leading-6">{c.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-subtle">
            <span className="flex items-center gap-1"><MapPin className="size-3.5" />{c.city}</span>
            <span>{c.sector}</span>
          </p>
        </div>
      </div>
      {c.description && <p className="line-clamp-2 text-sm leading-6 text-subtle">{c.description}</p>}
      {c.majors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.majors.slice(0, 4).map((m) => <span key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{m}</span>)}
          {c.majors.length > 4 && <span className="text-xs text-subtle">+{c.majors.length - 4}</span>}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <span className="flex items-center gap-3 text-xs text-subtle">
          {openCount > 0 && <span className="flex items-center gap-1"><CalendarCheck className="size-3.5" />{openCount} فرص على المنصة</span>}
          {c.website && <span className="flex items-center gap-1"><Globe className="size-3.5" />موقع</span>}
          {c.email && <span className="flex items-center gap-1"><Mail className="size-3.5" />تقديم بالبريد</span>}
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
      <section className="rounded-3xl bg-gradient-to-l from-teal-700 to-teal-900 p-6 text-white sm:p-8">
        <h2 className="text-xl font-bold">جهات تستقبل متدربي التدريب التعاوني</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-teal-50/90">اطّلع على تفاصيل كل جهة وشروطها، ثم قدّم من صفحتها الرسمية أو بريدها. بعض الجهات تنشر فرصها على المنصة أيضاً.</p>
        {companies.data && <p className="mt-4 text-sm font-semibold">{companies.data.length} جهة متاحة</p>}
      </section>
      <Card>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">بحث</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="اسم الجهة أو القطاع" className={`${inputClass} ps-10`} />
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
