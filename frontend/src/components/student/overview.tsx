"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Briefcase, CalendarCheck, Check, ClipboardList, FileText, Flag, Lightbulb } from "lucide-react";
import {
  REFLECTION_MAX, REFLECTION_MIN, api, currentWeekNo, placementTitle, planProgress, weeksAwaitingReflection,
  type Application, type Placement, type Report, type TrainingPlan,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/use-data";
import { TaskItem } from "./plan-shared";
import { Alert, Button, Card, StatusBadge, cx, formatDate, inputClass, useAction } from "../ui";

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Briefcase; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-subtle">{label}</span>
        <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-[18px]" /></span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-subtle">{hint}</p>}
    </div>
  );
}

type Step = { done: boolean; title: string; text: string; href: string; cta: string };

// The co-op journey in order; the first unfinished step is the student's next move.
function NextSteps({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);
  return (
    <Card title="رحلتك في التدريب التعاوني" description={done === steps.length ? "أكملت كل الخطوات، استمر في رفع تقاريرك أسبوعياً." : `أنجزت ${done} من ${steps.length} خطوات`}>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.title} className={cx("flex items-center gap-4 rounded-xl p-3", i === next && "bg-brand-soft")}>
            <span className={cx("grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold", s.done ? "bg-brand text-white" : i === next ? "bg-surface text-brand ring-2 ring-brand" : "bg-muted text-subtle")}>
              {s.done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx("block text-sm font-semibold", s.done && "text-subtle line-through decoration-1")}>{s.title}</span>
              {i === next && <span className="mt-0.5 block text-xs leading-5 text-subtle">{s.text}</span>}
            </span>
            {i === next && (
              <Link href={s.href} className="flex shrink-0 items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark">
                {s.cta}<ArrowLeft className="size-3.5" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

// Asks for what the student learned in the most recent finished week they have not written up.
function WeeklyReflection({ plan, onChange }: { plan: TrainingPlan; onChange: () => void }) {
  const pending = weeksAwaitingReflection(plan);
  const week = pending[0];
  const [learned, setLearned] = useState("");
  const action = useAction();
  if (!week) return null;
  const save = () =>
    action.run(() => api(`/plans/${plan.id}/weeks/${week.weekNo}/reflection`, { method: "PUT", body: { learned: learned.trim() } }))
      .then((ok) => { if (ok) { setLearned(""); onChange(); } });

  return (
    <Card
      className="border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10"
      title={<span className="flex items-center gap-2"><Lightbulb className="size-5 text-amber-600" />ماذا استفدت في الأسبوع {week.weekNo}؟</span>}
      description={`${week.theme}${pending.length > 1 ? ` · ولديك ${pending.length - 1} أسابيع أخرى منتهية بانتظار ما استفدته` : ""}`}
    >
      <textarea
        value={learned}
        onChange={(e) => setLearned(e.target.value)}
        rows={3}
        maxLength={REFLECTION_MAX}
        aria-label={`ماذا استفدت في الأسبوع ${week.weekNo}`}
        placeholder="ما تعلمته أو أتقنته هذا الأسبوع، وموقف واحد استفدت منه."
        className={inputClass}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button disabled={action.busy || learned.trim().length < REFLECTION_MIN} onClick={save}>حفظ</Button>
        {pending.length > 1 && <Link href="/dashboard/plan" className="text-sm text-brand hover:underline">بقية الأسابيع في صفحة الخطة</Link>}
      </div>
      <div className="mt-3"><Alert>{action.error}</Alert></div>
    </Card>
  );
}

function ThisWeek({ plan, onChange }: { plan: TrainingPlan; onChange: () => void }) {
  const action = useAction();
  const weekNo = currentWeekNo(plan);
  const week = plan.content.weeks[weekNo - 1];
  const nextMilestone = plan.content.milestones.find((m) => m.weekNo >= weekNo);
  const toggle = (taskId: string, done: boolean) =>
    action.run(async () => { await api(`/plans/${plan.id}/tasks/${taskId}`, { method: "PATCH", body: { done } }); onChange(); });

  return (
    <Card
      title={`هذا الأسبوع: ${week.theme}`}
      description={`الأسبوع ${week.weekNo} من ${plan.durationWeeks}${week.phase ? ` · ${week.phase}` : ""}`}
      actions={<Link href="/dashboard/plan" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">الخطة كاملة <ArrowLeft className="size-4" /></Link>}
    >
      {week.tasks.length === 0 && <p className="text-sm text-subtle">لا توجد مهام لهذا الأسبوع بعد. أضفها من صفحة الخطة.</p>}
      <ul className="space-y-1">
        {week.tasks.map((t) => <TaskItem key={t.id} task={t} busy={action.busy} onToggle={toggle} />)}
      </ul>
      <Alert>{action.error}</Alert>
      {(week.deliverable || nextMilestone) && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
          {week.deliverable && <span><span className="text-subtle">المخرَج: </span>{week.deliverable}</span>}
          {nextMilestone && <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><Flag className="size-4" />الأسبوع {nextMilestone.weekNo}: {nextMilestone.title}</span>}
        </div>
      )}
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
  const student = user?.student;

  const progress = plan ? planProgress(plan.content) : null;
  const approved = reports.data?.filter((r) => r.status === "APPROVED").length ?? 0;
  const returned = reports.data?.filter((r) => r.status === "RETURNED").length ?? 0;
  const weekNo = plan ? currentWeekNo(plan) : null;

  const steps: Step[] = [
    { done: !!student?.skills.length, title: "أكمل ملفك الشخصي", text: "أضف مهاراتك الحالية ليخصّص المساعد خطتك ويتجنب ما تتقنه.", href: "/dashboard/profile", cta: "الملف الشخصي" },
    { done: !!placement || !!applications.data?.length, title: "اختر جهة التدريب وقدّم عليها", text: "تصفّح الجهات التي تفتح التدريب التعاوني وقدّم من صفحاتها الرسمية.", href: "/dashboard/opportunities", cta: "تصفّح الجهات" },
    { done: !!plan, title: "ابنِ خطة تدريبك", text: "حدّد تخصصك والمجال الذي تريده، وابنِ خطتك بنفسك أو بمساعدة الذكاء الاصطناعي.", href: "/dashboard/plan", cta: "ابدأ الخطة" },
    { done: !!placement, title: "سجّل تدريبك في المنصة", text: "بعد قبولك، يُسجَّل تدريبك تلقائياً إن قُبلت عبر المنصة، أو تسجّله وحدة التدريب إن قُبلت مباشرة من الجهة.", href: "/dashboard/applications", cta: "طلباتي" },
    { done: !!reports.data?.length, title: "ارفع تقريرك الأسبوعي الأول", text: "اقرأ دليل كتابة التقارير ثم ارفع تقرير أسبوعك الأول.", href: "/dashboard/reports", cta: "التقارير" },
  ];

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-teal-700 to-teal-900 p-6 text-white sm:p-8">
        <div aria-hidden className="absolute -top-20 -left-10 size-72 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-teal-100/80">{student?.major}{student?.university && ` · ${student.university}`}</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">أهلاً، {user?.name.split(" ")[0]}</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-teal-50/90">
              {plan && weekNo
                ? `أنت في الأسبوع ${weekNo} من خطتك. ${progress!.percent >= 50 ? "تقدّم رائع، حافظ على الإيقاع." : "خطوة كل يوم تصنع فرقاً في نهاية التدريب."}`
                : "ابدأ رحلتك: اختر جهة تدريب، وابنِ خطتك، ونظّم أسابيعك."}
            </p>
          </div>
          {progress && (
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15">
              <span className="text-3xl font-bold">{progress.percent}%</span>
              <span className="text-xs leading-5 text-teal-50/80">إنجاز الخطة<br />{progress.done} من {progress.total} مهمة</span>
            </div>
          )}
        </div>
      </section>

      {returned > 0 && <Alert tone="amber">لديك {returned} تقارير أُعيدت للتعديل. <Link href="/dashboard/reports" className="font-medium underline">راجعها الآن</Link></Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Briefcase} label="حالة التدريب" value={placement ? (placement.status === "ACTIVE" ? "قيد التدريب" : "مكتمل") : "لم يبدأ"} hint={placement?.company.name ?? "لم يُسجَّل تدريب بعد"} />
        <Stat icon={CalendarCheck} label="الأسبوع الحالي" value={plan && weekNo ? `${weekNo} / ${plan.durationWeeks}` : "—"} hint={plan ? plan.content.weeks[weekNo! - 1].theme : "أنشئ خطتك أولاً"} />
        <Stat icon={ClipboardList} label="إنجاز الخطة" value={progress ? `${progress.percent}%` : "—"} hint={progress ? `${progress.done} من ${progress.total} مهمة` : undefined} />
        <Stat icon={FileText} label="التقارير المعتمدة" value={String(approved)} hint={`${reports.data?.length ?? 0} تقارير مرفوعة`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {plan && <WeeklyReflection key={plan.id} plan={plan} onChange={planData.reload} />}
          {plan && <ThisWeek plan={plan} onChange={planData.reload} />}
          <NextSteps steps={steps} />
        </div>
        <div className="space-y-6">
          <Card title="تدريبي">
            {placement ? (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-subtle">التدريب</dt><dd className="font-medium">{placementTitle(placement)}</dd></div>
                <div><dt className="text-xs text-subtle">الجهة</dt><dd>{placement.company.name}</dd></div>
                <div><dt className="text-xs text-subtle">المدة</dt><dd>{formatDate(placement.startDate)} إلى {formatDate(placement.endDate)}</dd></div>
                <div className="flex items-center justify-between"><dt className="text-xs text-subtle">الحالة</dt><dd><StatusBadge status={placement.status} /></dd></div>
              </dl>
            ) : (
              <p className="text-sm leading-6 text-subtle">لم يُسجَّل لك تدريب بعد. بعد قبولك في جهة، يظهر تدريبك هنا وتبدأ برفع التقارير.</p>
            )}
          </Card>
          <Link href="/dashboard/reports" className="block rounded-2xl border border-amber-200 bg-amber-50 p-5 transition hover:border-amber-300 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200"><Lightbulb className="size-4" />نصيحة</p>
            <p className="mt-2 text-sm leading-6 text-amber-900/80 dark:text-amber-100/80">دوّن ما أنجزته في نهاية كل يوم في سطرين. عند كتابة التقرير الأسبوعي ستجد كل شيء جاهزاً.</p>
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300">دليل كتابة التقارير <ArrowLeft className="size-3.5" /></p>
          </Link>
          {!!applications.data?.length && (
            <Card title="آخر الطلبات" actions={<Link href="/dashboard/applications" className="text-sm text-brand hover:underline">الكل</Link>}>
              <ul className="divide-y divide-line text-sm">
                {applications.data.slice(0, 3).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate">{a.opportunity?.title}</span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
