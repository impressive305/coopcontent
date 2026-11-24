"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, CircleAlert, Copy, Flag, History, Lightbulb, Loader2, Plus, RefreshCw, Target, Trash2, X,
} from "lucide-react";
import {
  REFLECTION_MAX, TASK_KINDS, api, currentWeekNo, tasksByKind, weekIsOver,
  type PlanSummary, type PlanTask, type PlanWeek, type TaskKind, type TrainingPlan,
} from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Empty, cx, formatDate, inputClass, useAction } from "../ui";
import { KIND_ICONS, KIND_STYLES, KindPill, ProgressRing, SOURCE_BADGES, SOURCE_LABELS, contentProgress, planMeta } from "./plan-shared";

// Local, editable copy of the plan. `key` keeps React rows stable while weeks move;
// a week's milestone lives on the week here and is folded into the plan on save.
type DraftWeek = Omit<PlanWeek, "weekNo"> & { key: string; milestone: string };
type Draft = { title: string; summary: string; goals: string[]; weeks: DraftWeek[] };
type SaveState = "saved" | "pending" | "saving" | "error";

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

const toDraft = (plan: TrainingPlan): Draft => {
  const milestones = new Map(plan.content.milestones.map((m) => [m.weekNo, m.title]));
  return {
    title: plan.content.title,
    summary: plan.content.summary,
    goals: plan.content.goals,
    weeks: plan.content.weeks.map(({ weekNo, ...w }) => ({ ...w, key: newId("w"), milestone: milestones.get(weekNo) ?? "" })),
  };
};

// What the API accepts: empty rows the student is still typing are left out, not rejected.
const toBody = (d: Draft) => ({
  title: d.title.trim() || "خطة التدريب",
  summary: d.summary.trim(),
  goals: d.goals.map((g) => g.trim()).filter(Boolean),
  weeks: d.weeks.map((w, i) => ({
    phase: w.phase.trim(),
    theme: w.theme.trim() || `الأسبوع ${i + 1}`,
    objectives: w.objectives.map((o) => o.trim()).filter(Boolean),
    tasks: w.tasks.filter((t) => t.title.trim()).map((t) => ({ ...t, title: t.title.trim(), kind: t.kind ?? "field" })),
    deliverable: w.deliverable.trim(),
    skills: w.skills.map((s) => s.trim()).filter(Boolean),
    milestone: w.milestone.trim() || undefined,
    learned: w.learned?.trim() || undefined,
  })),
});

const bare = "w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none transition hover:border-line focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10";

// A one-line text that wraps instead of being cut off; Enter does not add a new line.
function InlineText({ className, onChange, ...props }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & { onChange: (value: string) => void }) {
  return (
    <textarea
      rows={1}
      {...props}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      className={cx(bare, "field-sizing-content resize-none", className)}
    />
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") {
    return <button onClick={onRetry} className="flex items-center gap-1.5 text-xs font-medium text-red-600"><CircleAlert className="size-4" />تعذّر الحفظ، أعد المحاولة</button>;
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-subtle" role="status" aria-live="polite">
      {state === "saved" ? <><Check className="size-4 text-brand" />محفوظة</> : <><Loader2 className="size-4 animate-spin" />جارٍ الحفظ</>}
    </span>
  );
}

// An editable list of short lines (objectives, goals).
function LineList({ items, onChange, placeholder, addLabel }: { items: string[]; onChange: (items: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="group flex items-center gap-1">
          <span className="size-1.5 shrink-0 rounded-full bg-subtle/50" />
          <InlineText value={item} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} placeholder={placeholder} maxLength={500} className="text-sm leading-6" />
          <button type="button" aria-label="حذف" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded-md p-1 text-subtle opacity-0 group-hover:opacity-100 hover:text-red-600 focus:opacity-100"><X className="size-3.5" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand hover:underline"><Plus className="size-3.5" />{addLabel}</button>
    </div>
  );
}

function TaskRow({ task, onChange, onRemove }: { task: PlanTask; onChange: (t: PlanTask) => void; onRemove: () => void }) {
  const kind = task.kind ?? "field";
  return (
    <li className="group flex items-start gap-2 rounded-xl px-2 py-1 hover:bg-muted">
      <input type="checkbox" aria-label="تم الإنجاز" checked={task.done} onChange={(e) => onChange({ ...task, done: e.target.checked })} className="mt-2 size-4 shrink-0 accent-brand" />
      <InlineText value={task.title} onChange={(title) => onChange({ ...task, title })} placeholder="اكتب المهمة" maxLength={500} aria-label="المهمة" className={cx("text-sm leading-6", task.done && "text-subtle line-through")} />
      <span className="mt-1.5"><KindPill kind={kind} onClick={() => onChange({ ...task, kind: kind === "field" ? "learning" : "field" })} /></span>
      <button type="button" aria-label="حذف المهمة" onClick={onRemove} className="mt-1 rounded-md p-1 text-subtle opacity-0 group-hover:opacity-100 hover:text-red-600 focus:opacity-100"><Trash2 className="size-4" /></button>
    </li>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string, kind: TaskKind) => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TaskKind>("field");
  const add = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), kind);
    setTitle("");
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line p-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        placeholder="أضف مهمة واضغط Enter"
        maxLength={500}
        className="min-w-48 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
      />
      <div role="radiogroup" aria-label="نوع المهمة" className="flex rounded-lg bg-muted p-0.5">
        {(Object.keys(TASK_KINDS) as TaskKind[]).map((k) => {
          const Icon = KIND_ICONS[k];
          return (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cx("flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition", kind === k ? cx("ring-1", KIND_STYLES[k]) : "text-subtle")}>
              <Icon className="size-3.5" />{TASK_KINDS[k]}
            </button>
          );
        })}
      </div>
      <Button type="button" onClick={add} disabled={!title.trim()} className="px-3 py-1.5"><Plus className="size-4" />إضافة</Button>
    </div>
  );
}

function WeekPanel({
  week, index, count, current, over, onChange, onMove, onDuplicate, onRemove,
}: {
  week: DraftWeek; index: number; count: number; current: boolean; over: boolean;
  onChange: (w: DraftWeek) => void; onMove: (delta: number) => void; onDuplicate: () => void; onRemove: () => void;
}) {
  const set = <K extends keyof DraftWeek>(key: K, value: DraftWeek[K]) => onChange({ ...week, [key]: value });
  const done = week.tasks.filter((t) => t.done && t.title.trim()).length;
  const total = week.tasks.filter((t) => t.title.trim()).length;
  const [skill, setSkill] = useState("");

  return (
    <Card className="min-w-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 px-2 text-xs font-medium text-subtle">
            الأسبوع {index + 1} من {count}
            {current && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">الأسبوع الحالي</span>}
            {total > 0 && <span>· {done}/{total} مهام</span>}
          </p>
          <InlineText value={week.theme} onChange={(v) => set("theme", v)} placeholder="عنوان الأسبوع" maxLength={200} aria-label="عنوان الأسبوع" className="text-xl font-bold" />
          <input value={week.phase} onChange={(e) => set("phase", e.target.value)} placeholder="المرحلة (اختياري)، مثل: التهيئة" maxLength={100} aria-label="المرحلة" list="plan-phases" className={cx(bare, "mt-1 text-sm text-subtle")} />
        </div>
        <div className="flex items-center rounded-xl border border-line p-0.5">
          <button type="button" aria-label="تحريك للأعلى" title="تحريك للأعلى" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"><ArrowUp className="size-4" /></button>
          <button type="button" aria-label="تحريك للأسفل" title="تحريك للأسفل" disabled={index === count - 1} onClick={() => onMove(1)} className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"><ArrowDown className="size-4" /></button>
          <button type="button" aria-label="نسخ الأسبوع" title="نسخ الأسبوع" disabled={count >= 52} onClick={onDuplicate} className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"><Copy className="size-4" /></button>
          <button type="button" aria-label="حذف الأسبوع" title="حذف الأسبوع" disabled={count === 1} onClick={onRemove} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <section>
        <h3 className="mb-2 px-2 text-sm font-semibold">المهام</h3>
        {week.tasks.length === 0 && <p className="px-2 py-2 text-sm text-subtle">لا توجد مهام بعد. أضف أول مهمة لهذا الأسبوع.</p>}
        <ul className="space-y-0.5">
          {week.tasks.map((t, i) => (
            <TaskRow key={t.id} task={t} onChange={(task) => set("tasks", week.tasks.map((x, j) => (j === i ? task : x)))} onRemove={() => set("tasks", week.tasks.filter((_, j) => j !== i))} />
          ))}
        </ul>
        {week.tasks.length < 20 && <AddTask onAdd={(title, kind) => set("tasks", [...week.tasks, { id: newId("t"), title, done: false, kind }])} />}
      </section>

      <section className={cx("mt-8 rounded-2xl p-4", over && !week.learned?.trim() ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/20" : "bg-muted/60")}>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Lightbulb className="size-4 text-amber-600" />ماذا استفدت هذا الأسبوع؟</h3>
        <p className="mt-0.5 mb-2 text-xs text-subtle">
          {over ? "انتهى هذا الأسبوع. اكتب بإيجاز ما تعلمته أو أتقنته، وموقفاً واحداً استفدت منه." : "اكتبها عند نهاية الأسبوع: ما تعلمته، وما أتقنته، وموقف استفدت منه."}
        </p>
        <textarea
          value={week.learned ?? ""}
          onChange={(e) => set("learned", e.target.value)}
          rows={3}
          maxLength={REFLECTION_MAX}
          placeholder="مثال: تعلمت إدارة تذاكر الدعم في ServiceNow، وفهمت كيف يُصعَّد البلاغ للفريق المختص."
          aria-label="ماذا استفدت هذا الأسبوع"
          className={inputClass}
        />
      </section>

      <div className="mt-8 grid gap-6 border-t border-line pt-6 md:grid-cols-2">
        <section>
          <h3 className="mb-2 px-2 text-sm font-semibold">أهداف الأسبوع</h3>
          <LineList items={week.objectives} onChange={(o) => set("objectives", o)} placeholder="هدف" addLabel="إضافة هدف" />
        </section>
        <section className="space-y-5">
          <div>
            <h3 className="mb-1 px-2 text-sm font-semibold">المخرَج المتوقع</h3>
            <input value={week.deliverable} onChange={(e) => set("deliverable", e.target.value)} placeholder="ما الذي ستسلّمه نهاية الأسبوع؟" maxLength={500} className={cx(bare, "text-sm")} />
          </div>
          <div>
            <h3 className="mb-2 px-2 text-sm font-semibold">المهارات</h3>
            <div className="flex flex-wrap items-center gap-1.5 px-2">
              {week.skills.map((s, i) => (
                <span key={`${s}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                  {s}
                  <button type="button" aria-label={`حذف ${s}`} onClick={() => set("skills", week.skills.filter((_, j) => j !== i))} className="text-subtle hover:text-red-600"><X className="size-3" /></button>
                </span>
              ))}
              {week.skills.length < 10 && (
                <input
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && skill.trim()) { e.preventDefault(); set("skills", [...week.skills, skill.trim()]); setSkill(""); }
                  }}
                  placeholder="+ مهارة"
                  maxLength={100}
                  className="w-24 bg-transparent py-1 text-xs outline-none"
                />
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-1 flex items-center gap-1.5 px-2 text-sm font-semibold"><Flag className="size-4 text-amber-600" />معلَم هذا الأسبوع</h3>
            <input value={week.milestone} onChange={(e) => set("milestone", e.target.value)} placeholder="اختياري، مثل: عرض المشروع على الفريق" maxLength={200} className={cx(bare, "text-sm")} />
          </div>
        </section>
      </div>
    </Card>
  );
}

function WeekNavigator({ weeks, selected, current, startDate, onSelect, onAdd }: { weeks: DraftWeek[]; selected: number; current: number; startDate: string | null; onSelect: (i: number) => void; onAdd: () => void }) {
  return (
    <nav aria-label="أسابيع الخطة" className="min-w-0 lg:sticky lg:top-24">
      <ol className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[calc(100vh-12rem)] lg:flex-col lg:gap-1 lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
        {weeks.map((w, i) => {
          const tasks = w.tasks.filter((t) => t.title.trim());
          const done = tasks.filter((t) => t.done).length;
          const complete = tasks.length > 0 && done === tasks.length;
          const startsPhase = w.phase && (i === 0 || weeks[i - 1].phase !== w.phase);
          return (
            <li key={w.key} className="shrink-0 lg:shrink">
              {startsPhase && <p className="mt-3 mb-1 hidden px-3 text-[11px] font-semibold text-subtle lg:block">{w.phase}</p>}
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={i === selected ? "true" : undefined}
                className={cx(
                  "flex w-44 items-center gap-3 rounded-xl px-3 py-2 text-start transition lg:w-full",
                  i === selected ? "bg-surface shadow-sm ring-1 ring-line" : "hover:bg-surface/60",
                )}
              >
                <span className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold",
                  complete ? "bg-brand text-white" : i + 1 === current ? "bg-brand-soft text-brand ring-1 ring-brand/40" : "bg-muted text-subtle",
                )}>
                  {complete ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-sm", i === selected && "font-semibold")}>{w.theme || `الأسبوع ${i + 1}`}</span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-brand" style={{ width: tasks.length ? `${(done / tasks.length) * 100}%` : "0%" }} />
                  </span>
                </span>
                {w.milestone.trim() && <Flag className="size-3.5 shrink-0 text-amber-600" />}
                {!w.learned?.trim() && weekIsOver({ weekNo: i + 1, tasks }, startDate, current) && (
                  <span title="لم تكتب ما استفدته من هذا الأسبوع" className="size-2 shrink-0 rounded-full bg-amber-500"><span className="sr-only">بانتظار ما استفدته</span></span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onAdd} disabled={weeks.length >= 52} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-sm font-medium text-subtle hover:border-brand hover:text-brand disabled:opacity-50">
        <Plus className="size-4" />إضافة أسبوع
      </button>
    </nav>
  );
}

function PreviousPlans({ currentId, onActivated }: { currentId: number; onActivated: (plan: TrainingPlan) => void }) {
  const { data, reload } = useData<PlanSummary[]>(`/plans?current=${currentId}`);
  const action = useAction();
  const others = data?.filter((p) => p.id !== currentId) ?? [];
  const activate = (id: number) => action.run(async () => onActivated(await api<TrainingPlan>(`/plans/${id}/activate`, { method: "PATCH" })));
  const remove = (id: number) => {
    if (!window.confirm("حذف هذه الخطة نهائياً؟ لا يمكن التراجع عن ذلك.")) return;
    action.run(() => api(`/plans/${id}`, { method: "DELETE" })).then((ok) => { if (ok) reload(); });
  };
  return (
    <Card title="الخطط السابقة" description="تُحفظ كل خطة أنشأتها، ويمكنك العودة إلى أي منها.">
      <Alert>{action.error}</Alert>
      {data && others.length === 0 && <Empty>لا توجد خطط سابقة.</Empty>}
      <ul className="divide-y divide-line text-sm">
        {others.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span>
              <span className="font-medium">{p.focus ?? "خطة تدريب"}</span>
              <span className="block text-xs text-subtle">{p.durationWeeks} أسبوعاً · {SOURCE_LABELS[p.source]} · {formatDate(p.createdAt)}</span>
            </span>
            <span className="flex gap-2">
              <Button variant="secondary" disabled={action.busy} onClick={() => activate(p.id)}>اعتمادها</Button>
              <Button variant="ghost" aria-label="حذف الخطة" disabled={action.busy} onClick={() => remove(p.id)} className="text-red-600"><Trash2 className="size-4" /></Button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PlanWorkspace({ plan, onReplace, onNew }: { plan: TrainingPlan; onReplace: (plan: TrainingPlan) => void; onNew: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(plan));
  const [tab, setTab] = useState<"weeks" | "overview">("weeks");
  const [showHistory, setShowHistory] = useState(false);
  const [selected, setSelected] = useState(() => currentWeekNo(plan) - 1);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const latest = useRef(draft);
  const dirty = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  // Saves run one after another, each sending the newest draft, so a slow
  // save can never land after (and overwrite) a newer one.
  const save = useCallback(() => {
    queue.current = queue.current.then(async () => {
      setSaveState("saving");
      try {
        await api<TrainingPlan>(`/plans/${plan.id}`, { method: "PUT", body: toBody(latest.current) });
        // Newer edits may have arrived while saving; they get their own save.
        if (dirty.current) return;
        setSaveState("saved");
        setSaveError(null);
      } catch (e) {
        setSaveState("error");
        setSaveError((e as Error).message);
      }
    });
  }, [plan.id]);

  // Autosave: every change restarts a short timer, so typing saves once it pauses.
  useEffect(() => {
    if (!dirty.current) return;
    const id = setTimeout(() => { dirty.current = false; save(); }, 800);
    return () => clearTimeout(id);
  }, [draft, save]);

  // Warn before leaving with edits not yet saved.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => { if (saveState !== "saved") e.preventDefault(); };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [saveState]);

  const update = (next: Draft) => {
    latest.current = next;
    dirty.current = true;
    setSaveState("pending");
    setDraft(next);
  };
  const setWeeks = (weeks: DraftWeek[]) => update({ ...draft, weeks });
  const weekIndex = Math.min(selected, draft.weeks.length - 1);

  const move = (i: number, delta: number) => {
    const next = [...draft.weeks];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    setWeeks(next);
    setSelected(i + delta);
  };
  const insertAt = (i: number, week: DraftWeek) => {
    setWeeks([...draft.weeks.slice(0, i), week, ...draft.weeks.slice(i)]);
    setSelected(i);
  };
  const remove = (i: number) => {
    if (!window.confirm(`حذف الأسبوع ${i + 1} ومهامه؟`)) return;
    setWeeks(draft.weeks.filter((_, j) => j !== i));
    setSelected(Math.max(0, i - 1));
  };

  const content = { weeks: draft.weeks.map((w, i) => ({ ...w, weekNo: i + 1 })) };
  // Follows the draft, so added or removed weeks and ticked tasks show immediately.
  const current = currentWeekNo({ ...plan, content: { ...plan.content, ...content } });
  const progress = contentProgress(content);
  const kinds = tasksByKind({ ...plan.content, ...content });
  const kindTotal = kinds.field + kinds.learning;
  const badge = SOURCE_BADGES[plan.source];
  const phases = [...new Set(draft.weeks.map((w) => w.phase.trim()).filter(Boolean))];
  const milestones = draft.weeks.flatMap((w, i) => (w.milestone.trim() ? [{ weekNo: i + 1, title: w.milestone }] : []));

  return (
    <>
      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <ProgressRing percent={progress.percent} size="size-20" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", badge.className)}><badge.icon className="size-3.5" />{badge.label}</span>
              <SaveIndicator state={saveState} onRetry={() => { dirty.current = false; save(); }} />
            </div>
            <InlineText value={draft.title} onChange={(title) => update({ ...draft, title })} aria-label="عنوان الخطة" maxLength={200} className="-mx-2 text-xl font-bold sm:text-2xl" />
            <div className="flex flex-wrap gap-1.5">
              {planMeta(plan, draft.weeks.length).map((m) => <span key={m} className="rounded-full bg-muted px-2.5 py-1 text-xs text-subtle">{m}</span>)}
              {plan.startDate && <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-subtle">يبدأ {formatDate(plan.startDate)}</span>}
            </div>
            <p className="text-sm text-subtle">{progress.done} من {progress.total} مهمة منجزة · الأسبوع الحالي {current} من {draft.weeks.length}</p>
          </div>
          <div className="flex gap-2 self-start">
            <Button variant="secondary" onClick={() => setShowHistory(!showHistory)}><History className="size-4" />الخطط السابقة</Button>
            <Button variant="secondary" onClick={onNew}><RefreshCw className="size-4" />خطة جديدة</Button>
          </div>
        </div>
        {saveError && saveState === "error" && <div className="mt-4"><Alert>{saveError}</Alert></div>}
        {plan.notice && <div className="mt-4"><Alert tone="amber">{plan.notice}</Alert></div>}
        {kindTotal > 0 && (
          <div className="mt-5 space-y-2 border-t border-line pt-5">
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div className="bg-brand" style={{ width: `${(kinds.field / kindTotal) * 100}%` }} />
              <div className="bg-violet-400" style={{ width: `${(kinds.learning / kindTotal) * 100}%` }} />
            </div>
            <p className="flex flex-wrap gap-x-5 text-xs text-subtle">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand" />{TASK_KINDS.field}: {kinds.field} مهمة ({Math.round((kinds.field / kindTotal) * 100)}%)</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet-400" />{TASK_KINDS.learning}: {kinds.learning} مهمة ({Math.round((kinds.learning / kindTotal) * 100)}%)</span>
            </p>
          </div>
        )}
      </Card>

      {showHistory && <PreviousPlans currentId={plan.id} onActivated={(p) => { setShowHistory(false); onReplace(p); }} />}

      <div role="tablist" className="inline-flex gap-1 rounded-xl bg-muted p-1 text-sm">
        {([["weeks", "الأسابيع"], ["overview", "الأهداف والمعالم"]] as const).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cx("rounded-lg px-4 py-2", tab === key ? "bg-surface font-semibold shadow-sm" : "text-subtle")}>{label}</button>
        ))}
      </div>

      <datalist id="plan-phases">{phases.map((p) => <option key={p} value={p} />)}</datalist>

      {tab === "weeks" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <WeekNavigator
            weeks={draft.weeks}
            selected={weekIndex}
            current={current}
            startDate={plan.startDate}
            onSelect={setSelected}
            onAdd={() => insertAt(draft.weeks.length, { key: newId("w"), phase: draft.weeks.at(-1)?.phase ?? "", theme: "", objectives: [], tasks: [], deliverable: "", skills: [], milestone: "" })}
          />
          <WeekPanel
            key={draft.weeks[weekIndex].key}
            week={draft.weeks[weekIndex]}
            index={weekIndex}
            count={draft.weeks.length}
            current={weekIndex + 1 === current}
            over={weekIsOver({ ...draft.weeks[weekIndex], weekNo: weekIndex + 1, tasks: draft.weeks[weekIndex].tasks.filter((t) => t.title.trim()) }, plan.startDate, current)}
            onChange={(w) => setWeeks(draft.weeks.map((x, j) => (j === weekIndex ? w : x)))}
            onMove={(delta) => move(weekIndex, delta)}
            onDuplicate={() => {
              const w = draft.weeks[weekIndex];
              insertAt(weekIndex + 1, { ...w, key: newId("w"), milestone: "", learned: undefined, tasks: w.tasks.map((t) => ({ ...t, id: newId("t"), done: false })) });
            }}
            onRemove={() => remove(weekIndex)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title={<span className="flex items-center gap-2"><Target className="size-5 text-brand" />نبذة وأهداف التدريب</span>}>
            <label className="mb-5 block text-sm">
              <span className="mb-1.5 block font-medium">نبذة عن الخطة</span>
              <textarea value={draft.summary} onChange={(e) => update({ ...draft, summary: e.target.value })} rows={4} maxLength={2000} placeholder="فقرة قصيرة تصف تدريبك وما ستركّز عليه" className={inputClass} />
            </label>
            <p className="mb-2 text-sm font-medium">الأهداف</p>
            <LineList items={draft.goals} onChange={(goals) => update({ ...draft, goals })} placeholder="هدف قابل للقياس" addLabel="إضافة هدف" />
          </Card>
          <div className="space-y-6">
            <Card title="المعالم الرئيسية" description="حدّد معلَم أي أسبوع من صفحته في تبويب الأسابيع.">
              {milestones.length === 0 && <Empty>لا توجد معالم بعد.</Empty>}
              <ol className="relative space-y-5 border-s-2 border-line ps-6">
                {milestones.map((m) => (
                  <li key={m.weekNo} className="relative">
                    <span className={cx("absolute -start-[31px] top-1 size-3.5 rounded-full border-2 border-surface", m.weekNo <= current ? "bg-brand" : "bg-line")} />
                    <button type="button" onClick={() => { setSelected(m.weekNo - 1); setTab("weeks"); }} className="text-start">
                      <span className="block text-xs text-subtle">الأسبوع {m.weekNo}</span>
                      <span className="block text-sm font-semibold hover:text-brand">{m.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </Card>
            {plan.content.evaluation.length > 0 && (
              <Card title="معايير التقييم المقترحة">
                <ul className="space-y-4">
                  {plan.content.evaluation.map((e) => (
                    <li key={e.criterion} className="text-sm">
                      <div className="mb-1 flex justify-between gap-3"><span>{e.criterion}</span><span className="font-semibold">{e.weight}%</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${e.weight}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
