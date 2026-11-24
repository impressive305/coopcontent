"use client";

import { api, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DegreeField, GpaField, MajorField, UniversityField } from "../student-fields";
import { Alert, Button, Card, Field, formValues, useAction } from "../ui";

export function StudentProfile() {
  const { user, refresh } = useAuth();
  const action = useAction();
  if (!user?.student) return null;
  const s = user.student;

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const body = {
      name: v.name,
      university: v.university,
      major: v.major,
      degree: v.degree,
      gpa: v.gpa ? Number(v.gpa) : null,
      gpaScale: v.gpa ? Number(v.gpaScale) : null,
      skills: v.skills.split(",").map((x) => x.trim()).filter(Boolean),
    };
    if (await action.run(() => api<User>("/students/me", { method: "PATCH", body }))) await refresh();
  };

  return (
    <Card title="بياناتي">
      {!s.degree && <div className="mb-4"><Alert tone="amber">حدّد درجتك العلمية (دبلوم أو بكالوريوس) ثم احفظ.</Alert></div>}
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" name="name" required defaultValue={user.name} />
        <Field label="البريد الإلكتروني" value={user.email} disabled readOnly dir="ltr" />
        <Field label="الرقم الجامعي" value={s.universityId} disabled readOnly dir="ltr" />
        <UniversityField defaultValue={s.university} />
        <DegreeField defaultValue={s.degree} />
        <MajorField defaultValue={s.major} />
        <GpaField defaultValue={s.gpa} defaultScale={s.gpaScale} />
        <div className="sm:col-span-2">
          <Field label="المهارات (مفصولة بفواصل)" name="skills" defaultValue={s.skills.join(", ")} dir="ltr" />
          <p className="mt-1 text-xs text-gray-500">يستخدم المساعد الذكي مهاراتك الحالية لتجنّب تكرار ما تتقنه في خطتك.</p>
        </div>
        <div className="space-y-3 sm:col-span-2">
          <Alert>{action.error}</Alert>
          {!action.busy && !action.error && action.done && <Alert tone="green">تم حفظ التعديلات.</Alert>}
          <Button type="submit" disabled={action.busy}>حفظ</Button>
        </div>
      </form>
    </Card>
  );
}
