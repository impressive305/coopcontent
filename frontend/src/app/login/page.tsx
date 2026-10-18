"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth-shell";
import { Alert, Button, Field, formValues, useAction } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { busy, error, run } = useAction();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { email, password } = formValues(e.currentTarget);
    if (await run(() => login(email, password))) router.push("/dashboard");
  };

  return (
    <AuthShell title="تسجيل الدخول" footer={<>ليس لديك حساب؟ <Link href="/register" className="text-brand underline">أنشئ حساباً</Link></>}>
      <form method="post" onSubmit={onSubmit} className="space-y-4">
        <Field label="البريد الإلكتروني" name="email" type="email" autoComplete="email" required dir="ltr" />
        <Field label="كلمة المرور" name="password" type="password" autoComplete="current-password" required dir="ltr" />
        <Alert>{error}</Alert>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "جارٍ الدخول..." : "دخول"}</Button>
      </form>
    </AuthShell>
  );
}
