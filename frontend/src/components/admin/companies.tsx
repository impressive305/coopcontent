"use client";

import { useState } from "react";
import { ExternalLink, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { CompanyLogo, LogoUploader } from "../company-logo";
import { CompanyProfileForm } from "../company-profile-form";
import { Alert, Button, Card, Empty, StatusBadge, cx, useAction } from "../ui";
import { confirmDelete, type AdminCompany } from "./types";

function CompanyRow({ company: c, onChanged }: { company: AdminCompany; onChanged: () => void }) {
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
            {!c.verified && <StatusBadge status="UNVERIFIED" />}
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
          {!c.verified && <Button disabled={action.busy} onClick={() => run(() => api(`/admin/companies/${c.id}/verify`, { method: "PATCH" }))}>اعتماد</Button>}
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

const FILTERS = [["all", "الكل"], ["pending", "بانتظار الاعتماد"], ["open", "ظاهرة للطلاب"], ["hidden", "مخفية"]] as const;

export function AdminCompanies() {
  const companies = useData<AdminCompany[]>("/admin/companies");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = (companies.data ?? []).filter((c) =>
    (filter === "all" || (filter === "pending" && !c.verified) || (filter === "open" && c.verified && c.coopOpen) || (filter === "hidden" && c.verified && !c.coopOpen)) &&
    (!q || [c.name, c.city, c.sector].some((t) => t.toLowerCase().includes(q))));
  const pending = companies.data?.filter((c) => !c.verified).length ?? 0;

  return (
    <>
      <Card
        title="جهات التدريب"
        actions={<Button onClick={() => setAdding(!adding)} className="flex items-center gap-2"><Plus className="size-4" />{adding ? "إغلاق" : "إضافة جهة"}</Button>}
      >
        <p className="mb-4 text-sm text-gray-500">
          الجهات المعتمدة والظاهرة تُعرض للطلاب في صفحة الفرص، ويتواصلون معها مباشرة. أضف أي جهة تفتح التدريب التعاوني حتى لو لم تسجّل في المنصة، وحدّث بياناتها مع كل دورة.
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
                {label}{key === "pending" && pending > 0 && ` (${pending})`}
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
          {shown.map((c) => <CompanyRow key={c.id} company={c} onChanged={companies.reload} />)}
        </ul>
      </Card>
    </>
  );
}
