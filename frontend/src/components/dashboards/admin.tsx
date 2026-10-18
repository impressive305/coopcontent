"use client";

import { api, type Placement } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Empty, Field, StatusBadge, formValues, formatDate, useAction } from "../ui";

type Stats = {
  students: number;
  companies: number;
  openOpportunities: number;
  applications: Partial<Record<"PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN", number>>;
  activePlacements: number;
  pendingReports: number;
};
type PendingCompany = { id: number; name: string; crNumber: string; city: string; sector: string; user: { name: string; email: string } };
type Supervisor = { id: number; name: string; email: string; _count: { supervisedUnits: number } };

function StatTiles({ stats }: { stats: Stats }) {
  const tiles = [
    ["الطلاب", stats.students],
    ["جهات معتمدة", stats.companies],
    ["فرص مفتوحة", stats.openOpportunities],
    ["طلبات قيد المراجعة", stats.applications.PENDING ?? 0],
    ["متدربون حالياً", stats.activePlacements],
    ["تقارير بانتظار المراجعة", stats.pendingReports],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const stats = useData<Stats>("/admin/stats");
  const companies = useData<PendingCompany[]>("/admin/companies?verified=false");
  const supervisors = useData<Supervisor[]>("/admin/supervisors");
  const placements = useData<Placement[]>("/placements");
  const action = useAction();

  const verify = (id: number) =>
    action.run(() => api(`/admin/companies/${id}/verify`, { method: "PATCH" })).then(() => { companies.reload(); stats.reload(); });

  const assign = (placementId: number, supervisorId: string) =>
    supervisorId &&
    action.run(() => api(`/placements/${placementId}/supervisor`, { method: "PATCH", body: { supervisorId: Number(supervisorId) } }))
      .then(() => { placements.reload(); supervisors.reload(); });

  const addSupervisor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (await action.run(() => api("/admin/supervisors", { method: "POST", body: formValues(form) }))) {
      form.reset();
      supervisors.reload();
    }
  };

  return (
    <>
      {stats.data && <StatTiles stats={stats.data} />}
      <Alert>{action.error}</Alert>

      <Card title="جهات بانتظار الاعتماد">
        {companies.data?.length === 0 && <Empty>لا توجد طلبات اعتماد.</Empty>}
        <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
          {companies.data?.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-gray-500">السجل التجاري <span dir="ltr">{c.crNumber}</span> · {c.city} · {c.sector} · {c.user.name}</p>
              </div>
              <Button disabled={action.busy} onClick={() => verify(c.id)}>اعتماد</Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="إسناد المشرفين">
        {placements.data?.length === 0 && <Empty>لا توجد حالات تدريب بعد.</Empty>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-start text-gray-500">
              <tr><th className="py-2 text-start font-medium">الطالب</th><th className="text-start font-medium">الجهة</th><th className="text-start font-medium">البدء</th><th className="text-start font-medium">الحالة</th><th className="text-start font-medium">المشرف</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {placements.data?.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{p.student.user.name}</td>
                  <td>{p.company.name}</td>
                  <td>{formatDate(p.startDate)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <select defaultValue={p.supervisor?.id ?? ""} onChange={(e) => assign(p.id, e.target.value)} className="rounded-lg border border-black/15 bg-transparent px-2 py-1 dark:border-white/20">
                      <option value="" disabled>اختر مشرفاً</option>
                      {supervisors.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="المشرفون الأكاديميون">
        <ul className="mb-4 divide-y divide-black/5 text-sm dark:divide-white/10">
          {supervisors.data?.map((s) => (
            <li key={s.id} className="flex justify-between py-2"><span>{s.name} <span className="text-gray-500" dir="ltr">{s.email}</span></span><span className="text-gray-500">{s._count.supervisedUnits} طلاب</span></li>
          ))}
        </ul>
        <form onSubmit={addSupervisor} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <Field label="الاسم" name="name" required />
          <Field label="البريد" name="email" type="email" required dir="ltr" />
          <Field label="كلمة مرور مؤقتة" name="password" type="password" minLength={8} required dir="ltr" />
          <Button type="submit" disabled={action.busy}>إضافة مشرف</Button>
        </form>
      </Card>
    </>
  );
}
