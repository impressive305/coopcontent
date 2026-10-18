"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth-shell";
import { Alert, Button, Field, cx, formValues, useAction } from "@/components/ui";

type Kind = "student" | "company";

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
            skills: v.skills ? v.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
          }
        : v;
    if (await run(() => register(kind, body))) router.push("/dashboard");
  };

  return (
    <AuthShell title="إنشاء حساب" footer={<>لديك حساب؟ <Link href="/login" className="text-brand underline">سجّل الدخول</Link></>}>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-1 text-sm dark:bg-white/10">
        {(["student", "company"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cx("rounded-md py-1.5", kind === k && "bg-white font-semibold shadow-sm dark:bg-white/20")}>
            {k === "student" ? "طالب" : "جهة تدريب"}
          </button>
        ))}
      </div>
      <form key={kind} method="post" onSubmit={onSubmit} className="space-y-4">
        <Field label={kind === "student" ? "الاسم الكامل" : "اسم مسؤول التدريب"} name="name" required />
        <Field label="البريد الإلكتروني" name="email" type="email" autoComplete="email" required dir="ltr" />
        <Field label="كلمة المرور (8 أحرف على الأقل)" name="password" type="password" autoComplete="new-password" minLength={8} required dir="ltr" />
        {kind === "student" ? (
          <>
            <Field label="الرقم الجامعي" name="universityId" required dir="ltr" />
            <Field label="الجامعة" name="university" required />
            <Field label="التخصص" name="major" required placeholder="Computer Science" />
            <Field label="المعدل (اختياري، من 5)" name="gpa" type="number" step="0.01" min="0" max="5" dir="ltr" />
            <Field label="المهارات (مفصولة بفواصل)" name="skills" placeholder="React, SQL, Python" dir="ltr" />
          </>
        ) : (
          <>
            <Field label="اسم الجهة" name="companyName" required />
            <Field label="رقم السجل التجاري (10 أرقام)" name="crNumber" pattern="\d{10}" required dir="ltr" />
            <Field label="المدينة" name="city" required placeholder="Riyadh" />
            <Field label="القطاع" name="sector" required />
            <Alert tone="amber">يراجع مسؤول النظام حساب الجهة قبل السماح بنشر الفرص.</Alert>
          </>
        )}
        <Alert>{error}</Alert>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "جارٍ الإنشاء..." : "إنشاء الحساب"}</Button>
      </form>
    </AuthShell>
  );
}
