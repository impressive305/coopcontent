"use client";

import { useState } from "react";
import { ExternalLink, Inbox, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { AccreditedBadge, CompanyLogo, LogoUploader } from "../company-logo";
import { CompanyProfileForm } from "../company-profile-form";
import { Alert, Button, Card, Empty, StatusBadge, cx, formatDate, useAction } from "../ui";
import { AccreditationButton, CompanyRequest } from "./company-request";
import { REVIEW_BADGES, confirmDelete, type AdminCompany } from "./types";

const isOpenRequest = (c: AdminCompany) => c.reviewStatus === "PENDING" || c.reviewStatus === "CONTACTED";

// Sign-up requests waiting on the training unit, oldest first.
function Requests({ companies, onOpen }: { companies: AdminCompany[]; onOpen: (id: number) => void }) {
  const open = companies.filter(isOpenRequest).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <Card
      title={<span className="flex items-center gap-2"><Inbox className="size-5 text-brand" />طلبات تسجيل الجهات ({open.length})</span>}
      description="راجع كل طلب، وتواصل مع مسؤول التدريب، واستكمل بيانات الجهة، ثم اعتمدها أو ارفضها."
    >
      {open.length === 0 ? <Empty>لا توجد طلبات بانتظار المراجعة.</Empty> : (
        <ul className="divide-y divide-line">
          {open.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">{c.name}<StatusBadge status={REVIEW_BADGES[c.reviewStatus]} /></p>
                <p className="text-xs text-subtle">
                  {c.user?.name} · <span dir="ltr">{c.user?.email}</span> · {c.city} · {c.sector} · قُدّم {formatDate(c.createdAt)}
                </p>
              </div>
              <Button onClick={() => onOpen(c.id)}>مراجعة الطلب</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CompanyRow({ company: c, onChanged, onReview }: { company: AdminCompany; onChanged: () => void; onReview: () => void }) {
  const [editing, setEditing] = useState(false);
  const action = useAction();
  const run = (fn: () => Promise<unknown>) => action.run(fn).then((ok) => ok && onChanged());
  const remove = () => {
    const what = c.user ? `«${c.name}» مع حساب الجهة وفرصها ومتدربيها` : `«${c.name}» وفرصها ومتدربيها`;
    if (confirmDelete(what)) run(() => api(`/admin/companies/${c.id}`, { method: "DELETE" }));
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
        <CompanyLogo id={c.id} name={c.name} version={c.logoVersion} className="size-11" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {c.name}
            {c.accredited && <AccreditedBadge compact />}
            {c.reviewStatus !== "APPROVED" && <StatusBadge status={REVIEW_BADGES[c.reviewStatus]} />}
            {c.verified && !c.coopOpen && <StatusBadge status="CLOSED" />}
          </p>
          <p className="text-xs text-gray-500">
            {c.city} · {c.sector} · {c.user ? <>حساب مسجّل: {c.user.name} (<span dir="ltr">{c.user.email}</span>)</> : "أضافها المسؤول"}
            {c.crNumber && <> · السجل <span dir="ltr">{c.crNumber}</span></>}
            {" · "}{c._count.opportunities} فرص · {c._count.placements} متدربين
          </p>
          {c.website && (
            <a href={c.website} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-brand hover:underline">
              <span className="truncate" dir="ltr">{c.website.replace(/^https?:\/\//, "")}</span><ExternalLink className="size-3 shrink-0" />
            </a>
          )}
        </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.user && <Button variant={c.verified ? "secondary" : "primary"} onClick={onReview}>{c.verified ? "الطلب والسجل" : "مراجعة الطلب"}</Button>}
          {c.verified && <AccreditationButton company={c} onChanged={onChanged} />}
          {c.verified && (
            <Button variant="secondary" disabled={action.busy} onClick={() => run(() => api(`/admin/companies/${c.id}`, { method: "PATCH", body: { coopOpen: !c.coopOpen } }))}>
              {c.coopOpen ? "إخفاء عن الطلاب" : "إظهار للطلاب"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditing(!editing)}>{editing ? "إغلاق" : "تعديل"}</Button>
          <Button variant="danger" disabled={action.busy} onClick={remove}>حذف</Button>
        </div>
      </div>
      <Alert>{action.error}</Alert>
      {editing && (
        <div className="mt-3 space-y-5 rounded-xl border border-line p-4">
          <LogoUploader endpoint={`/admin/companies/${c.id}/logo`} companyId={c.id} name={c.name} version={c.logoVersion} onChange={onChanged} />
          <CompanyProfileForm initial={c} submitLabel="حفظ" onSubmit={(body) => api(`/admin/companies/${c.id}`, { method: "PATCH", body }).then(() => { setEditing(false); onChanged(); })} />
        </div>
      )}
    </li>
  );
}

const FILTERS = [["all", "الكل"], ["requests", "طلبات مفتوحة"], ["open", "ظاهرة للطلاب"], ["accredited", "معتمدة"], ["unaccredited", "بلا علامة اعتماد"], ["hidden", "مخفية"], ["rejected", "مرفوضة"]] as const;

export function AdminCompanies() {
  const companies = useData<AdminCompany[]>("/admin/companies");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [query, setQuery] = useState("");
  const [reviewing, setReviewing] = useState<number | null>(null);

  const q = query.trim().toLowerCase();
  const shown = (companies.data ?? []).filter((c) =>
    (filter === "all" || (filter === "requests" && isOpenRequest(c)) || (filter === "open" && c.verified && c.coopOpen) || (filter === "accredited" && c.accredited) || (filter === "unaccredited" && c.verified && !c.accredited) || (filter === "hidden" && c.verified && !c.coopOpen) || (filter === "rejected" && c.reviewStatus === "REJECTED")) &&
    (!q || [c.name, c.city, c.sector].some((t) => t.toLowerCase().includes(q))));
  const pending = companies.data?.filter(isOpenRequest).length ?? 0;

  return (
    <>
      {companies.data && <Requests companies={companies.data} onOpen={setReviewing} />}
      <Card
        title="جهات التدريب"
        actions={<Button onClick={() => setAdding(!adding)} className="flex items-center gap-2"><Plus className="size-4" />{adding ? "إغلاق" : "إضافة جهة"}</Button>}
      >
        <p className="mb-4 text-sm text-gray-500">
          الجهات المقبولة والظاهرة تُعرض للطلاب في صفحة الفرص، ويتواصلون معها مباشرة. أضف أي جهة تفتح التدريب التعاوني حتى لو لم تسجّل في المنصة، وحدّث بياناتها مع كل دورة.
          الجهات التي تسجّل بنفسها تحمل علامة الاعتماد تلقائياً، والجهات التي تضيفها بلا علامة حتى تمنحها إياها.
        </p>
        {adding && (
          <div className="mb-5 rounded-xl border border-black/10 p-4 dark:border-white/10">
            <CompanyProfileForm submitLabel="إضافة الجهة" onSubmit={(body) => api("/admin/companies", { method: "POST", body }).then(() => { setAdding(false); companies.reload(); })} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-black/5 p-1 text-sm dark:bg-white/10">
            {FILTERS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={cx("rounded-lg px-3 py-1.5", filter === key && "bg-white font-semibold shadow-sm dark:bg-white/15")}>
                {label}{key === "requests" && pending > 0 && ` (${pending})`}
              </button>
            ))}
          </div>
          <label className="relative min-w-56 flex-1">
            <span className="sr-only">بحث</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="اسم الجهة أو المدينة أو القطاع" className="w-full rounded-lg border border-black/15 bg-transparent py-2 ps-9 pe-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/20" />
          </label>
        </div>
      </Card>

      <Card>
        <Alert>{companies.error}</Alert>
        {companies.data && shown.length === 0 && <Empty>لا توجد جهات مطابقة.</Empty>}
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {shown.map((c) => <CompanyRow key={c.id} company={c} onChanged={companies.reload} onReview={() => setReviewing(c.id)} />)}
        </ul>
      </Card>
      {reviewing !== null && <CompanyRequest id={reviewing} onChanged={companies.reload} onClose={() => setReviewing(null)} />}
    </>
  );
}
