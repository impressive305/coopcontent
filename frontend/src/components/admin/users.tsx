"use client";

import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { DEGREES, api, placementTitle, type Role } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { DegreeField, GpaField, UniversityField } from "../student-fields";
import { SOURCE_LABELS } from "../student/plan-shared";
import { Alert, Button, Card, Drawer, Empty, Field, Select, StatusBadge, cx, formValues, formatDate, useAction } from "../ui";
import { SUPERVISOR_ROLE_ENABLED } from "@/lib/features";
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH } from "@/lib/password";
import { ROLE_LABELS, confirmDelete, type AdminPlacement, type AdminUser, type AdminUserDetails } from "./types";

const ROLE_TABS = ([["", "الكل"], ["STUDENT", "الطلاب"], ["COMPANY", "الجهات"], ["SUPERVISOR", "المشرفون"], ["ADMIN", "المسؤولون"]] as [Role | "", string][])
  .filter(([role]) => role !== "SUPERVISOR" || SUPERVISOR_ROLE_ENABLED);

function AddStaffForm({ onCreated }: { onCreated: () => void }) {
  const action = useAction();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (await action.run(() => api("/admin/users", { method: "POST", body: formValues(form) }))) {
      form.reset();
      onCreated();
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-5 sm:items-end">
      <Field label="الاسم" name="name" required minLength={2} />
      <Field label="البريد" name="email" type="email" required dir="ltr" />
      <Field label="كلمة مرور مؤقتة" name="password" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={200} required dir="ltr" title={PASSWORD_HINT} />
      <Select label="الدور" name="role" defaultValue={SUPERVISOR_ROLE_ENABLED ? "SUPERVISOR" : "ADMIN"}>
        {SUPERVISOR_ROLE_ENABLED && <option value="SUPERVISOR">مشرف أكاديمي</option>}
        <option value="ADMIN">مسؤول</option>
      </Select>
      <Button type="submit" disabled={action.busy}>إضافة</Button>
      <div className="sm:col-span-5"><Alert>{action.error}</Alert></div>
    </form>
  );
}

function PlacementList({ placements, empty }: { placements: AdminPlacement[]; empty: string }) {
  if (!placements.length) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
      {placements.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>
            <span className="font-medium">{placementTitle(p)}</span>
            <span className="block text-xs text-gray-500">
              {p.student.user.name} · {p.company.name} · {formatDate(p.startDate)} إلى {formatDate(p.endDate)}{SUPERVISOR_ROLE_ENABLED && ` · المشرف: ${p.supervisor?.name ?? "—"}`} · {p._count.reports} تقارير
            </span>
          </span>
          <StatusBadge status={p.status} />
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

function StudentProfileForm({ user, onSaved }: { user: AdminUserDetails; onSaved: () => void }) {
  const s = user.student!;
  const action = useAction();
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const student = {
      universityId: v.universityId,
      university: v.university,
      major: v.major,
      degree: v.degree,
      gpa: v.gpa ? Number(v.gpa) : null,
      gpaScale: v.gpa ? Number(v.gpaScale) : null,
      skills: v.skills.split(",").map((x) => x.trim()).filter(Boolean),
    };
    if (await action.run(() => api(`/admin/users/${user.id}`, { method: "PATCH", body: { student } }))) onSaved();
  };
  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      <Field label="الرقم الجامعي" name="universityId" required defaultValue={s.universityId} dir="ltr" />
      <UniversityField defaultValue={s.university} />
      <Field label="التخصص" name="major" required defaultValue={s.major} />
      <DegreeField defaultValue={s.degree} />
      <GpaField defaultValue={s.gpa} defaultScale={s.gpaScale} />
      <div className="sm:col-span-2"><Field label="المهارات (مفصولة بفواصل)" name="skills" defaultValue={s.skills.join(", ")} dir="ltr" /></div>
      <div className="space-y-2 sm:col-span-2">
        <Alert>{action.error}</Alert>
        <Button type="submit" variant="secondary" disabled={action.busy}>حفظ بيانات الطالب</Button>
      </div>
    </form>
  );
}

function UserDetails({ id, onChanged, onClose }: { id: number; onChanged: () => void; onClose: () => void }) {
  const { data: u, error, reload } = useData<AdminUserDetails>(`/admin/users/${id}`);
  const action = useAction();
  const [password, setPassword] = useState("");
  const changed = () => { reload(); onChanged(); };
  const patch = (body: object) => action.run(() => api(`/admin/users/${id}`, { method: "PATCH", body })).then((ok) => ok && changed());

  const saveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { name, email } = formValues(e.currentTarget);
    patch({ name, email });
  };
  const remove = async () => {
    if (!u || !confirmDelete(`حساب ${u.name} وكل بياناته`)) return;
    if (await action.run(() => api(`/admin/users/${id}`, { method: "DELETE" }))) { onChanged(); onClose(); }
  };

  return (
    <Drawer title={u?.name ?? "تفاصيل الحساب"} onClose={onClose}>
      <Alert>{error || action.error}</Alert>
      {!u && !error && <p className="text-sm text-gray-500">جارٍ التحميل...</p>}
      {u && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-white/10">{ROLE_LABELS[u.role]}</span>
            {!u.isActive && <StatusBadge status="SUSPENDED" />}
            <span className="text-gray-500">سُجّل في {formatDate(u.createdAt)}</span>
          </div>

          <Section title="الحساب">
            <form onSubmit={saveAccount} className="grid gap-3 sm:grid-cols-2">
              <Field label="الاسم" name="name" required minLength={2} defaultValue={u.name} />
              <Field label="البريد الإلكتروني" name="email" type="email" required dir="ltr" defaultValue={u.email} />
              <div className="sm:col-span-2"><Button type="submit" variant="secondary" disabled={action.busy}>حفظ</Button></div>
            </form>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1"><Field label="كلمة مرور جديدة" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={200} hint={PASSWORD_HINT} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" /></div>
              <Button variant="secondary" disabled={action.busy || password.length < PASSWORD_MIN_LENGTH} onClick={() => patch({ password }).then(() => setPassword(""))}>تعيين كلمة المرور</Button>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-black/5 pt-3 dark:border-white/10">
              <Button variant="secondary" disabled={action.busy} onClick={() => patch({ isActive: !u.isActive })}>{u.isActive ? "إيقاف الحساب" : "إعادة تفعيل الحساب"}</Button>
              <Button variant="danger" disabled={action.busy} onClick={remove}>حذف الحساب</Button>
            </div>
          </Section>

          {u.student && (
            <>
              <Section title="بيانات الطالب"><StudentProfileForm key={u.student.id} user={u} onSaved={changed} /></Section>
              <Section title={`خطط التدريب (${u.student.plans.length})`}>
                {u.student.plans.length === 0 ? <p className="text-sm text-gray-500">لم ينشئ خطة بعد.</p> : (
                  <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
                    {u.student.plans.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>
                          <span className="font-medium">{p.title}</span>
                          <span className="block text-xs text-gray-500">{p.durationWeeks} أسبوعاً · {SOURCE_LABELS[p.source]} · {formatDate(p.createdAt)} · {p.progress.done}/{p.progress.total} مهمة منجزة</span>
                        </span>
                        {p.isActive && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800 dark:bg-teal-500/15 dark:text-teal-100">الخطة الحالية</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title={`الطلبات عبر المنصة (${u.student.applications.length})`}>
                {u.student.applications.length === 0 ? <p className="text-sm text-gray-500">لا توجد طلبات.</p> : (
                  <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
                    {u.student.applications.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                        <span>{a.opportunity.title} · <span className="text-gray-500">{a.opportunity.company.name} · {formatDate(a.createdAt)}</span></span>
                        <StatusBadge status={a.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="حالات التدريب"><PlacementList placements={u.student.placements} empty="لا يوجد تدريب مسجّل." /></Section>
            </>
          )}

          {u.company && (
            <>
              <Section title="الجهة">
                <p className="text-sm">{u.company.name} · {u.company.city} · {u.company.sector} {!u.company.verified && <StatusBadge status="UNVERIFIED" />}</p>
                <p className="text-xs text-gray-500">تُعدَّل بيانات الجهة واعتمادها من صفحة «جهات التدريب».</p>
              </Section>
              <Section title={`الفرص المنشورة (${u.company.opportunities.length})`}>
                <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
                  {u.company.opportunities.map((o) => (
                    <li key={o.id} className="py-2">{o.title} <span className="text-gray-500">· {o._count.applications} متقدم · {o.isOpen ? "مفتوحة" : "مغلقة"}</span></li>
                  ))}
                </ul>
              </Section>
              <Section title="المتدربون"><PlacementList placements={u.company.placements} empty="لا يوجد متدربون." /></Section>
            </>
          )}

          {u.role === "SUPERVISOR" && (
            <Section title={`الطلاب المسندون (${u.supervisedUnits.length})`}><PlacementList placements={u.supervisedUnits} empty="لم يُسند إليه أي طالب." /></Section>
          )}
        </>
      )}
    </Drawer>
  );
}

export function AdminUsers() {
  const [role, setRole] = useState<Role | "">("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const params = new URLSearchParams(Object.entries({ role, q: query.trim() }).filter(([, v]) => v));
  const users = useData<AdminUser[]>(`/admin/users${params.size ? `?${params}` : ""}`);

  return (
    <>
      <Card
        title="المستخدمون"
        actions={<Button onClick={() => setAdding(!adding)} className="flex items-center gap-2"><UserPlus className="size-4" />{adding ? "إغلاق" : SUPERVISOR_ROLE_ENABLED ? "إضافة مشرف أو مسؤول" : "إضافة مسؤول"}</Button>}
      >
        {adding && <div className="mb-5 rounded-xl border border-black/10 p-4 dark:border-white/10"><AddStaffForm onCreated={() => { setAdding(false); users.reload(); }} /></div>}
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-black/5 p-1 text-sm dark:bg-white/10">
            {ROLE_TABS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={role === key} onClick={() => setRole(key)} className={cx("rounded-lg px-3 py-1.5", role === key && "bg-white font-semibold shadow-sm dark:bg-white/15")}>{label}</button>
            ))}
          </div>
          <label className="relative min-w-56 flex-1">
            <span className="sr-only">بحث</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="الاسم أو البريد أو الرقم الجامعي أو اسم الجهة" className="w-full rounded-lg border border-black/15 bg-transparent py-2 ps-9 pe-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/20" />
          </label>
        </div>
      </Card>

      <Card>
        <Alert>{users.error}</Alert>
        {users.data?.length === 0 && <Empty>لا يوجد مستخدمون مطابقون.</Empty>}
        {!!users.data?.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2 text-start font-medium">المستخدم</th>
                  <th className="text-start font-medium">الدور</th>
                  <th className="text-start font-medium">التفاصيل</th>
                  <th className="text-start font-medium">تاريخ التسجيل</th>
                  <th className="text-start font-medium">الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {users.data?.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-gray-500" dir="ltr">{u.email}</p>
                    </td>
                    <td>{ROLE_LABELS[u.role]}</td>
                    <td className="text-gray-600 dark:text-gray-300">
                      {u.student && [u.student.university, u.student.degree && DEGREES[u.student.degree], u.student.major].filter(Boolean).join(" · ")}
                      {u.company && u.company.name}
                    </td>
                    <td className="whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td>
                      {!u.isActive ? <StatusBadge status="SUSPENDED" /> : u.company && !u.company.verified ? <StatusBadge status="UNVERIFIED" /> : <span className="text-xs text-gray-500">نشط</span>}
                    </td>
                    <td className="text-end"><Button variant="secondary" onClick={() => setSelected(u.id)}>عرض</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selected !== null && <UserDetails id={selected} onChanged={users.reload} onClose={() => setSelected(null)} />}
    </>
  );
}
