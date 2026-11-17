"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api, placementTitle } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { SUPERVISOR_ROLE_ENABLED } from "@/lib/features";
import { ReportsList } from "../reports";
import { Alert, Button, Card, Empty, Field, Select, formValues, formatDate, useAction } from "../ui";
import { confirmDelete, type AdminCompany, type AdminPlacement, type AdminUser } from "./types";

type Supervisor = { id: number; name: string; _count: { supervisedUnits: number } };

const smallSelect = "rounded-lg border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";

// For students who were accepted by a company outside the platform.
function RecordPlacementForm({ supervisors, onCreated }: { supervisors: Supervisor[]; onCreated: () => void }) {
  const students = useData<AdminUser[]>("/admin/users?role=STUDENT");
  const companies = useData<AdminCompany[]>("/admin/companies?verified=true");
  const action = useAction();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    const body = {
      studentId: Number(v.studentId),
      companyId: Number(v.companyId),
      title: v.title,
      startDate: v.startDate,
      endDate: v.endDate,
      supervisorId: v.supervisorId ? Number(v.supervisorId) : null,
    };
    if (await action.run(() => api("/admin/placements", { method: "POST", body }))) {
      form.reset();
      onCreated();
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Select label="الطالب" name="studentId" required defaultValue="">
        <option value="" disabled>اختر الطالب</option>
        {students.data?.filter((u) => u.student).map((u) => <option key={u.id} value={u.student!.id}>{u.name} ({u.student!.universityId})</option>)}
      </Select>
      <Select label="الجهة" name="companyId" required defaultValue="">
        <option value="" disabled>اختر الجهة</option>
        {companies.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <div className="sm:col-span-2"><Field label="مسمّى التدريب" name="title" required minLength={2} placeholder="مثال: متدرب تحليل بيانات" /></div>
      <Field label="تاريخ البدء" name="startDate" type="date" required />
      <Field label="تاريخ الانتهاء" name="endDate" type="date" required />
      {SUPERVISOR_ROLE_ENABLED && (
        <Select label="المشرف الأكاديمي (اختياري)" name="supervisorId" defaultValue="">
          <option value="">بدون مشرف الآن</option>
          {supervisors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      )}
      <div className="space-y-3 sm:col-span-2">
        <Alert>{action.error}</Alert>
        <Button type="submit" disabled={action.busy}>تسجيل التدريب</Button>
      </div>
    </form>
  );
}

export function AdminPlacements() {
  const placements = useData<AdminPlacement[]>("/placements");
  const supervisors = useData<Supervisor[]>("/admin/supervisors");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const action = useAction();
  const reload = () => { placements.reload(); supervisors.reload(); };
  const patch = (id: number, body: object) => action.run(() => api(`/admin/placements/${id}`, { method: "PATCH", body })).then((ok) => ok && reload());
  const remove = (p: AdminPlacement) =>
    confirmDelete(`تدريب ${p.student.user.name} وتقاريره`) && action.run(() => api(`/admin/placements/${p.id}`, { method: "DELETE" })).then((ok) => ok && reload());

  return (
    <>
      <Card
        title="حالات التدريب"
        actions={<Button onClick={() => setAdding(!adding)} className="flex items-center gap-2"><Plus className="size-4" />{adding ? "إغلاق" : "تسجيل تدريب لطالب"}</Button>}
      >
        <p className="mb-4 text-sm text-gray-500">تُنشأ حالة التدريب تلقائياً عند قبول الجهة لطلب عبر المنصة. وإذا قُبل الطالب بالتواصل المباشر مع الجهة، سجّل تدريبه هنا ليرفع تقاريره. تراجع وحدة التدريب التقارير وتعتمدها من زر «التقارير».</p>
        {adding && <div className="mb-5 rounded-xl border border-black/10 p-4 dark:border-white/10"><RecordPlacementForm supervisors={supervisors.data ?? []} onCreated={() => { setAdding(false); reload(); }} /></div>}
        <Alert>{placements.error || action.error}</Alert>
        {placements.data?.length === 0 && <Empty>لا توجد حالات تدريب بعد.</Empty>}
        {!!placements.data?.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2 text-start font-medium">الطالب</th>
                  <th className="text-start font-medium">التدريب</th>
                  <th className="text-start font-medium">المدة</th>
                  <th className="text-start font-medium">الحالة</th>
                  {SUPERVISOR_ROLE_ENABLED && <th className="text-start font-medium">المشرف</th>}
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {placements.data.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="py-2.5 font-medium">{p.student.user.name}</td>
                    <td>
                      {placementTitle(p)}
                      <span className="block text-xs text-gray-500">{p.company.name} · {p.application ? "عبر المنصة" : "سجّله المسؤول"} · {p._count.reports} تقارير</span>
                    </td>
                    <td className="whitespace-nowrap text-xs">{formatDate(p.startDate)}<br />{formatDate(p.endDate)}</td>
                    <td>
                      <select aria-label="الحالة" value={p.status} disabled={action.busy} onChange={(e) => patch(p.id, { status: e.target.value })} className={smallSelect}>
                        <option value="ACTIVE">قيد التدريب</option>
                        <option value="COMPLETED">مكتمل</option>
                      </select>
                    </td>
                    {SUPERVISOR_ROLE_ENABLED && (
                      <td>
                        <select aria-label="المشرف" value={p.supervisor?.id ?? ""} disabled={action.busy} onChange={(e) => e.target.value && patch(p.id, { supervisorId: Number(e.target.value) })} className={smallSelect}>
                          <option value="" disabled>اختر مشرفاً</option>
                          {supervisors.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="whitespace-nowrap text-end">
                      <Button variant="secondary" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? "إخفاء" : "التقارير"}</Button>{" "}
                      <Button variant="danger" disabled={action.busy} onClick={() => remove(p)}>حذف</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {open !== null && (
          <div className="mt-5 border-t border-black/5 pt-5 dark:border-white/10">
            <ReportsList placementId={open} mode="reviewer" onChange={reload} />
          </div>
        )}
      </Card>
    </>
  );
}
