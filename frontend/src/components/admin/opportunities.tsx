"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api, type ApplicationStatus } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Empty, Field, Select, StatusBadge, formValues, formatDate, useAction } from "../ui";
import { confirmDelete, type AdminCompany, type AdminOpportunity } from "./types";

type AdminApplication = {
  id: number;
  status: ApplicationStatus;
  createdAt: string;
  student: { user: { id: number; name: string } };
  opportunity: { title: string; company: { name: string } };
};

function NewOpportunityForm({ onCreated }: { onCreated: () => void }) {
  const companies = useData<AdminCompany[]>("/admin/companies?verified=true");
  const action = useAction();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    const body = { ...v, companyId: Number(v.companyId), seats: Number(v.seats), durationWeeks: Number(v.durationWeeks) };
    if (await action.run(() => api("/admin/opportunities", { method: "POST", body }))) {
      form.reset();
      onCreated();
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Select label="الجهة" name="companyId" required defaultValue="">
        <option value="" disabled>اختر الجهة</option>
        {companies.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Field label="عنوان الفرصة" name="title" required minLength={3} />
      <div className="sm:col-span-2"><Field label="الوصف" name="description" textarea required minLength={10} /></div>
      <Field label="التخصص المطلوب" name="major" required />
      <Field label="المدينة" name="city" required />
      <Field label="عدد المقاعد" name="seats" type="number" min={1} max={500} required />
      <Field label="مدة التدريب (أسابيع)" name="durationWeeks" type="number" min={4} max={52} required defaultValue={24} />
      <Field label="آخر موعد للتقديم" name="deadline" type="date" required />
      <div className="space-y-3 sm:col-span-2">
        <Alert>{action.error}</Alert>
        <Button type="submit" disabled={action.busy}>نشر الفرصة</Button>
      </div>
    </form>
  );
}

export function AdminOpportunities() {
  const opportunities = useData<AdminOpportunity[]>("/admin/opportunities");
  const applications = useData<AdminApplication[]>("/admin/applications");
  const [adding, setAdding] = useState(false);
  const action = useAction();
  const run = (fn: () => Promise<unknown>) => action.run(fn).then((ok) => { if (ok) { opportunities.reload(); applications.reload(); } });

  return (
    <>
      <Card
        title="الفرص المنشورة على المنصة"
        actions={<Button onClick={() => setAdding(!adding)} className="flex items-center gap-2"><Plus className="size-4" />{adding ? "إغلاق" : "نشر فرصة لأي جهة"}</Button>}
      >
        {adding && <div className="mb-5 rounded-xl border border-black/10 p-4 dark:border-white/10"><NewOpportunityForm onCreated={() => { setAdding(false); opportunities.reload(); }} /></div>}
        <Alert>{opportunities.error || action.error}</Alert>
        {opportunities.data?.length === 0 && <Empty>لا توجد فرص منشورة.</Empty>}
        <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
          {opportunities.data?.map((o) => {
            const expired = new Date(o.deadline) < new Date();
            return (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{o.title} <span className="font-normal text-gray-500">· {o.company.name}</span></p>
                  <p className="text-xs text-gray-500">
                    {o.major} · {o.city} · {o.seats} مقاعد · {o._count.applications} متقدم · آخر موعد {formatDate(o.deadline)}
                    {" · "}{!o.isOpen ? "مغلقة" : expired ? "انتهى موعدها" : "مفتوحة"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={action.busy} onClick={() => run(() => api(`/admin/opportunities/${o.id}`, { method: "PATCH", body: { isOpen: !o.isOpen } }))}>
                    {o.isOpen ? "إغلاق" : "إعادة فتح"}
                  </Button>
                  <Button variant="danger" disabled={action.busy} onClick={() => confirmDelete(`الفرصة «${o.title}» وطلباتها`) && run(() => api(`/admin/opportunities/${o.id}`, { method: "DELETE" }))}>حذف</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={`الطلبات عبر المنصة (${applications.data?.length ?? 0})`}>
        <Alert>{applications.error}</Alert>
        {applications.data?.length === 0 && <Empty>لا توجد طلبات بعد.</Empty>}
        {!!applications.data?.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500">
                <tr><th className="py-2 text-start font-medium">الطالب</th><th className="text-start font-medium">الفرصة</th><th className="text-start font-medium">الجهة</th><th className="text-start font-medium">التاريخ</th><th className="text-start font-medium">الحالة</th></tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {applications.data.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2">{a.student.user.name}</td>
                    <td>{a.opportunity.title}</td>
                    <td>{a.opportunity.company.name}</td>
                    <td className="whitespace-nowrap">{formatDate(a.createdAt)}</td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
