"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, GraduationCap, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthShell, PasswordField } from "@/components/auth-shell";
import { GpaField, MajorField, UniversityField } from "@/components/student-fields";
import { Alert, Button, Field, cx, formValues, useAction } from "@/components/ui";

type Kind = "student" | "company";

const KINDS: { key: Kind; icon: typeof GraduationCap; title: string; text: string }[] = [
  { key: "student", icon: GraduationCap, title: "طالب", text: "ابحث عن جهة تدريب، وابنِ خطتك، وارفع تقاريرك." },
  { key: "company", icon: Building2, title: "جهة تدريب", text: "اعرض جهتك للطلاب وانشر فرص التدريب التعاوني." },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 flex w-full items-center gap-3 text-xs font-semibold text-subtle">
        {title}<span className="h-px flex-1 bg-line" />
      </legend>
      {children}
    </fieldset>
  );
}

export default function RegisterPage() {
  const [kind, setKind] = useState<Kind>("student");
  const { register } = useAuth();
  const router = useRouter();
  const { busy, error, run } = useAction();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const body =
      kind === "student"
        ? {
            ...v,
            gpa: v.gpa ? Number(v.gpa) : undefined,
            gpaScale: v.gpa ? Number(v.gpaScale) : undefined,
            skills: v.skills ? v.skills.split(/[,،]/).map((s) => s.trim()).filter(Boolean) : [],
          }
        : v;
    if (await run(() => register(kind, body))) router.push("/dashboard");
  };

  return (
    <AuthShell
      wide
      title="إنشاء حساب جديد"
      subtitle="اختر نوع الحساب، ثم أكمل بياناتك. يستغرق ذلك دقيقتين."
      footer={<>لديك حساب؟ <Link href="/login" className="font-medium text-brand hover:underline">سجّل الدخول</Link></>}
    >
      <div role="radiogroup" aria-label="نوع الحساب" className="mb-8 grid gap-3 sm:grid-cols-2">
        {KINDS.map(({ key, icon: Icon, title, text }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={kind === key}
            onClick={() => setKind(key)}
            className={cx(
              "flex items-start gap-3 rounded-2xl border p-4 text-start transition",
              kind === key ? "border-brand bg-brand-soft ring-4 ring-brand/10" : "border-line bg-surface hover:border-brand/40",
            )}
          >
            <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", kind === key ? "bg-brand text-white" : "bg-muted text-subtle")}><Icon className="size-5" /></span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-subtle">{text}</span>
            </span>
          </button>
        ))}
      </div>

      <form key={kind} method="post" onSubmit={onSubmit} className="space-y-8">
        <Section title={kind === "student" ? "بيانات الحساب" : "بيانات مسؤول التدريب"}>
          <Field label={kind === "student" ? "الاسم الكامل" : "اسم مسؤول التدريب"} name="name" required minLength={2} autoComplete="name" />
          <Field label="البريد الإلكتروني" name="email" type="email" autoComplete="email" required dir="ltr" placeholder="name@example.com" />
          <PasswordField label="كلمة المرور (8 أحرف على الأقل)" name="password" autoComplete="new-password" minLength={8} showStrength />
        </Section>

        {kind === "student" ? (
          <Section title="البيانات الأكاديمية">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الرقم الجامعي" name="universityId" required minLength={3} dir="ltr" />
              <UniversityField />
            </div>
            <MajorField />
            <GpaField />
            <Field label="مهاراتك الحالية (اختياري)" name="skills" placeholder="مثال: Excel، خدمة العملاء، Python" hint="افصل بينها بفاصلة. تساعد في تخصيص خطة تدريبك." />
          </Section>
        ) : (
          <Section title="بيانات الجهة">
            <Field label="اسم الجهة" name="companyName" required minLength={2} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="رقم السجل التجاري" name="crNumber" pattern="\d{10}" required dir="ltr" hint="10 أرقام" inputMode="numeric" />
              <Field label="المدينة" name="city" required placeholder="مثال: الرياض" />
            </div>
            <Field label="القطاع" name="sector" required placeholder="مثال: الرعاية الصحية" />
            <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs leading-5 text-subtle">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              تراجع وحدة التدريب السجل التجاري قبل ظهور الجهة للطلاب وقبل نشر الفرص.
            </p>
          </Section>
        )}

        <div className="space-y-3">
          <Alert>{error}</Alert>
          <Button type="submit" disabled={busy} className="w-full py-3">{busy ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}</Button>
        </div>
      </form>
    </AuthShell>
  );
}
