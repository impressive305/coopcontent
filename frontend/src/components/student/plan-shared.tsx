"use client";

import { BookOpen, Briefcase, Bot, Cpu, PencilRuler } from "lucide-react";
import { TASK_KINDS, type PlanContent, type PlanTask, type TaskKind, type TrainingPlan } from "@/lib/api";
import { cx } from "../ui";

export const KIND_STYLES: Record<TaskKind, string> = {
  field: "bg-teal-50 text-teal-800 ring-teal-600/15 dark:bg-teal-500/15 dark:text-teal-100 dark:ring-teal-400/20",
  learning: "bg-sky-50 text-sky-800 ring-sky-600/15 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/20",
};

export const KIND_ICONS = { field: Briefcase, learning: BookOpen } as const;

export const SOURCE_BADGES = {
  AI: { icon: Bot, label: "مسودة بالذكاء الاصطناعي", className: "bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-100" },
  ENGINE: { icon: Cpu, label: "مسودة جاهزة", className: "bg-muted text-subtle" },
  MANUAL: { icon: PencilRuler, label: "من إعدادك", className: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-100" },
} as const;

export const SOURCE_LABELS = { AI: "ذكاء اصطناعي", ENGINE: "مسودة جاهزة", MANUAL: "من إعدادك" } as const;

export function KindPill({ kind, onClick }: { kind: TaskKind; onClick?: () => void }) {
  const Icon = KIND_ICONS[kind];
  const className = cx("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", KIND_STYLES[kind]);
  if (!onClick) return <span className={className}><Icon className="size-3" />{TASK_KINDS[kind]}</span>;
  return (
    <button type="button" onClick={onClick} title="انقر لتغيير نوع المهمة" className={cx(className, "transition hover:opacity-80")}>
      <Icon className="size-3" />{TASK_KINDS[kind]}
    </button>
  );
}

// Read-only task row with a done checkbox, used on the overview.
export function TaskItem({ task, busy, onToggle }: { task: PlanTask; busy: boolean; onToggle: (taskId: string, done: boolean) => void }) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 text-sm hover:bg-muted">
        <input type="checkbox" checked={task.done} disabled={busy} onChange={(e) => onToggle(task.id, e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-teal-700" />
        <span className={cx("flex-1 leading-6", task.done && "text-subtle line-through")}>{task.title}</span>
        <KindPill kind={task.kind ?? "field"} />
      </label>
    </li>
  );
}

export function ProgressRing({ percent, size = "size-16" }: { percent: number; size?: string }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className={cx("relative shrink-0", size)} role="img" aria-label={`نسبة الإنجاز ${percent}%`}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} className="text-brand transition-all" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold">{percent}%</span>
    </div>
  );
}

export const planMeta = (plan: TrainingPlan, weeks: number) =>
  [plan.major, plan.focus, plan.sector, `${weeks} أسبوعاً`, `${plan.hoursPerWeek} ساعة أسبوعياً`].filter(Boolean) as string[];

export const contentProgress = (c: Pick<PlanContent, "weeks">) => {
  const tasks = c.weeks.flatMap((w) => w.tasks);
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
};
