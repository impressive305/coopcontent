"use client";

import { useEffect, useState } from "react";
import { Bot, Check, ChevronDown, Cpu, Flag, RefreshCw, Sparkles, Target } from "lucide-react";
import {
  api, currentWeekNo, planProgress,
  type PlanCatalog, type PlanSummary, type PlanWeek, type TrainingPlan,
} from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Field, cx, formatDate, useAction } from "../ui";

const GENERATION_STEPS = ["تحليل التخصص والمسار", "توزيع الأسابيع على المراحل", "صياغة المهام والمخرجات", "مراجعة الخطة والتحقق منها"];

function GeneratingState({ ai }: { ai: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1)), ai ? 6000 : 400);
    return () => clearInterval(id);
  }, [ai]);
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center" role="status" aria-live="polite">
      <span className="grid size-14 animate-pulse place-items-center rounded-2xl bg-teal-50 text-brand dark:bg-teal-500/15"><Bot className="size-7" /></span>
      <div>
        <p className="font-semibold">{ai ? "يبني المساعد الذكي خطتك..." : "جارٍ إنشاء الخطة..."}</p>
        {ai && <p className="text-sm text-gray-500">قد يستغرق ذلك حتى دقيقة.</p>}
      </div>
      <ol className="space-y-2 text-sm">
        {GENERATION_STEPS.map((s, i) => (
          <li key={s} className={cx("flex items-center gap-2", i > step && "text-gray-400")}>
            <span className={cx("grid size-5 place-items-center rounded-full border", i < step ? "border-brand bg-brand text-white" : i === step ? "border-brand" : "border-gray-300")}>
              {i < step && <Check className="size-3" />}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlanWizard({ onCreated, onCancel }: { onCreated: (plan: TrainingPlan) => void; onCancel?: () => void }) {
  const { data: catalog, error } = useData<PlanCatalog>("/plans/catalog");
  const [majorKey, setMajorKey] = useState<string | null>(null);
  const [trackKey, setTrackKey] = useState<string | null>(null);
  const [useAi, setUseAi] = useState(true);
  const action = useAction();

  if (!catalog) return <Card><Alert>{error}</Alert>{!error && <p className="text-sm text-gray-500">جارٍ التحميل...</p>}</Card>;

  const selectedMajor = majorKey ?? catalog.suggestedMajor ?? catalog.majors[0].key;
  const major = catalog.majors.find((m) => m.key === selectedMajor)!;
  const track = major.tracks.find((t) => t.key === trackKey) ?? major.tracks[0];
  const aiOn = useAi && catalog.aiAvailable;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const body = {
      majorKey: major.key,
      trackKey: track.key,
      durationWeeks: Number(v.durationWeeks),
      hoursPerWeek: Number(v.hoursPerWeek),
      startDate: v.startDate || undefined,
      goals: v.goals || undefined,
      useAi: aiOn,
    };
    let created: TrainingPlan | null = null;
    await action.run(async () => { created = await api<TrainingPlan>("/plans", { method: "POST", body }); });
    if (created) onCreated(created);
  };

  if (action.busy) return <Card><GeneratingState ai={aiOn} /></Card>;

  return (
    <Card
      title={<span className="flex items-center gap-2"><Sparkles className="size-5 text-brand" />إنشاء خطة تدريب</span>}
      actions={onCancel && <Button variant="secondary" onClick={onCancel}>إلغاء</Button>}
    >
      <form onSubmit={submit} className="space-y-6">
        {catalog.placement && (
          <Alert tone="green">سيتم بناء الخطة على تدريبك في {catalog.placement.company} ({catalog.placement.opportunity}).</Alert>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold">1. التخصص</p>
          <select
            value={selectedMajor}
            onChange={(e) => { setMajorKey(e.target.value); setTrackKey(null); }}
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm sm:w-80 dark:border-white/20"
          >
            {catalog.majors.map((m) => <option key={m.key} value={m.key}>{m.name} ({m.nameEn})</option>)}
          </select>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">2. المسار التدريبي</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {major.tracks.map((t) => (
              <label
                key={t.key}
                className={cx(
                  "cursor-pointer rounded-xl border p-4 transition",
                  t.key === track.key ? "border-brand bg-teal-50/60 ring-2 ring-brand/20 dark:bg-teal-500/10" : "border-black/10 hover:border-brand/50 dark:border-white/15",
                )}
              >
                <input type="radio" name="track" value={t.key} checked={t.key === track.key} onChange={() => setTrackKey(t.key)} className="sr-only" />
                <p className="mb-2 font-semibold">{t.name}</p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {t.tools.map((tool) => <span key={tool} className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] dark:bg-white/10" dir="ltr">{tool}</span>)}
                </div>
                <p className="text-xs text-gray-500">المشروع: {t.project}</p>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-semibold">3. المدة والأهداف</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="مدة التدريب (أسابيع)" name="durationWeeks" type="number" min={4} max={52} required defaultValue={catalog.placement?.durationWeeks ?? 24} />
            <Field label="ساعات العمل أسبوعياً" name="hoursPerWeek" type="number" min={10} max={48} required defaultValue={40} />
            <Field label="تاريخ البدء (اختياري)" name="startDate" type="date" defaultValue={catalog.placement?.startDate.slice(0, 10)} />
          </div>
          <div className="mt-4">
            <Field label="ماذا تريد أن تحقق من تدريبك؟ (اختياري)" name="goals" textarea maxLength={1000} placeholder="مثال: أريد التعمق في Next.js وبناء مشروع أضيفه لملفي المهني" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
          <label className={cx("flex items-start gap-3 text-sm", !catalog.aiAvailable && "opacity-60")}>
            <input type="checkbox" checked={aiOn} disabled={!catalog.aiAvailable} onChange={(e) => setUseAi(e.target.checked)} className="mt-1 size-4 accent-teal-700" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold"><Bot className="size-4 text-brand" />تخصيص الخطة بالمساعد الذكي</span>
              <span className="block text-gray-500">
                {catalog.aiAvailable
                  ? "يحسّن المساعد خطة المحرك لتناسب جهة تدريبك وأهدافك ومهاراتك."
                  : "المساعد الذكي غير مفعّل على الخادم، وستُنشأ الخطة بالمحرك المدمج."}
              </span>
            </span>
          </label>
          <Button type="submit" className="flex items-center gap-2"><Sparkles className="size-4" />إنشاء الخطة</Button>
        </div>
        <Alert>{action.error}</Alert>
      </form>
    </Card>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="relative size-20 shrink-0" role="img" aria-label={`نسبة الإنجاز ${percent}%`}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-black/5 dark:text-white/10" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} className="text-brand transition-all" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-base font-bold">{percent}%</span>
    </div>
  );
}

function WeekCard({ week, current, milestone, onToggle, busy }: { week: PlanWeek; current: boolean; milestone?: string; onToggle: (taskId: string, done: boolean) => void; busy: boolean }) {
  const [open, setOpen] = useState(current);
  const done = week.tasks.filter((t) => t.done).length;
  const complete = done === week.tasks.length;
  return (
    <div className={cx("rounded-xl border bg-white dark:bg-white/5", current ? "border-brand ring-2 ring-brand/15" : "border-black/10 dark:border-white/10")}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-start">
        <span className={cx("grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold", complete ? "bg-brand text-white" : current ? "bg-teal-50 text-brand dark:bg-teal-500/15" : "bg-gray-100 dark:bg-white/10")}>
          {complete ? <Check className="size-5" /> : week.weekNo}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{week.theme}</span>
            {current && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">الأسبوع الحالي</span>}
            {milestone && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-100"><Flag className="size-3" />{milestone}</span>}
          </span>
          <span className="text-xs text-gray-500">الأسبوع {week.weekNo} · {week.phase} · {done}/{week.tasks.length} مهام</span>
        </span>
        <ChevronDown className={cx("size-5 shrink-0 text-gray-400 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-5 border-t border-black/5 p-4 md:grid-cols-[1fr_16rem] dark:border-white/10">
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">المهام</p>
            <ul className="space-y-2">
              {week.tasks.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg p-1.5 text-sm hover:bg-black/[0.03] dark:hover:bg-white/5">
                    <input type="checkbox" checked={t.done} disabled={busy} onChange={(e) => onToggle(t.id, e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-teal-700" />
                    <span className={cx(t.done && "text-gray-400 line-through")}>{t.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500">أهداف الأسبوع</p>
              <ul className="list-disc space-y-1 ps-4 text-gray-700 dark:text-gray-300">{week.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500">المخرَج</p>
              <p className="text-gray-700 dark:text-gray-300">{week.deliverable}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {week.skills.map((s) => <span key={s} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800 dark:bg-teal-500/15 dark:text-teal-100">{s}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PHASE_COLORS = ["bg-teal-300", "bg-teal-500", "bg-teal-600", "bg-teal-700", "bg-teal-900"];

function PlanView({ plan, onChange, onNew }: { plan: TrainingPlan; onChange: (plan: TrainingPlan) => void; onNew: () => void }) {
  const [tab, setTab] = useState<"weeks" | "goals" | "milestones">("weeks");
  const action = useAction();
  const c = plan.content;
  const progress = planProgress(c);
  const thisWeek = currentWeekNo(plan);
  const milestoneByWeek = new Map(c.milestones.map((m) => [m.weekNo, m.title]));

  const toggle = (taskId: string, done: boolean) =>
    action.run(async () => onChange(await api<TrainingPlan>(`/plans/${plan.id}/tasks/${taskId}`, { method: "PATCH", body: { done } })));

  const tabs = [["weeks", "الأسابيع"], ["goals", "الأهداف والمهارات"], ["milestones", "المعالم والتقييم"]] as const;

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <ProgressRing percent={progress.percent} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{c.title}</h2>
              <span className={cx("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", plan.source === "AI" ? "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100" : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200")}>
                {plan.source === "AI" ? <><Bot className="size-3.5" />مخصّصة بالذكاء الاصطناعي</> : <><Cpu className="size-3.5" />المحرك المدمج</>}
              </span>
            </div>
            <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{c.summary}</p>
            <p className="text-xs text-gray-500">
              {progress.done} من {progress.total} مهمة منجزة · الأسبوع الحالي {thisWeek} من {plan.durationWeeks}
              {plan.startDate && ` · يبدأ ${formatDate(plan.startDate)}`}
            </p>
          </div>
          <Button variant="secondary" onClick={onNew} className="flex items-center gap-2 self-start"><RefreshCw className="size-4" />خطة جديدة</Button>
        </div>
        {plan.notice && <div className="mt-4"><Alert tone="amber">{plan.notice}</Alert></div>}

        <div className="mt-6">
          <div className="flex overflow-hidden rounded-lg text-[11px] font-medium text-white">
            {c.phases.map((p, i) => (
              <div key={p.key} style={{ flexGrow: p.endWeek - p.startWeek + 1 }} className={cx("truncate px-2 py-2 text-center", PHASE_COLORS[i % PHASE_COLORS.length])} title={p.name}>
                {p.name}
              </div>
            ))}
          </div>
          <p className="mt-2 mb-0.5 text-[10px] text-gray-500">الأسابيع</p>
          <div className="flex text-[10px] text-gray-500">
            {c.phases.map((p) => (
              <div key={p.key} style={{ flexGrow: p.endWeek - p.startWeek + 1 }} className="text-center">
                <span dir="ltr">{p.startWeek === p.endWeek ? p.startWeek : `${p.startWeek}–${p.endWeek}`}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div role="tablist" className="flex gap-1 rounded-xl bg-black/5 p-1 text-sm dark:bg-white/10">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cx("flex-1 rounded-lg py-2", tab === key && "bg-white font-semibold shadow-sm dark:bg-white/15")}>
            {label}
          </button>
        ))}
      </div>
      <Alert>{action.error}</Alert>

      {tab === "weeks" && (
        <div className="space-y-3">
          {c.weeks.map((w) => (
            <WeekCard key={w.weekNo} week={w} current={w.weekNo === thisWeek} milestone={milestoneByWeek.get(w.weekNo)} onToggle={toggle} busy={action.busy} />
          ))}
        </div>
      )}

      {tab === "goals" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card title={<span className="flex items-center gap-2"><Target className="size-5 text-brand" />أهداف التدريب</span>}>
            <ol className="space-y-3 text-sm">
              {c.goals.map((g, i) => (
                <li key={g} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-bold text-brand dark:bg-teal-500/15">{i + 1}</span>{g}</li>
              ))}
            </ol>
          </Card>
          <Card title="المهارات المستهدفة">
            {(["technical", "professional"] as const).map((cat) => (
              <div key={cat} className="mb-4">
                <p className="mb-2 text-xs font-semibold text-gray-500">{cat === "technical" ? "مهارات تقنية" : "مهارات مهنية"}</p>
                <div className="flex flex-wrap gap-2">
                  {c.skills.filter((s) => s.category === cat).map((s) => (
                    <span key={s.name} className={cx("rounded-full px-3 py-1 text-sm", cat === "technical" ? "bg-teal-50 text-teal-800 dark:bg-teal-500/15 dark:text-teal-100" : "bg-gray-100 dark:bg-white/10")}>{s.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "milestones" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="المعالم الرئيسية">
            <ol className="relative space-y-5 border-s-2 border-teal-100 ps-6 dark:border-teal-500/20">
              {c.milestones.map((m) => (
                <li key={m.weekNo} className="relative">
                  <span className={cx("absolute -start-[33px] top-0.5 grid size-4 place-items-center rounded-full border-2 border-white dark:border-[#0f1115]", m.weekNo <= thisWeek ? "bg-brand" : "bg-teal-200 dark:bg-teal-700")} />
                  <p className="text-xs text-gray-500">الأسبوع {m.weekNo}</p>
                  <p className="text-sm font-semibold">{m.title}</p>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="معايير التقييم المقترحة">
            <ul className="space-y-4">
              {c.evaluation.map((e) => (
                <li key={e.criterion} className="text-sm">
                  <div className="mb-1 flex justify-between gap-3"><span>{e.criterion}</span><span className="font-semibold">{e.weight}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${e.weight}%` }} /></div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

function PreviousPlans({ currentId, onActivated }: { currentId: number; onActivated: (plan: TrainingPlan) => void }) {
  // The query string only changes the fetch key, so the list refreshes when the active plan changes.
  const { data } = useData<PlanSummary[]>(`/plans?current=${currentId}`);
  const action = useAction();
  const others = data?.filter((p) => p.id !== currentId) ?? [];
  if (!others.length) return null;
  const activate = (id: number) => action.run(async () => onActivated(await api<TrainingPlan>(`/plans/${id}/activate`, { method: "PATCH" })));
  return (
    <Card title="الخطط السابقة">
      <Alert>{action.error}</Alert>
      <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
        {others.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span>{p.durationWeeks} أسبوعاً · {p.source === "AI" ? "ذكاء اصطناعي" : "المحرك المدمج"} · {formatDate(p.createdAt)}</span>
            <Button variant="secondary" disabled={action.busy} onClick={() => activate(p.id)}>تفعيل</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function TrainingPlanPage() {
  const { data, loading, error } = useData<TrainingPlan | null>("/plans/current");
  const [plan, setPlan] = useState<TrainingPlan | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const current = plan === undefined ? data : plan;

  if (loading && current === undefined) return <p className="text-sm text-gray-500">جارٍ التحميل...</p>;
  if (error) return <Alert>{error}</Alert>;

  if (!current || creating) {
    return (
      <>
        {!current && (
          <div className="rounded-2xl bg-gradient-to-l from-teal-700 to-teal-900 p-6 text-white">
            <h2 className="mb-2 flex items-center gap-2 text-xl font-bold"><Bot className="size-6" />خطتك التدريبية تبدأ من هنا</h2>
            <p className="max-w-2xl text-sm leading-7 text-teal-100">اختر تخصصك ومسارك ومدة تدريبك، ويبني لك المساعد خطة أسبوعية: لكل أسبوع محور وأهداف ومهام قابلة للقياس ومخرَج ومهارات مستهدفة.</p>
          </div>
        )}
        <PlanWizard onCreated={(p) => { setPlan(p); setCreating(false); }} onCancel={current ? () => setCreating(false) : undefined} />
      </>
    );
  }

  return (
    <>
      <PlanView plan={current} onChange={setPlan} onNew={() => setCreating(true)} />
      <PreviousPlans currentId={current.id} onActivated={setPlan} />
    </>
  );
}
