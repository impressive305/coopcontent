"use client";

import { useState } from "react";
import { api, type Report } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Empty, Field, StatusBadge, formValues, formatDate, useAction } from "./ui";

const reportBody = (v: Record<string, string>) => ({
  tasks: v.tasks,
  hours: Number(v.hours),
  skills: v.skills,
  challenges: v.challenges || undefined,
});

function ReportFields({ report }: { report?: Report }) {
  return (
    <>
      <Field label="المهام المنجزة" name="tasks" textarea required minLength={10} defaultValue={report?.tasks} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="عدد الساعات" name="hours" type="number" min={0} max={80} required defaultValue={report?.hours} />
        <Field label="المهارات المكتسبة" name="skills" required minLength={3} defaultValue={report?.skills} />
      </div>
      <Field label="التحديات (اختياري)" name="challenges" textarea defaultValue={report?.challenges ?? ""} />
    </>
  );
}

export function SubmitReportForm({ placementId, onDone }: { placementId: number; onDone: () => void }) {
  const [type, setType] = useState<"WEEKLY" | "FINAL">("WEEKLY");
  const { busy, error, run } = useAction();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    const body = { type, ...reportBody(v), ...(type === "WEEKLY" ? { weekNo: Number(v.weekNo) } : {}) };
    if (await run(() => api(`/placements/${placementId}/reports`, { method: "POST", body }))) {
      form.reset();
      onDone();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-dashed border-black/15 p-4 dark:border-white/20">
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">نوع التقرير</span>
          <select value={type} onChange={(e) => setType(e.target.value as "WEEKLY" | "FINAL")} className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20">
            <option value="WEEKLY">أسبوعي</option>
            <option value="FINAL">نهائي</option>
          </select>
        </label>
        {type === "WEEKLY" && <div className="w-32"><Field label="رقم الأسبوع" name="weekNo" type="number" min={1} max={52} required /></div>}
      </div>
      <ReportFields />
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
      <Field label="ملاحظات المشرف (مطلوبة عند الإعادة)" textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <Alert>{error}</Alert>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => review("APPROVED")}>اعتماد</Button>
        <Button variant="danger" disabled={busy} onClick={() => review("RETURNED")}>إعادة للتعديل</Button>
      </div>
    </div>
  );
}

export function ReportsList({ placementId, mode, onChange }: { placementId: number; mode: "student" | "supervisor" | "readonly"; onChange?: () => void }) {
  const { data: reports, error, reload } = useData<Report[]>(`/placements/${placementId}/reports`);
  const done = () => { reload(); onChange?.(); };

  return (
    <div className="space-y-3">
      <Alert>{error}</Alert>
      {reports?.length === 0 && <Empty>لا توجد تقارير بعد.</Empty>}
      {reports?.map((r) => (
        <details key={r.id} className="rounded-lg border border-black/10 p-3 dark:border-white/10" open={(mode === "student" && r.status === "RETURNED") || (mode === "supervisor" && r.status === "SUBMITTED")}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{r.type === "FINAL" ? "التقرير النهائي" : `الأسبوع ${r.weekNo}`}</span>
            <StatusBadge status={r.status} />
            <span className="text-gray-500">{r.hours} ساعة · {formatDate(r.submittedAt)}</span>
          </summary>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="font-medium">المهام</dt><dd className="whitespace-pre-line text-gray-700 dark:text-gray-300">{r.tasks}</dd></div>
            <div><dt className="font-medium">المهارات</dt><dd className="text-gray-700 dark:text-gray-300">{r.skills}</dd></div>
            {r.challenges && <div><dt className="font-medium">التحديات</dt><dd className="text-gray-700 dark:text-gray-300">{r.challenges}</dd></div>}
            {r.feedback && <div><dt className="font-medium">ملاحظات المشرف</dt><dd className="text-gray-700 dark:text-gray-300">{r.feedback}</dd></div>}
          </dl>
          {mode === "student" && r.status === "RETURNED" && <ReviseForm report={r} onDone={done} />}
          {mode === "supervisor" && r.status === "SUBMITTED" && <ReviewForm report={r} onDone={done} />}
        </details>
      ))}
      {mode === "student" && <SubmitReportForm placementId={placementId} onDone={done} />}
    </div>
  );
}
