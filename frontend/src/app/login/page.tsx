"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthShell, PasswordField } from "@/components/auth-shell";
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
    <AuthShell
      title="مرحباً بعودتك"
      subtitle="سجّل الدخول لمتابعة خطة تدريبك وتقاريرك."
      footer={<>ليس لديك حساب؟ <Link href="/register" className="font-medium text-brand hover:underline">أنشئ حساباً جديداً</Link></>}
    >
      <form method="post" onSubmit={onSubmit} className="space-y-5">
        <Field label="البريد الإلكتروني" name="email" type="email" autoComplete="email" required dir="ltr" placeholder="name@example.com" />
        <PasswordField label="كلمة المرور" name="password" autoComplete="current-password" />
        <Alert>{error}</Alert>
        <Button type="submit" disabled={busy} className="w-full py-3">{busy ? "جارٍ الدخول..." : "تسجيل الدخول"}</Button>
      </form>
    </AuthShell>
  );
}
