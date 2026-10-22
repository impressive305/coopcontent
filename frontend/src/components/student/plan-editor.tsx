"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, Briefcase, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { api, TASK_KINDS, type PlanTask, type PlanWeek, type TaskKind, type TrainingPlan } from "@/lib/api";
import { Alert, Button, Card, Field, cx, useAction } from "../ui";

// Editor-only fields: a stable React key and the week's milestone (stored on the plan, not the week).
type DraftWeek = Omit<PlanWeek, "weekNo"> & { key: string; milestone: string };

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
const commaList = (text: string) => text.split(/[,،]/).map((s) => s.trim()).filter(Boolean);

const blankWeek = (phase = ""): DraftWeek => ({
  key: newId("w"),
  phase,
  theme: "",
  objectives: [],
  tasks: [],
  deliverable: "",
  skills: [],
  milestone: "",
});

export const KIND_STYLES: Record<TaskKind, string> = {
  field: "bg-teal-50 text-teal-800 dark:bg-teal-500/15 dark:text-teal-100",
  learning: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
};

export const KIND_ICONS = { field: Briefcase, learning: BookOpen } as const;

const smallInput = "w-full rounded-lg border border-black/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/20";

function IconButton({ label, onClick, disabled, children, danger }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx("rounded-lg p-1.5 disabled:opacity-30", danger ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" : "hover:bg-black/5 dark:hover:bg-white/10")}
    >
      {children}
    </button>
  );
}

function TaskRow({ task, onChange, onRemove }: { task: PlanTask; onChange: (t: PlanTask) => void; onRemove: () => void }) {
  const kind = task.kind ?? "field";
  return (
    <li className="flex items-center gap-2">
      <select
        aria-label="نوع المهمة"
        value={kind}
        onChange={(e) => onChange({ ...task, kind: e.target.value as TaskKind })}
        className={cx("shrink-0 rounded-lg border-0 px-2 py-1.5 text-xs font-medium", KIND_STYLES[kind])}
      >
        {Object.entries(TASK_KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <input aria-label="عنوان المهمة" value={task.title} onChange={(e) => onChange({ ...task, title: e.target.value })} placeholder="اكتب المهمة" maxLength={500} className={smallInput} />
      <IconButton label="حذف المهمة" onClick={onRemove} danger><Trash2 className="size-4" /></IconButton>
    </li>
  );
}

function WeekEditor({
  week, index, count, phases, open, onToggle, onChange, onMove, onDuplicate, onRemove,
}: {
  week: DraftWeek; index: number; count: number; phases: string[]; open: boolean;
  onToggle: () => void; onChange: (w: DraftWeek) => void; onMove: (delta: number) => void; onDuplicate: () => void; onRemove: () => void;
}) {
  const set = <K extends keyof DraftWeek>(key: K, value: DraftWeek[K]) => onChange({ ...week, [key]: value });
  const setTask = (i: number, task: PlanTask) => set("tasks", week.tasks.map((t, j) => (j === i ? task : t)));
  const addTask = (kind: TaskKind) => set("tasks", [...week.tasks, { id: newId("t"), title: "", done: false, kind }]);

  return (
    <div className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-start">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-sm font-bold dark:bg-white/10">{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{week.theme || <span className="text-gray-400">أسبوع بلا عنوان</span>}</span>
            <span className="text-xs text-gray-500">{week.phase && `${week.phase} · `}{week.tasks.length} مهام</span>
          </span>
          <ChevronDown className={cx("ms-auto size-5 shrink-0 text-gray-400 transition", open && "rotate-180")} />
        </button>
        <div className="flex shrink-0 items-center">
          <IconButton label="تحريك لأعلى" onClick={() => onMove(-1)} disabled={index === 0}><ArrowUp className="size-4" /></IconButton>
          <IconButton label="تحريك لأسفل" onClick={() => onMove(1)} disabled={index === count - 1}><ArrowDown className="size-4" /></IconButton>
          <IconButton label="نسخ الأسبوع" onClick={onDuplicate} disabled={count >= 52}><Copy className="size-4" /></IconButton>
          <IconButton label="حذف الأسبوع" onClick={onRemove} disabled={count === 1} danger><Trash2 className="size-4" /></IconButton>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-black/5 p-4 dark:border-white/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="عنوان الأسبوع" value={week.theme} onChange={(e) => set("theme", e.target.value)} required maxLength={200} placeholder="مثال: التعرف على بيئة العمل" />
            <Field label="المرحلة (اختياري)" value={week.phase} onChange={(e) => set("phase", e.target.value)} maxLength={100} list="plan-phases" placeholder="مثال: التهيئة" />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">المهام</p>
            {week.tasks.length > 0 && (
              <ul className="mb-2 space-y-2">
                {week.tasks.map((t, i) => (
                  <TaskRow key={t.id} task={t} onChange={(task) => setTask(i, task)} onRemove={() => set("tasks", week.tasks.filter((_, j) => j !== i))} />
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TASK_KINDS) as TaskKind[]).map((kind) => {
                const Icon = KIND_ICONS[kind];
                return (
                  <button key={kind} type="button" disabled={week.tasks.length >= 20} onClick={() => addTask(kind)} className={cx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50", KIND_STYLES[kind])}>
                    <Plus className="size-3.5" /><Icon className="size-3.5" />{TASK_KINDS[kind]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="أهداف الأسبوع (هدف في كل سطر)" textarea value={week.objectives.join("\n")} onChange={(e) => set("objectives", e.target.value.split("\n"))} />
            <div className="space-y-3">
              <Field label="المخرَج المتوقع" value={week.deliverable} onChange={(e) => set("deliverable", e.target.value)} maxLength={500} />
              <Field label="المهارات (مفصولة بفواصل)" value={week.skills.join("، ")} onChange={(e) => set("skills", e.target.value.split(/[,،]\s*/))} />
            </div>
          </div>
          <Field label="معلَم هذا الأسبوع (اختياري)" value={week.milestone} onChange={(e) => set("milestone", e.target.value)} maxLength={200} placeholder="مثال: عرض المشروع على الفريق" />
        </div>
      )}
      {/* Suggest the plan's existing phase names when typing a phase. */}
      {index === 0 && <datalist id="plan-phases">{phases.map((p) => <option key={p} value={p} />)}</datalist>}
    </div>
  );
}

export function PlanEditor({ plan, onSaved, onCancel }: { plan: TrainingPlan; onSaved: (plan: TrainingPlan) => void; onCancel: () => void }) {
  const c = plan.content;
  const milestones = new Map(c.milestones.map((m) => [m.weekNo, m.title]));
  const [title, setTitle] = useState(c.title);
  const [summary, setSummary] = useState(c.summary);
  const [goals, setGoals] = useState(c.goals.join("\n"));
  const [weeks, setWeeks] = useState<DraftWeek[]>(() =>
    c.weeks.map(({ weekNo, ...w }) => ({ ...w, key: newId("w"), milestone: milestones.get(weekNo) ?? "" })),
  );
  // Manual plans start empty, so open their first week; otherwise start collapsed.
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(plan.source === "MANUAL" ? [weeks[0].key] : []));
  const action = useAction();

  const phases = [...new Set(weeks.map((w) => w.phase.trim()).filter(Boolean))];
  const toggleOpen = (key: string) => setOpenKeys((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const update = (i: number, w: DraftWeek) => setWeeks(weeks.map((x, j) => (j === i ? w : x)));
  const move = (i: number, delta: number) => {
    const next = [...weeks];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    setWeeks(next);
  };
  const insertAfter = (i: number, week: DraftWeek) => {
    setWeeks([...weeks.slice(0, i + 1), week, ...weeks.slice(i + 1)]);
    setOpenKeys((s) => new Set(s).add(week.key));
  };
  const duplicate = (i: number) =>
    insertAfter(i, { ...weeks[i], key: newId("w"), milestone: "", tasks: weeks[i].tasks.map((t) => ({ ...t, id: newId("t"), done: false })) });
  const addWeek = () => insertAfter(weeks.length - 1, blankWeek(weeks.at(-1)?.phase));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      title: title.trim() || "خطة التدريب",
      summary: summary.trim(),
      goals: lines(goals),
      weeks: weeks.map((w, i) => ({
        phase: w.phase.trim(),
        theme: w.theme.trim() || `الأسبوع ${i + 1}`,
        objectives: w.objectives.map((o) => o.trim()).filter(Boolean),
        // Empty task rows are dropped rather than rejected.
        tasks: w.tasks.filter((t) => t.title.trim()).map((t) => ({ ...t, title: t.title.trim(), kind: t.kind ?? "field" })),
        deliverable: w.deliverable.trim(),
        skills: commaList(w.skills.join(",")),
        milestone: w.milestone.trim() || undefined,
      })),
    };
    let saved: TrainingPlan | null = null;
    await action.run(async () => { saved = await api<TrainingPlan>(`/plans/${plan.id}`, { method: "PUT", body }); });
    if (saved) onSaved(saved);
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Card title="تعديل الخطة" actions={<span className="text-xs text-gray-500">{weeks.length} أسبوعاً</span>}>
        <div className="space-y-4">
          <Field label="عنوان الخطة" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          <Field label="نبذة عن الخطة" textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={2000} />
          <Field label="أهداف التدريب (هدف في كل سطر)" textarea value={goals} onChange={(e) => setGoals(e.target.value)} />
        </div>
      </Card>

      <div className="space-y-3">
        {weeks.map((w, i) => (
          <WeekEditor
            key={w.key}
            week={w}
            index={i}
            count={weeks.length}
            phases={phases}
            open={openKeys.has(w.key)}
            onToggle={() => toggleOpen(w.key)}
            onChange={(week) => update(i, week)}
            onMove={(delta) => move(i, delta)}
            onDuplicate={() => duplicate(i)}
            onRemove={() => setWeeks(weeks.filter((_, j) => j !== i))}
          />
        ))}
        <button
          type="button"
          onClick={addWeek}
          disabled={weeks.length >= 52}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 py-3 text-sm font-medium text-gray-600 hover:border-brand hover:text-brand disabled:opacity-50 dark:border-white/20 dark:text-gray-300"
        >
          <Plus className="size-4" />إضافة أسبوع
        </button>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-black/5 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-white/10">
        <Button type="submit" disabled={action.busy}>{action.busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={action.busy}>إلغاء</Button>
        <div className="flex-1"><Alert>{action.error}</Alert></div>
      </div>
    </form>
  );
}
