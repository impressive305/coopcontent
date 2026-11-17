"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { api, type Report, type TrainingPlan } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Empty, Field, StatusBadge, cx, formValues, formatDate, useAction } from "./ui";

const reportBody = (v: Record<string, string>) => ({
  tasks: v.tasks,
  hours: Number(v.hours),
  skills: v.skills,
  challenges: v.challenges || undefined,
});

const TASKS_HINT = "مهمة في كل سطر: ماذا فعلت، ولماذا، وما النتيجة. اذكر أرقاماً متى أمكن.";
const CHALLENGES_HINT = "تحدٍّ حقيقي وكيف تعاملت معه، ثم سطر عن خطتك للأسبوع القادم.";

function ReportFields({ report, tasks, onTasks, skills, onSkills }: { report?: Report; tasks?: string; onTasks?: (v: string) => void; skills?: string; onSkills?: (v: string) => void }) {
  const controlled = onTasks ? { value: tasks, onChange: (e: React.ChangeEvent<HTMLTextAreaElement & HTMLInputElement>) => onTasks(e.target.value) } : { defaultValue: report?.tasks };
  const controlledSkills = onSkills ? { value: skills, onChange: (e: React.ChangeEvent<HTMLTextAreaElement & HTMLInputElement>) => onSkills(e.target.value) } : { defaultValue: report?.skills };
  return (
    <>
      <Field label="المهام المنجزة" name="tasks" textarea rows={5} required minLength={10} hint={TASKS_HINT} placeholder="- عالجت 18 طلب دعم في نظام التذاكر..." {...controlled} />
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label="عدد الساعات" name="hours" type="number" min={0} max={80} required defaultValue={report?.hours} />
        <Field label="المهارات المكتسبة" name="skills" required minLength={3} placeholder="مهارات محددة، مثل: إدارة التذاكر في ServiceNow" {...controlledSkills} />
      </div>
      <Field label="التحديات وخطة الأسبوع القادم (اختياري)" name="challenges" textarea hint={CHALLENGES_HINT} defaultValue={report?.challenges ?? ""} />
    </>
  );
}

export function SubmitReportForm({ placementId, nextWeek, onDone }: { placementId: number; nextWeek: number; onDone: () => void }) {
  const [type, setType] = useState<"WEEKLY" | "FINAL">("WEEKLY");
  const [weekNo, setWeekNo] = useState(nextWeek);
  const [tasks, setTasks] = useState("");
  const [skills, setSkills] = useState("");
  const plan = useData<TrainingPlan | null>("/plans/current");
  const planWeek = plan.data?.content.weeks.find((w) => w.weekNo === weekNo);
  const { busy, error, run } = useAction();

  // Starts the report from what the plan says about this week; the student edits from there.
  const importFromPlan = () => {
    if (!planWeek) return;
    const done = planWeek.tasks.filter((t) => t.done);
    setTasks((done.length ? done : planWeek.tasks).map((t) => `- ${t.title}`).join("\n"));
    if (planWeek.skills.length) setSkills(planWeek.skills.join("، "));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    const body = { type, ...reportBody(v), ...(type === "WEEKLY" ? { weekNo } : {}) };
    if (await run(() => api(`/placements/${placementId}/reports`, { method: "POST", body }))) {
      form.reset();
      setTasks("");
      setSkills("");
      onDone();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-muted/50 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div role="radiogroup" aria-label="نوع التقرير" className="flex rounded-xl bg-surface p-1 ring-1 ring-line">
          {([["WEEKLY", "تقرير أسبوعي"], ["FINAL", "التقرير النهائي"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)} className={cx("rounded-lg px-3 py-1.5 text-sm", type === k ? "bg-brand font-medium text-white" : "text-subtle")}>{label}</button>
          ))}
        </div>
        {type === "WEEKLY" && (
          <div className="w-28"><Field label="رقم الأسبوع" type="number" min={1} max={52} required value={weekNo} onChange={(e) => setWeekNo(Number(e.target.value))} /></div>
        )}
        {type === "WEEKLY" && planWeek && (
          <Button type="button" variant="secondary" onClick={importFromPlan} title={`مهام «${planWeek.theme}» من خطتك`}><ListChecks className="size-4" />استيراد مهام الأسبوع من خطتي</Button>
        )}
      </div>
      <ReportFields tasks={tasks} onTasks={setTasks} skills={skills} onSkills={setSkills} />
      <Alert>{error}</Alert>
      <Button type="submit" disabled={busy}>رفع التقرير</Button>
    </form>
  );
}

function ReviseForm({ report, onDone }: { report: Report; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = reportBody(formValues(e.currentTarget));
    if (await run(() => api(`/reports/${report.id}`, { method: "PUT", body }))) onDone();
  };
  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3">
      <ReportFields report={report} />
      <Alert>{error}</Alert>
      <Button type="submit" disabled={busy}>إعادة الإرسال</Button>
    </form>
  );
}

function ReviewForm({ report, onDone }: { report: Report; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const [feedback, setFeedback] = useState("");
  const review = (status: "APPROVED" | "RETURNED") =>
    run(() => api(`/reports/${report.id}/review`, { method: "PATCH", body: { status, feedback: feedback || undefined } })).then((ok) => ok && onDone());
  return (
    <div className="mt-3 space-y-3">
      <Field label="ملاحظات المراجعة (مطلوبة عند الإعادة)" textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <Alert>{error}</Alert>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => review("APPROVED")}>اعتماد</Button>
        <Button variant="danger" disabled={busy} onClick={() => review("RETURNED")}>إعادة للتعديل</Button>
      </div>
    </div>
  );
}

// "reviewer" is whoever reviews reports: the admin while the supervisor role is paused.
export function ReportsList({ placementId, mode, onChange }: { placementId: number; mode: "student" | "reviewer" | "readonly"; onChange?: () => void }) {
  const { data: reports, error, reload } = useData<Report[]>(`/placements/${placementId}/reports`);
  const done = () => { reload(); onChange?.(); };

  return (
    <div className="space-y-3">
      <Alert>{error}</Alert>
      {reports?.length === 0 && <Empty>لا توجد تقارير بعد.</Empty>}
      {reports?.map((r) => (
        <details key={r.id} className="rounded-xl border border-line bg-surface p-4" open={(mode === "student" && r.status === "RETURNED") || (mode === "reviewer" && r.status === "SUBMITTED")}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{r.type === "FINAL" ? "التقرير النهائي" : `الأسبوع ${r.weekNo}`}</span>
            <StatusBadge status={r.status} />
            <span className="text-gray-500">{r.hours} ساعة · {formatDate(r.submittedAt)}</span>
          </summary>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="font-medium">المهام</dt><dd className="whitespace-pre-line text-gray-700 dark:text-gray-300">{r.tasks}</dd></div>
            <div><dt className="font-medium">المهارات</dt><dd className="text-gray-700 dark:text-gray-300">{r.skills}</dd></div>
            {r.challenges && <div><dt className="font-medium">التحديات</dt><dd className="text-gray-700 dark:text-gray-300">{r.challenges}</dd></div>}
            {r.feedback && <div><dt className="font-medium">ملاحظات المراجعة</dt><dd className="text-gray-700 dark:text-gray-300">{r.feedback}</dd></div>}
          </dl>
          {mode === "student" && r.status === "RETURNED" && <ReviseForm report={r} onDone={done} />}
          {mode === "reviewer" && r.status === "SUBMITTED" && <ReviewForm report={r} onDone={done} />}
        </details>
      ))}
      {mode === "student" && (
        <SubmitReportForm
          key={reports?.length ?? 0}
          placementId={placementId}
          nextWeek={Math.min(52, Math.max(0, ...(reports ?? []).map((r) => r.weekNo ?? 0)) + 1)}
          onDone={done}
        />
      )}
    </div>
  );
}
