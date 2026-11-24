"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, GraduationCap, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthShell, PasswordField } from "@/components/auth-shell";
import { DegreeField, GpaField, MajorField, UniversityField } from "@/components/student-fields";
import { Alert, Button, Field, cx, formValues, useAction } from "@/components/ui";

const SAUDI_CITIES = ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران", "الجبيل", "الأحساء", "القطيف", "الطائف", "تبوك", "أبها", "خميس مشيط", "بريدة", "عنيزة", "حائل", "جازان", "نجران", "الباحة", "سكاكا", "عرعر", "ينبع", "حفر الباطن", "نيوم"];
const COMPANY_SECTORS = ["تقنية المعلومات", "الرعاية الصحية", "البنوك والخدمات المالية", "جهة حكومية", "الاتصالات", "الطاقة والبتروكيماويات", "الصناعة والتصنيع", "الإنشاءات والهندسة", "الاستشارات", "التعليم", "التجزئة والتجارة", "النقل والطيران", "الإعلام", "القطاع غير الربحي"];

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
          <PasswordField label="كلمة المرور" name="password" autoComplete="new-password" showRules />
        </Section>

        {kind === "student" ? (
          <Section title="البيانات الأكاديمية">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الرقم الجامعي" name="universityId" required minLength={3} dir="ltr" />
              <UniversityField />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DegreeField />
              <MajorField />
            </div>
            <GpaField />
            <Field label="مهاراتك الحالية (اختياري)" name="skills" placeholder="مثال: Excel، خدمة العملاء، Python" hint="افصل بينها بفاصلة. تساعد في تخصيص خطة تدريبك." />
          </Section>
        ) : (
          <Section title="بيانات الجهة">
            <Field label="اسم الجهة" name="companyName" required minLength={2} maxLength={200} autoComplete="organization" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="المدينة" name="city" required minLength={2} maxLength={100} list="company-cities" placeholder="مثال: الرياض" />
              <Field label="القطاع" name="sector" required minLength={2} maxLength={100} list="company-sectors" placeholder="مثال: الرعاية الصحية" />
            </div>
            <datalist id="company-cities">{SAUDI_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            <datalist id="company-sectors">{COMPANY_SECTORS.map((s) => <option key={s} value={s} />)}</datalist>
            <div className="flex items-start gap-3 rounded-xl bg-muted p-4 text-xs leading-6 text-subtle">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>
                بعد إرسال الطلب يراجعه فريق وحدة التدريب ويتواصل معكم على البريد المسجّل لاستكمال بيانات الجهة، مثل السجل التجاري.
                تظهر الجهة للطلاب ويمكنكم نشر الفرص بعد اعتماد الطلب.
              </span>
            </div>
          </Section>
        )}

        <div className="space-y-3">
          <Alert>{error}</Alert>
          <Button type="submit" disabled={busy} className="w-full py-3">{busy ? "جارٍ الإرسال..." : kind === "company" ? "إرسال طلب التسجيل" : "إنشاء الحساب"}</Button>
        </div>
      </form>
    </AuthShell>
  );
}
