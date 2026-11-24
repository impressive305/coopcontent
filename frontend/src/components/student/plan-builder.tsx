"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Info, PencilRuler, Sparkles } from "lucide-react";
import { api, type PlanCatalog, type TrainingPlan } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Field, cx, inputClass, useAction } from "../ui";

const GENERATION_STEPS = ["قراءة تخصصك ومجالك", "توزيع الأسابيع على المراحل", "صياغة المهام الميدانية والتعليمية", "مراجعة الخطة والتحقق منها"];

function GeneratingState({ ai }: { ai: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1)), ai ? 6000 : 400);
    return () => clearInterval(id);
  }, [ai]);
  return (
    <Card>
      <div className="flex flex-col items-center gap-5 py-12 text-center" role="status" aria-live="polite">
        <span className="grid size-14 animate-pulse place-items-center rounded-2xl bg-brand-soft text-brand"><Bot className="size-7" /></span>
        <div>
          <p className="font-semibold">{ai ? "يُعدّ المساعد الذكي مسودة خطتك..." : "جارٍ إعداد المسودة..."}</p>
          {ai && <p className="mt-1 text-sm text-subtle">قد يستغرق ذلك حتى دقيقة.</p>}
        </div>
        <ol className="space-y-2 text-sm">
          {GENERATION_STEPS.map((s, i) => (
            <li key={s} className={cx("flex items-center gap-2", i > step && "text-subtle")}>
              <span className={cx("grid size-5 place-items-center rounded-full border", i < step ? "border-brand bg-brand text-white" : i === step ? "border-brand" : "border-line")}>
                {i < step && <Check className="size-3" />}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function StepHeading({ n, title, text }: { n: number; title: string; text?: string }) {
  return (
    <div className="mb-4 flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{n}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        {text && <p className="mt-0.5 text-sm leading-6 text-subtle">{text}</p>}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cx("rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition", active ? "bg-brand text-white ring-brand" : "bg-surface text-foreground ring-line hover:ring-brand/50")}>
      {children}
    </button>
  );
}

type Mode = "draft" | "blank";

export function PlanBuilder({ onCreated, onCancel }: { onCreated: (plan: TrainingPlan, blank: boolean) => void; onCancel?: () => void }) {
  const { data: catalog, error } = useData<PlanCatalog>("/plans/catalog");
  if (!catalog) return <Card><Alert>{error}</Alert>{!error && <p className="text-sm text-subtle">جارٍ التحميل...</p>}</Card>;
  return <BuilderForm catalog={catalog} onCreated={onCreated} onCancel={onCancel} />;
}

function BuilderForm({ catalog, onCreated, onCancel }: { catalog: PlanCatalog; onCreated: (plan: TrainingPlan, blank: boolean) => void; onCancel?: () => void }) {
  const [major, setMajor] = useState(catalog.major);
  const [focus, setFocus] = useState("");
  const [suggested, setSuggested] = useState({ major: catalog.major, fields: catalog.fields });
  const fields = suggested.fields;
  const [sector, setSector] = useState(catalog.placement?.sector ?? "");
  const [mode, setMode] = useState<Mode>("draft");
  const [useAi, setUseAi] = useState(true);
  const action = useAction();
  const aiOn = mode === "draft" && useAi && catalog.aiAvailable;

  // Field ideas follow whatever major the student types.
  useEffect(() => {
    const value = major.trim().slice(0, 100);
    if (value === suggested.major) return;
    const id = setTimeout(() => {
      api<string[]>(`/plans/fields?major=${encodeURIComponent(value)}`).then((f) => setSuggested({ major: value, fields: f }), () => {});
    }, 400);
    return () => clearTimeout(id);
  }, [major, suggested.major]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const common = {
      major: major.trim(),
      focus: focus.trim(),
      sector: sector.trim() || undefined,
      durationWeeks: Number(v.durationWeeks),
      hoursPerWeek: Number(v.hoursPerWeek),
      startDate: v.startDate || undefined,
    };
    let created: TrainingPlan | null = null;
    await action.run(async () => {
      created = mode === "blank"
        ? await api<TrainingPlan>("/plans/manual", { method: "POST", body: { ...common, title: `خطة التدريب التعاوني — ${common.focus}` } })
        : await api<TrainingPlan>("/plans", { method: "POST", body: { ...common, goals: v.goals || undefined, useAi: aiOn } });
    });
    if (created) onCreated(created, mode === "blank");
  };

  if (action.busy && mode === "draft") return <GeneratingState ai={aiOn} />;

  const minWeeks = mode === "draft" ? 4 : 1;

  return (
    <form onSubmit={submit}>
      <Card
        title={<span className="flex items-center gap-2"><Sparkles className="size-5 text-brand" />أنشئ خطة تدريبك</span>}
        description="أربع خطوات قصيرة. كل ما في الخطة قابل للتعديل لاحقاً."
        actions={onCancel && <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>}
      >
        <div className="space-y-10">
          {catalog.placement && (
            <Alert tone="green">ستُربط الخطة بتدريبك في {catalog.placement.company}{catalog.placement.opportunity && ` (${catalog.placement.opportunity})`}.</Alert>
          )}

          <section>
            <StepHeading n={1} title="تخصصك ومجال تدريبك" text="اكتب المجال الذي ستتدرب فيه فعلاً، حتى لو كان مختلفاً عن المعتاد لتخصصك. مثال: طالب علوم حاسب يتدرب في الدعم الفني بمستشفى." />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">التخصص</span>
                <input value={major} onChange={(e) => setMajor(e.target.value)} required minLength={2} maxLength={100} list="plan-majors" className={inputClass} />
                <datalist id="plan-majors">{catalog.majorGroups.flatMap((g) => g.majors).map((m) => <option key={m} value={m} />)}</datalist>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">مجال التدريب</span>
                <input value={focus} onChange={(e) => setFocus(e.target.value)} required minLength={2} maxLength={120} placeholder="اكتب مجالك أو اختر من الاقتراحات" className={inputClass} />
              </label>
            </div>
            {fields.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-subtle">اقتراحات حسب تخصصك:</p>
                <div className="flex flex-wrap gap-2">
                  {fields.map((f) => <Chip key={f} active={focus === f} onClick={() => setFocus(f)}>{f}</Chip>)}
                </div>
              </div>
            )}
          </section>

          <section>
            <StepHeading n={2} title="بيئة التدريب" text="أين ستتدرب؟ تتكيّف المهام مع طبيعة الجهة. اختياري." />
            <div className="flex flex-wrap gap-2">
              {catalog.sectors.map((s) => <Chip key={s} active={sector === s} onClick={() => setSector(sector === s ? "" : s)}>{s}</Chip>)}
            </div>
            <input value={catalog.sectors.includes(sector) ? "" : sector} onChange={(e) => setSector(e.target.value)} maxLength={80} placeholder="أو اكتب بيئة أخرى" className={cx(inputClass, "mt-3 sm:w-80")} />
          </section>

          <section>
            <StepHeading n={3} title="المدة والوقت" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="عدد الأسابيع" name="durationWeeks" type="number" min={minWeeks} max={52} required defaultValue={catalog.placement?.durationWeeks ?? 12} hint={mode === "draft" ? "من 4 إلى 52 أسبوعاً" : "من 1 إلى 52 أسبوعاً"} />
              <Field label="ساعات العمل أسبوعياً" name="hoursPerWeek" type="number" min={1} max={60} required defaultValue={40} />
              <Field label="تاريخ البدء (اختياري)" name="startDate" type="date" defaultValue={catalog.placement?.startDate.slice(0, 10)} hint="يحدد الأسبوع الحالي تلقائياً" />
            </div>
          </section>

          <section>
            <StepHeading n={4} title="كيف تريد أن تبدأ؟" />
            <div role="radiogroup" aria-label="طريقة البناء" className="grid gap-3 md:grid-cols-2">
              {([
                ["draft", Bot, "مسودة جاهزة أعدّلها", "نُعدّ لك خطة كاملة أسبوعاً بأسبوع، بمهام ميدانية وتعليمية، ثم تعدّلها كما تشاء."],
                ["blank", PencilRuler, "خطة فارغة أبنيها بنفسي", "تعرف ما ستعمله؟ ابدأ بأسابيع فارغة ورتّب كل أسبوع بنفسك."],
              ] as const).map(([key, Icon, title, text]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={mode === key}
                  onClick={() => setMode(key)}
                  className={cx("flex gap-3 rounded-2xl border p-4 text-start transition", mode === key ? "border-brand bg-brand-soft ring-4 ring-brand/10" : "border-line hover:border-brand/40")}
                >
                  <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", mode === key ? "bg-brand text-white" : "bg-muted text-subtle")}><Icon className="size-5" /></span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-1 block text-sm leading-6 text-subtle">{text}</span>
                  </span>
                </button>
              ))}
            </div>
            {mode === "draft" && (
              <div className="mt-4 space-y-4">
                <Field label="ماذا تريد أن تحقق من تدريبك؟ (اختياري)" name="goals" textarea maxLength={1000} placeholder="مثال: أريد التعمق في إدارة الأنظمة الصحية والحصول على شهادة ITIL" />
                <label className={cx("flex items-start gap-3 rounded-xl bg-muted p-4 text-sm", !catalog.aiAvailable && "opacity-70")}>
                  <input type="checkbox" checked={aiOn} disabled={!catalog.aiAvailable} onChange={(e) => setUseAi(e.target.checked)} className="mt-1 size-4 accent-brand" />
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold"><Bot className="size-4 text-brand" />تخصيص المسودة بالذكاء الاصطناعي</span>
                    <span className="mt-0.5 block text-subtle">
                      {catalog.aiAvailable ? "يكيّف المساعد المهام مع مجالك وجهتك وأهدافك ومهاراتك." : "المساعد الذكي غير مفعّل على الخادم حالياً، وستُعدّ المسودة من القوالب المدمجة."}
                    </span>
                  </span>
                </label>
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            <p className="flex items-center gap-2 text-xs text-subtle"><Info className="size-4" />تُحفظ خطتك السابقة ويمكنك العودة إليها.</p>
            <Button type="submit" disabled={action.busy} className="px-6">{mode === "draft" ? "أنشئ المسودة" : "ابدأ ببناء خطتي"}</Button>
          </div>
          <Alert>{action.error}</Alert>
        </div>
      </Card>
    </form>
  );
}
