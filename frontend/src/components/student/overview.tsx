"use client";

import Link from "next/link";
import { ArrowLeft, Bot, Briefcase, CalendarCheck, ClipboardList, FileText, Flag } from "lucide-react";
import {
  api, currentWeekNo, planProgress,
  type Application, type Placement, type Report, type TrainingPlan,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/use-data";
import { Alert, Card, StatusBadge, cx, formatDate, useAction } from "../ui";

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Briefcase; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between text-gray-500">
        <span className="text-sm">{label}</span>
        <Icon className="size-5 text-brand" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function ThisWeek({ plan, onChange }: { plan: TrainingPlan; onChange: (p: TrainingPlan) => void }) {
  const action = useAction();
  const weekNo = currentWeekNo(plan);
  const week = plan.content.weeks[weekNo - 1];
  const nextMilestone = plan.content.milestones.find((m) => m.weekNo >= weekNo);
  const toggle = (taskId: string, done: boolean) =>
    action.run(async () => onChange(await api<TrainingPlan>(`/plans/${plan.id}/tasks/${taskId}`, { method: "PATCH", body: { done } })));

  return (
    <Card
      title={`هذا الأسبوع: ${week.theme}`}
      actions={<Link href="/dashboard/plan" className="flex items-center gap-1 text-sm text-brand hover:underline">الخطة كاملة <ArrowLeft className="size-4" /></Link>}
    >
      <p className="mb-4 text-xs text-gray-500">الأسبوع {week.weekNo} من {plan.durationWeeks} · {week.phase}</p>
      <ul className="space-y-2">
        {week.tasks.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={t.done} disabled={action.busy} onChange={(e) => toggle(t.id, e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-teal-700" />
              <span className={cx(t.done && "text-gray-400 line-through")}>{t.title}</span>
            </label>
          </li>
        ))}
      </ul>
      <Alert>{action.error}</Alert>
      <div className="mt-4 flex flex-wrap gap-4 border-t border-black/5 pt-4 text-sm dark:border-white/10">
        <span><span className="text-gray-500">المخرَج: </span>{week.deliverable}</span>
        {nextMilestone && (
          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><Flag className="size-4" />الأسبوع {nextMilestone.weekNo}: {nextMilestone.title}</span>
        )}
      </div>
    </Card>
  );
}

export function StudentOverview() {
  const { user } = useAuth();
  const placements = useData<Placement[]>("/placements");
  const applications = useData<Application[]>("/applications/mine");
  const planData = useData<TrainingPlan | null>("/plans/current");
  const placement = placements.data?.find((p) => p.status === "ACTIVE") ?? placements.data?.[0];
  const reports = useData<Report[]>(placement ? `/placements/${placement.id}/reports` : null);
  const plan = planData.data;

  const progress = plan ? planProgress(plan.content) : null;
  const approved = reports.data?.filter((r) => r.status === "APPROVED").length ?? 0;
  const returned = reports.data?.filter((r) => r.status === "RETURNED").length ?? 0;
  const pendingApps = applications.data?.filter((a) => a.status === "PENDING").length ?? 0;

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">أهلاً، {user?.name.split(" ")[0]}</h2>
        <p className="text-sm text-gray-500">{user?.student?.major} · {user?.student?.university}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Briefcase} label="حالة التدريب" value={placement ? (placement.status === "ACTIVE" ? "قيد التدريب" : "مكتمل") : "لم يبدأ"} hint={placement?.company.name ?? `${pendingApps} طلبات قيد المراجعة`} />
        <Stat icon={CalendarCheck} label="الأسبوع الحالي" value={plan ? `${currentWeekNo(plan)} / ${plan.durationWeeks}` : "—"} hint={plan ? plan.content.weeks[currentWeekNo(plan) - 1].phase : "أنشئ خطتك أولاً"} />
        <Stat icon={ClipboardList} label="إنجاز الخطة" value={progress ? `${progress.percent}%` : "—"} hint={progress ? `${progress.done} من ${progress.total} مهمة` : undefined} />
        <Stat icon={FileText} label="التقارير المعتمدة" value={String(approved)} hint={returned ? `${returned} تقارير مُعادة للتعديل` : `${reports.data?.length ?? 0} تقارير مرفوعة`} />
      </div>

      {returned > 0 && <Alert tone="amber">لديك {returned} تقارير أعادها المشرف للتعديل. <Link href="/dashboard/reports" className="underline">راجعها الآن</Link></Alert>}

      {plan ? (
        <ThisWeek plan={plan} onChange={() => planData.reload()} />
      ) : planData.data === null ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-l from-teal-700 to-teal-900 p-6 text-white">
          <div>
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold"><Bot className="size-5" />لا توجد لديك خطة تدريب بعد</h3>
            <p className="text-sm text-teal-100">دع المساعد الذكي يبني لك خطة أسبوعية تناسب تخصصك ومسارك.</p>
          </div>
          <Link href="/dashboard/plan" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50">إنشاء الخطة</Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="تدريبي">
          {placement ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500">الفرصة</dt><dd className="font-medium">{placement.application.opportunity.title}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">الجهة</dt><dd>{placement.company.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">المدة</dt><dd>{formatDate(placement.startDate)} إلى {formatDate(placement.endDate)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">المشرف الأكاديمي</dt><dd>{placement.supervisor?.name ?? "لم يُسند بعد"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">الحالة</dt><dd><StatusBadge status={placement.status} /></dd></div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">لم تُقبل في فرصة بعد. <Link href="/dashboard/opportunities" className="text-brand underline">تصفّح الفرص المتاحة</Link></p>
          )}
        </Card>
        <Card title="آخر الطلبات" actions={<Link href="/dashboard/applications" className="text-sm text-brand hover:underline">عرض الكل</Link>}>
          {applications.data?.length ? (
            <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
              {applications.data.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate">{a.opportunity?.title}</span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">لا توجد طلبات بعد.</p>
          )}
        </Card>
      </div>
    </>
  );
}
