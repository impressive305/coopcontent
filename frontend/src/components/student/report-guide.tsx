"use client";

import { useState } from "react";
import { AlertTriangle, BookOpenCheck, CalendarClock, ChevronDown, ClipboardCheck, FileText, Lightbulb, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, cx } from "../ui";

// What goes in each field of the weekly report form, in the order of the form.
const WEEKLY_PARTS = [
  { field: "المهام المنجزة", how: "اكتب كل مهمة في سطر: ماذا فعلت، ولماذا، وما النتيجة. ابدأ بفعل (حلّلت، أعددت، شاركت) واذكر رقماً متى أمكن." },
  { field: "عدد الساعات", how: "الساعات الفعلية التي عملتها هذا الأسبوع، كما في سجل الحضور لدى الجهة." },
  { field: "المهارات المكتسبة", how: "مهارات محددة تعلمتها أو طبقتها، تقنية ومهنية. «تعلمت أشياء كثيرة» ليست مهارة؛ «إعداد تقارير الأعطال في نظام ServiceNow» مهارة." },
  { field: "التحديات", how: "تحدٍّ حقيقي واجهته، وكيف تعاملت معه، وما الذي ستفعله بشكل مختلف. أنهِ بسطر عن خطتك للأسبوع القادم." },
];

const FINAL_SECTIONS = [
  "مقدمة: نبذة عن الجهة والقسم الذي تدربت فيه ودورك",
  "الأهداف: ما الذي خططت لتحقيقه في بداية التدريب",
  "ملخص العمل: أبرز المهام مقسّمة على مراحل التدريب",
  "المشروع التطبيقي أو أهم إنجاز: المشكلة، والحل، والأثر بالأرقام",
  "المهارات المكتسبة: تقنية ومهنية، مع أمثلة من العمل",
  "التحديات والدروس المستفادة",
  "التوصيات: للجهة، ولبرنامج التدريب، وللطلاب القادمين",
  "الخاتمة: كيف أثّر التدريب في مسارك المهني",
];

const ORGANIZE = [
  { icon: CalendarClock, title: "سجل يومي في خمس دقائق", text: "قبل نهاية الدوام اكتب ثلاثة أسطر: ماذا أنجزت، ماذا تعلمت، ما الذي يعيقك. التقرير الأسبوعي يصبح تجميعاً لا تذكّراً." },
  { icon: ClipboardCheck, title: "ثلاث أولويات كل صباح", text: "ابدأ يومك بتحديد أهم ثلاث مهام من خطتك، وأنجز أصعبها أولاً." },
  { icon: BookOpenCheck, title: "ملف أدلة لإنجازاتك", text: "احتفظ بما يثبت عملك: لقطات شاشة، مسودات، رسائل شكر، بعد التأكد من أنها لا تحتوي بيانات سرية." },
  { icon: Lightbulb, title: "لقاء أسبوعي قصير مع مشرفك الميداني", text: "عشر دقائق نهاية كل أسبوع: ما أنجزت، وما تحتاجه، وملاحظاته. هذا اللقاء يرفع تقييمك أكثر من أي شيء آخر." },
];

const TIPS = [
  "اكتب تقريرك في نفس الأسبوع، لا تؤجله. تفاصيل الأسبوع تُنسى بسرعة.",
  "قِس ما تستطيع: عدد الطلبات التي عالجتها، الوقت الذي وفّرته، الأخطاء التي اكتشفتها.",
  "اربط عملك بخطة تدريبك: اذكر أي أسبوع من الخطة يغطيه التقرير وما الذي تغيّر.",
  "استخدم لغة مهنية مختصرة. الجمل القصيرة أوضح من الفقرات الطويلة.",
  "عند إعادة التقرير لك، عالج كل ملاحظة صراحة ثم أعد الإرسال.",
];

const MISTAKES = [
  "عبارات عامة مثل «تعلمت الكثير» و«تعرفت على بيئة العمل» دون أي تفاصيل.",
  "نسخ تقرير الأسبوع السابق مع تغيير بسيط.",
  "ذكر بيانات عملاء أو مرضى أو أرقام سرية للجهة.",
  "تأجيل كل التقارير إلى نهاية التدريب.",
  "إغفال التحديات، كأن كل شيء كان سهلاً. التحدي الصادق يُظهر نضجك.",
];

function Section({ icon: Icon, title, children, defaultOpen }: { icon: typeof FileText; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-line last:border-b-0">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 py-4 text-start">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-[18px]" /></span>
        <span className="flex-1 font-semibold">{title}</span>
        <ChevronDown className={cx("size-5 text-subtle transition", open && "rotate-180")} />
      </button>
      {open && <div className="pb-5 ps-12 text-sm leading-7">{children}</div>}
    </div>
  );
}

export function ReportGuide() {
  return (
    <Card title="دليل كتابة التقارير وتنظيم التدريب" description="كيف تكتب تقريراً يُعتمد من أول مرة، وكيف تنظّم أسابيعك.">
      <Section icon={FileText} title="هيكل التقرير الأسبوعي" defaultOpen>
        <ol className="space-y-3">
          {WEEKLY_PARTS.map((p, i) => (
            <li key={p.field} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
              <span><span className="font-semibold">{p.field}: </span><span className="text-subtle">{p.how}</span></span>
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={ThumbsUp} title="مثال: تقرير ضعيف مقابل تقرير قوي">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/20 dark:bg-red-500/5">
            <p className="mb-2 flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-300"><ThumbsDown className="size-4" />ضعيف</p>
            <p className="text-subtle">ساعدت الفريق في الدعم الفني وتعلمت أشياء كثيرة عن الأنظمة. كان الأسبوع جيداً.</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <p className="mb-2 flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300"><ThumbsUp className="size-4" />قوي</p>
            <ul className="list-disc space-y-1 ps-4 text-subtle">
              <li>عالجت 18 طلب دعم في نظام التذاكر، منها 4 أعطال طابعات في قسم الطوارئ.</li>
              <li>وثّقت إجراء إعادة ضبط كلمات المرور في دليل من صفحة واحدة اعتمده الفريق.</li>
              <li>التحدي: تأخر صلاحيات النظام يومين؛ استثمرتهما في دورة ITIL Foundation.</li>
              <li>الأسبوع القادم: المشاركة في ترقية أجهزة قسم الأشعة.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section icon={ClipboardCheck} title="التقرير النهائي: الأقسام المقترحة">
        <ol className="list-decimal space-y-1 ps-5 text-subtle">
          {FINAL_SECTIONS.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-subtle">تقاريرك الأسبوعية هي مادتك الخام: اجمع أقوى ما فيها، ولا تبدأ التقرير النهائي من الصفر.</p>
      </Section>

      <Section icon={CalendarClock} title="نظّم نفسك خلال التدريب">
        <div className="grid gap-3 sm:grid-cols-2">
          {ORGANIZE.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl bg-muted p-4">
              <p className="mb-1 flex items-center gap-2 font-semibold"><Icon className="size-4 text-brand" />{title}</p>
              <p className="text-subtle">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Lightbulb} title="نصائح لتقرير احترافي">
        <ul className="space-y-2">
          {TIPS.map((t) => <li key={t} className="flex gap-2 text-subtle"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />{t}</li>)}
        </ul>
      </Section>

      <Section icon={AlertTriangle} title="أخطاء شائعة تجنّبها">
        <ul className="space-y-2">
          {MISTAKES.map((m) => <li key={m} className="flex gap-2 text-subtle"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-red-500" />{m}</li>)}
        </ul>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          السرية أولاً: لا تكتب في تقاريرك أسماء عملاء أو مرضى أو أي بيانات داخلية للجهة. صِف العمل لا البيانات.
        </p>
      </Section>
    </Card>
  );
}
