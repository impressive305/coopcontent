"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, CalendarCheck, Eye, EyeOff, FileText, Route } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { cx, inputClass } from "./ui";

const HIGHLIGHTS = [
  { icon: Building2, title: "جهات تدريب حقيقية", text: "دليل بالجهات التي تفتح التدريب التعاوني وروابط التقديم الرسمية." },
  { icon: CalendarCheck, title: "خطة تدريب على مقاسك", text: "اكتب تخصصك والمجال الذي تريده، وابنِ خطتك بنفسك أو بمساعدة الذكاء الاصطناعي." },
  { icon: FileText, title: "تقارير منظّمة", text: "قوالب وإرشادات لكتابة تقريرك الأسبوعي والنهائي باحترافية." },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx("inline-flex items-center gap-2.5 font-bold", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white shadow-sm"><Route className="size-[18px]" /></span>
      CoopConnect
    </Link>
  );
}

export function AuthShell({ title, subtitle, children, footer, wide }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[1fr_minmax(0,34rem)]">
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo className="text-brand" />
          <ThemeToggle />
        </div>
        <div className={cx("mx-auto flex w-full flex-1 flex-col justify-center py-10", wide ? "max-w-xl" : "max-w-sm")}>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 mb-8 text-sm leading-6 text-subtle">{subtitle}</p>
          {children}
          <p className="mt-8 text-center text-sm text-subtle">{footer}</p>
        </div>
      </main>

      <aside className="relative hidden overflow-hidden bg-gradient-to-b from-teal-800 via-teal-900 to-[#06302c] p-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -top-24 -left-24 size-96 rounded-full bg-teal-400/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -right-16 size-96 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium text-teal-200">منصة التدريب التعاوني</p>
          <h2 className="mt-3 text-3xl leading-tight font-bold">من البحث عن جهة التدريب حتى التقرير النهائي، في مكان واحد.</h2>
        </div>
        <ul className="relative space-y-6">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><Icon className="size-5" /></span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-teal-100/80">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="relative text-xs text-teal-200/70">بياناتك محمية: كلمات المرور مشفّرة، وكل مستخدم يرى ما يخصه فقط.</p>
      </aside>
    </div>
  );
}

export function PasswordField({ label, name, autoComplete, minLength, showStrength }: { label: string; name: string; autoComplete: string; minLength?: number; showStrength?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  // A rough guide only; the server enforces the minimum length.
  const score = [value.length >= 8, /[A-Z]/.test(value) && /[a-z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value) || value.length >= 12].filter(Boolean).length;
  const labels = ["ضعيفة جداً", "ضعيفة", "متوسطة", "جيدة", "قوية"];

  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <span className="relative block">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          dir="ltr"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cx(inputClass, "pe-11")}
        />
        <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute inset-y-0 end-0 grid w-11 place-items-center text-subtle hover:text-foreground">
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
      {showStrength && value && (
        <span className="flex items-center gap-2 text-xs text-subtle">
          <span className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cx("h-1 flex-1 rounded-full", i < score ? (score <= 1 ? "bg-red-500" : score === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-muted")} />
            ))}
          </span>
          {labels[score]}
        </span>
      )}
    </label>
  );
}
