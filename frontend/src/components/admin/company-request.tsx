"use client";

import { useState } from "react";
import { Check, Circle, Mail, MessageSquareText, Phone } from "lucide-react";
import { api, type CompanyReview } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { AccreditedBadge, LogoUploader } from "../company-logo";
import { CompanyProfileForm } from "../company-profile-form";
import { Alert, Button, Drawer, Field, StatusBadge, cx, formatDate, inputClass, useAction } from "../ui";
import { REVIEW_BADGES, type AdminCompanyDetails } from "./types";

// What the training unit usually collects before approving a company.
const REQUIRED: { label: string; done: (c: AdminCompanyDetails) => boolean }[] = [
  { label: "رقم السجل التجاري", done: (c) => !!c.crNumber },
  { label: "نبذة عن الجهة وبرنامج التدريب", done: (c) => !!c.description },
  { label: "بريد أو موقع للتقديم", done: (c) => !!(c.contactEmail || c.website) },
  { label: "التخصصات المطلوبة", done: (c) => c.majors.length > 0 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-subtle">{title}</h3>
      {children}
    </section>
  );
}

// Grants or removes the accreditation badge (independent of whether the company is listed).
export function AccreditationButton({ company, onChanged }: { company: { id: number; name: string; accredited: boolean }; onChanged: () => void }) {
  const action = useAction();
  const toggle = () => {
    const next = !company.accredited;
    if (!window.confirm(next ? `منح «${company.name}» علامة الاعتماد؟ ستظهر العلامة للطلاب بجانب اسمها.` : `سحب علامة الاعتماد من «${company.name}»؟`)) return;
    action.run(() => api(`/admin/companies/${company.id}/accreditation`, { method: "PATCH", body: { accredited: next } })).then((ok) => ok && onChanged());
  };
  return (
    <>
      <Button variant="secondary" disabled={action.busy} onClick={toggle}>{company.accredited ? "سحب علامة الاعتماد" : "منح علامة الاعتماد"}</Button>
      {action.error && <Alert>{action.error}</Alert>}
    </>
  );
}

function CrNumberForm({ company, onSaved }: { company: AdminCompanyDetails; onSaved: () => void }) {
  const [value, setValue] = useState(company.crNumber ?? "");
  const action = useAction();
  const save = () => action.run(() => api(`/admin/companies/${company.id}`, { method: "PATCH", body: { crNumber: value.trim() || null } })).then((ok) => ok && onSaved());
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-48"><Field label="رقم السجل التجاري" value={value} onChange={(e) => setValue(e.target.value)} pattern="\d{10}" inputMode="numeric" dir="ltr" hint="10 أرقام" /></div>
        <Button variant="secondary" disabled={action.busy || value.trim() === (company.crNumber ?? "")} onClick={save}>حفظ</Button>
      </div>
      <Alert>{action.error}</Alert>
    </div>
  );
}

export function CompanyRequest({ id, onChanged, onClose }: { id: number; onChanged: () => void; onClose: () => void }) {
  const { data: c, error, reload } = useData<AdminCompanyDetails>(`/admin/companies/${id}`);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const action = useAction();
  const changed = () => { reload(); onChanged(); };

  const setStatus = (status: CompanyReview, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    action.run(() => api(`/admin/companies/${id}/review`, { method: "PATCH", body: { status, note: note.trim() || undefined } }))
      .then((ok) => { if (ok) { setNote(""); changed(); } });
  };
  const addNote = () =>
    action.run(() => api(`/admin/companies/${id}/notes`, { method: "POST", body: { body: note.trim() } })).then((ok) => { if (ok) { setNote(""); reload(); } });

  const mailto = c?.user ? `mailto:${c.user.email}?subject=${encodeURIComponent(`طلب تسجيل ${c.name} في منصة التدريب التعاوني`)}` : undefined;

  return (
    <Drawer title={c?.name ?? "طلب تسجيل جهة"} onClose={onClose}>
      <Alert>{error || action.error}</Alert>
      {!c && !error && <p className="text-sm text-subtle">جارٍ التحميل...</p>}
      {c && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={REVIEW_BADGES[c.reviewStatus]} />
            <span className="text-subtle">قُدّم في {formatDate(c.user?.createdAt ?? c.createdAt)}</span>
            {c.reviewedAt && <span className="text-subtle">· آخر قرار {formatDate(c.reviewedAt)}</span>}
          </div>

          <Section title="مسؤول التدريب">
            {c.user ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-4">
                <div>
                  <p className="font-semibold">{c.user.name}</p>
                  <p className="text-sm text-subtle" dir="ltr">{c.user.email}</p>
                </div>
                <a href={mailto} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"><Mail className="size-4" />مراسلة</a>
              </div>
            ) : <p className="text-sm text-subtle">جهة أضافها المسؤول، بلا حساب.</p>}
            {c.phone && <p className="flex items-center gap-2 text-sm"><Phone className="size-4 text-subtle" /><span dir="ltr">{c.phone}</span></p>}
          </Section>

          <Section title="بيانات الجهة">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-subtle">المدينة</dt><dd>{c.city}</dd></div>
              <div><dt className="text-xs text-subtle">القطاع</dt><dd>{c.sector}</dd></div>
            </dl>
          </Section>

          <Section title="علامة الاعتماد">
            <div className="flex flex-wrap items-center gap-3">
              {c.accredited ? <AccreditedBadge /> : <span className="text-sm text-subtle">بلا علامة اعتماد</span>}
              <AccreditationButton company={c} onChanged={changed} />
            </div>
            <p className="text-xs text-subtle">تظهر العلامة للطلاب بجانب اسم الجهة بعد قبول طلبها. الجهات التي تسجّل بنفسها تحملها تلقائياً.</p>
          </Section>

          <Section title="ما يُستكمل قبل القبول">
            <ul className="space-y-1.5 text-sm">
              {REQUIRED.map((r) => (
                <li key={r.label} className={cx("flex items-center gap-2", r.done(c) ? "text-emerald-700 dark:text-emerald-400" : "text-subtle")}>
                  {r.done(c) ? <Check className="size-4" /> : <Circle className="size-4" />}{r.label}
                </li>
              ))}
            </ul>
            <CrNumberForm key={c.crNumber ?? ""} company={c} onSaved={changed} />
            <Button variant="secondary" onClick={() => setEditing(!editing)}>{editing ? "إغلاق التعديل" : "استكمال بيانات الجهة"}</Button>
            {editing && (
              <div className="space-y-5 rounded-xl border border-line p-4">
                <LogoUploader endpoint={`/admin/companies/${c.id}/logo`} companyId={c.id} name={c.name} version={c.logoVersion} onChange={changed} />
                <CompanyProfileForm initial={c} submitLabel="حفظ البيانات" onSubmit={(body) => api(`/admin/companies/${c.id}`, { method: "PATCH", body }).then(() => { setEditing(false); changed(); })} />
              </div>
            )}
          </Section>

          <Section title="سجل التواصل (داخلي، لا تراه الجهة)">
            <label className="block text-sm">
              <span className="sr-only">ملاحظة</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="مثال: أرسلنا بريداً نطلب السجل التجاري، والموعد المتفق عليه..." className={inputClass} />
            </label>
            <Button variant="secondary" disabled={action.busy || !note.trim()} onClick={addNote}><MessageSquareText className="size-4" />إضافة ملاحظة</Button>
            {c.notes.length === 0 ? <p className="text-sm text-subtle">لا توجد ملاحظات بعد.</p> : (
              <ol className="space-y-3 border-s-2 border-line ps-4">
                {c.notes.map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className="text-xs text-subtle">{n.author?.name ?? "مستخدم محذوف"} · {formatDate(n.createdAt)}</p>
                    <p className="mt-0.5 whitespace-pre-line">{n.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="القرار">
            <p className="text-xs text-subtle">تُحفظ الملاحظة المكتوبة أعلاه مع القرار، إن وُجدت.</p>
            <div className="flex flex-wrap gap-2">
              {c.reviewStatus === "PENDING" && <Button variant="secondary" disabled={action.busy} onClick={() => setStatus("CONTACTED")}>تم التواصل</Button>}
              {c.reviewStatus !== "APPROVED" && (
                <Button disabled={action.busy} onClick={() => setStatus("APPROVED", `قبول طلب «${c.name}»؟ ستظهر للطلاب ويمكنها نشر الفرص.`)}>قبول الطلب</Button>
              )}
              {c.reviewStatus !== "REJECTED" && (
                <Button variant="danger" disabled={action.busy} onClick={() => setStatus("REJECTED", `${c.reviewStatus === "APPROVED" ? "إلغاء قبول" : "رفض طلب"} «${c.name}»؟ لن تظهر للطلاب ولن تنشر فرصاً.`)}>
                  {c.reviewStatus === "APPROVED" ? "إلغاء القبول" : "رفض الطلب"}
                </Button>
              )}
              {c.reviewStatus === "REJECTED" && <Button variant="secondary" disabled={action.busy} onClick={() => setStatus("PENDING")}>إعادة فتح الطلب</Button>}
            </div>
          </Section>
        </>
      )}
    </Drawer>
  );
}
