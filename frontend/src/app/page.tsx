import Link from "next/link";
import {
  ArrowLeft, Bell, Bot, Building2, CalendarCheck, ChartColumn, Check, ClipboardList, FileText, GraduationCap,
  Layers, ListChecks, Lock, Route, Search, ShieldCheck, Target, X,
} from "lucide-react";
import { DashboardPreview } from "@/components/landing/preview";
import { RoleTabs } from "@/components/landing/role-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { MAJORS } from "@/lib/majors";

const navLinks = [
  ["#features", "المزايا"],
  ["#ai-plan", "الخطة الذكية"],
  ["#roles", "لمن المنصة"],
  ["#how", "كيف تعمل"],
  ["#faq", "الأسئلة الشائعة"],
];

const facts = [
  ["13", "جهة حقيقية تفتح التدريب التعاوني"],
  ["أي", "تخصص ومجال تدريب، بلا قوائم مغلقة"],
  ["4–52", "أسبوعاً: خطط لأي مدة تدريب"],
  ["100%", "واجهة عربية من اليمين لليسار"],
];

const pains = [
  "رسائل بريد ومجموعات متفرقة بين الطالب ووحدة التدريب والجهة",
  "نماذج ورقية تُطبع وتُوقّع وتُمسح ضوئياً",
  "لا تعرف وحدة التدريب من تأخر في تقاريره إلا متأخراً",
  "خطة التدريب عامة ولا تعكس تخصص الطالب",
];

const gains = [
  "قناة واحدة موثّقة لكل طرف بصلاحيات محددة",
  "طلبات وتقارير واعتمادات رقمية بالكامل",
  "حالة كل طالب وكل تقرير ظاهرة لحظياً",
  "خطة أسبوعية مرنة للمجال الذي يختاره الطالب",
];

const features = [
  [Search, "فرص تدريب منظّمة", "بحث وتصفية حسب التخصص والمدينة، مع المقاعد والمدة وآخر موعد للتقديم."],
  [Bot, "خطة تدريب ذكية", "مسودة أسبوعية احترافية لمجالك وجهتك وأهدافك، أو خطة تبنيها بنفسك."],
  [ListChecks, "متابعة المهام", "مهام أسبوعية قابلة للتأشير ونسبة إنجاز تُحدَّث مباشرة."],
  [FileText, "تقارير أسبوعية ونهائية", "نموذج موحّد للتقرير، واعتماد أو إعادة من وحدة التدريب مع ملاحظات مكتوبة."],
  [Target, "خطة على مقاس مجالك", "اكتب تخصصك والمجال الذي تريده، حتى لو كان مختلفاً عن المعتاد لتخصصك."],
  [Building2, "بوابة لجهات التدريب", "نشر الفرص وفرز المتقدمين وقبولهم بتحديد تاريخ البدء."],
  [ChartColumn, "مؤشرات لوحدة التدريب", "أعداد المتدربين والطلبات والتقارير المعلّقة لحظة بلحظة."],
  [ShieldCheck, "صلاحيات وأمان", "كل مستخدم يرى ما يخصه فقط، وجهات التدريب تُعتمد قبل النشر."],
] as const;

const planSteps = [
  [GraduationCap, "اكتب تخصصك ومجالك", "بكلماتك أنت، مثل: علوم الحاسب ← الدعم الفني في مستشفى، أو المحاسبة ← التدقيق الداخلي في بنك."],
  [Target, "حدد المدة وأهدافك", "عدد الأسابيع وساعات العمل وما تريد تحقيقه. تُقرأ بيانات جهة تدريبك تلقائياً إن وُجدت."],
  [Bot, "يبني المساعد الذكي الخطة", "خمس مراحل من التهيئة حتى التسليم، بمهام ومخرجات ومهارات لكل أسبوع."],
  [CalendarCheck, "تابع إنجازك أسبوعياً", "أشّر على المهام المنجزة وارفع تقريرك، وتتابع وحدة التدريب تقدمك."],
] as const;

const steps = [
  ["أنشئ حسابك", "سجّل كطالب ببياناتك الجامعية، أو كجهة تدريب بسجلك التجاري."],
  ["قدّم على فرصة", "تصفّح الفرص المعتمدة وقدّم بخطاب تعريفي اختياري."],
  ["القبول وبدء التدريب", "عند القبول عبر المنصة يُنشأ سجل التدريب تلقائياً، وإن قُبلت مباشرة من الجهة تسجّله وحدة التدريب."],
  ["خطة وتقارير أسبوعية", "اتبع خطتك وارفع تقريرك كل أسبوع لتراجعه وحدة التدريب."],
  ["الإنهاء والاعتماد", "بعد اعتماد التقرير النهائي تُغلق وحدة التدريب التدريب رسمياً."],
];

const faqs = [
  ["من يستطيع استخدام المنصة؟", "طلاب الجامعات السعودية في برامج التدريب التعاوني، وجهات التدريب في القطاعين العام والخاص، ووحدات التدريب في الكليات."],
  ["كيف تُنشأ خطة التدريب الذكية؟", "تكتب تخصصك والمجال الذي ستتدرب فيه بكلماتك، فيبني المحرك المدمج مسودة أسبوعية، ثم يحسّنها نموذج ذكاء اصطناعي (Claude) لتناسب جهة تدريبك وأهدافك ومهاراتك الحالية. وإن لم تتوفر خدمة الذكاء الاصطناعي تُعتمد خطة المحرك مباشرة."],
  ["هل يمكنني تعديل الخطة أو إنشاء خطة جديدة؟", "نعم، يمكنك إنشاء خطة جديدة في أي وقت، وتبقى الخطط السابقة محفوظة ويمكنك إعادة تفعيل أي منها."],
  ["كيف يُعتمد حساب جهة التدريب؟", "تراجع وحدة التدريب بيانات الجهة ورقم سجلها التجاري، ولا تستطيع الجهة نشر الفرص قبل الاعتماد."],
  ["هل بياناتي محمية؟", "كلمات المرور مشفّرة، والصلاحيات مبنية على الدور: الطالب لا يرى إلا تدريبه، والجهة لا ترى إلا متقدميها ومتدربيها."],
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-[#0f1115]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-brand">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-white"><Route className="size-4" /></span>
            CoopConnect
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex dark:text-gray-300">
            {navLinks.map(([href, label]) => <a key={href} href={href} className="hover:text-brand">{label}</a>)}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <Link href="/login" className="rounded-lg px-3 py-2 font-medium hover:bg-black/5 dark:hover:bg-white/10">تسجيل الدخول</Link>
            <Link href="/register" className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">ابدأ الآن</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(15,118,110,0.14),transparent_60%)]" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-500/15 dark:text-teal-100">
                <GraduationCap className="size-4" /> منصة التدريب التعاوني للجامعات السعودية
              </span>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                من فرصة التدريب حتى اعتماد التقرير النهائي، <span className="text-brand">في منصة واحدة</span>
              </h1>
              <p className="max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300">
                CoopConnect تربط الطالب بجهات التدريب، وتبني لكل طالب خطة تدريب أسبوعية ذكية تناسب تخصصه، وتؤتمت التقارير والتقييمات من البداية إلى النهاية.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-teal-900/20 hover:bg-brand-dark">
                  أنشئ حسابك <ArrowLeft className="size-4" />
                </Link>
                <a href="#ai-plan" className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 font-semibold hover:bg-gray-50 dark:border-white/15 dark:bg-white/5">
                  <Bot className="size-4" /> تعرّف على الخطة الذكية
                </a>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                {["خطة أسبوعية حسب تخصصك", "دليل جهات تدريب حقيقية", "واجهة عربية بالكامل"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-brand" />{t}</li>
                ))}
              </ul>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* Facts */}
        <section className="border-y border-black/5 bg-white dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
            {facts.map(([value, label]) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-extrabold text-brand" dir="ltr">{value}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Problem / solution */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeading eyebrow="لماذا CoopConnect؟" title="التدريب التعاوني يستحق أكثر من البريد والنماذج الورقية" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6 dark:border-red-500/20 dark:bg-red-500/5">
              <h3 className="mb-4 font-bold text-red-900 dark:text-red-200">الطريقة التقليدية</h3>
              <ul className="space-y-3">
                {pains.map((p) => <li key={p} className="flex gap-2 text-sm"><X className="mt-0.5 size-4 shrink-0 text-red-500" />{p}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-6 dark:border-teal-500/20 dark:bg-teal-500/5">
              <h3 className="mb-4 font-bold text-teal-900 dark:text-teal-200">مع CoopConnect</h3>
              <ul className="space-y-3">
                {gains.map((g) => <li key={g} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-brand" />{g}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 bg-white py-20 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="المزايا" title="كل ما يحتاجه برنامج التدريب التعاوني" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(([Icon, title, body]) => (
                <div key={title} className="rounded-2xl border border-black/5 p-5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10">
                  <span className="mb-4 grid size-11 place-items-center rounded-xl bg-teal-50 text-brand dark:bg-teal-500/15"><Icon className="size-5" /></span>
                  <h3 className="mb-2 font-bold">{title}</h3>
                  <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI plan */}
        <section id="ai-plan" className="scroll-mt-20 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-500/15 dark:text-teal-100"><Bot className="size-4" /> المساعد الذكي</span>
              <h2 className="mb-4 text-3xl font-bold leading-snug">خطة تدريب احترافية تناسب تخصصك، في أقل من دقيقة</h2>
              <p className="mb-8 leading-8 text-gray-600 dark:text-gray-300">
                بدلاً من خطة عامة تُكتب مرة وتُنسى، يبني المساعد الذكي خطة أسبوعية حقيقية: لكل أسبوع محور وأهداف ومهام قابلة للقياس ومخرَج واضح ومهارات مستهدفة، تتدرج من التهيئة إلى مشروع تطبيقي يناسب مسارك.
              </p>
              <ol className="space-y-5">
                {planSteps.map(([Icon, title, body], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white">
                      <Icon className="size-5" />
                      <span className="absolute -top-1 -start-1 grid size-5 place-items-center rounded-full bg-white text-[10px] font-bold text-brand shadow dark:bg-[#0f1115]">{i + 1}</span>
                    </span>
                    <div>
                      <h3 className="font-bold">{title}</h3>
                      <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <SamplePlan />
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-20 bg-gradient-to-b from-teal-50/70 to-transparent py-20 dark:from-teal-500/5">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="لمن المنصة" title="لوحة مخصّصة لكل طرف في التدريب" />
            <RoleTabs />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <SectionHeading eyebrow="كيف تعمل" title="خمس خطوات من التسجيل حتى الاعتماد" />
          <ol className="grid gap-5 md:grid-cols-5">
            {steps.map(([title, body], i) => (
              <li key={title} className="relative rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-white/5">
                <span className="mb-3 block text-3xl font-extrabold text-teal-200 dark:text-teal-500/40">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mb-2 font-bold">{title}</h3>
                <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Majors */}
        <section className="bg-white py-20 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="خطط مفتوحة" title="أي تخصص، وأي مجال تدريب تختاره" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MAJORS.map((m) => (
                <div key={m.name} className="rounded-2xl border border-black/5 p-5 dark:border-white/10">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><Layers className="size-4 text-brand" />{m.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {m.tracks.map((t) => <span key={t} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision + privacy */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-2">
          <div className="rounded-2xl bg-teal-900 p-8 text-teal-50">
            <h3 className="mb-3 text-xl font-bold">انسجاماً مع رؤية المملكة 2030</h3>
            <p className="leading-7 text-teal-100">
              تدعم المنصة برنامج تنمية القدرات البشرية بمواءمة مخرجات التعليم مع احتياجات سوق العمل، وتسهم في التحول الرقمي للإجراءات الأكاديمية، وتسهّل انتقال الخريجين من التدريب إلى التوظيف.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold"><Lock className="size-5 text-brand" />خصوصية وأمان البيانات</h3>
            <ul className="space-y-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              <li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-brand" />كلمات مرور مشفّرة وجلسات بمفاتيح مؤقتة (JWT)</li>
              <li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-brand" />صلاحيات مبنية على الدور لكل طرف</li>
              <li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-brand" />مصمّمة لمراعاة نظام حماية البيانات الشخصية (PDPL)</li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-white py-20 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-3xl px-4">
            <SectionHeading eyebrow="الأسئلة الشائعة" title="إجابات سريعة" />
            <div className="space-y-3">
              {faqs.map(([q, a]) => (
                <details key={q} className="group rounded-xl border border-black/10 p-4 open:bg-gray-50 dark:border-white/10 dark:open:bg-white/5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                    {q}
                    <span className="text-brand transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-l from-teal-700 to-teal-900 px-6 py-14 text-center text-white">
            <h2 className="text-3xl font-bold">جاهز تبدأ تدريبك التعاوني بخطة واضحة؟</h2>
            <p className="max-w-xl text-teal-100">أنشئ حسابك، واختر تخصصك، ودع المساعد الذكي يبني خطتك الأسبوعية.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register" className="rounded-xl bg-white px-6 py-3 font-semibold text-teal-900 hover:bg-teal-50">إنشاء حساب طالب</Link>
              <Link href="/register" className="rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">تسجيل جهة تدريب</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 py-8 text-sm text-gray-500 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <p className="flex items-center gap-2 font-semibold text-brand"><Route className="size-4" />CoopConnect</p>
          <p>مشروع تخرج: منصة إدارة التدريب التعاوني للجامعات السعودية</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-brand">تسجيل الدخول</Link>
            <Link href="/register" className="hover:text-brand">إنشاء حساب</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-2 text-sm font-semibold text-brand">{eyebrow}</p>
      <h2 className="text-3xl font-bold leading-snug">{title}</h2>
    </div>
  );
}

// Excerpt of what the engine produces for Computer Science → Web, 24 weeks (week 16).
function SamplePlan() {
  const phases = [
    ["التهيئة", 3], ["التعلّم", 5], ["المساهمة", 7], ["المشروع", 7], ["التسليم", 2],
  ] as const;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-white/5">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-bold">خطة التدريب: علوم الحاسب (تطوير الويب)</p>
        <Bell className="size-4 text-gray-400" />
      </div>
      <p className="mb-5 text-xs text-gray-500">24 أسبوعاً · 40 ساعة أسبوعياً</p>
      <div className="mb-6 flex overflow-hidden rounded-lg text-[10px] font-medium text-white">
        {phases.map(([name, w], i) => (
          <div key={name} style={{ flexGrow: w }} className={`px-1 py-2 text-center ${["bg-teal-400", "bg-teal-500", "bg-teal-600", "bg-teal-700", "bg-teal-800"][i]}`}>
            {name} · {w}
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-black/5 p-4 dark:border-white/10">
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold">الأسبوع 16 · تحليل متطلبات الميزة</p>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-white/10">المشروع التطبيقي</span>
        </div>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {["كتابة وثيقة متطلبات ميزة ويب متكاملة لأحد منتجات الجهة واعتمادها", "تصميم البنية التقنية ومخطط البيانات", "كتابة التقرير الأسبوعي ورفعه على المنصة"].map((t) => (
            <li key={t} className="flex gap-2"><ClipboardList className="mt-0.5 size-4 shrink-0 text-brand" />{t}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 border-t border-black/5 pt-3 text-xs dark:border-white/10">
          <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-800 dark:bg-teal-500/15 dark:text-teal-100">Git</span>
          <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-800 dark:bg-teal-500/15 dark:text-teal-100">التواصل المهني</span>
          <span className="ms-auto text-gray-500">المخرَج: التقرير الأسبوعي رقم 16</span>
        </div>
      </div>
    </div>
  );
}
