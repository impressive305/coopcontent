"use client";

import { type CompanyProfile } from "@/lib/api";
import { Alert, Button, Field, formValues, useAction } from "./ui";

// Only the profile itself: approval and the accreditation badge are not part of it.
export type CompanyProfileInput = Omit<CompanyProfile, "id" | "verified" | "accredited" | "reviewStatus" | "logoVersion">;

// The directory profile students see. Used by companies for themselves and by the admin.
export function CompanyProfileForm({ initial, submitLabel, onSubmit }: { initial?: Partial<CompanyProfile>; submitLabel: string; onSubmit: (body: CompanyProfileInput) => Promise<unknown> }) {
  const action = useAction();
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    const body: CompanyProfileInput = {
      name: v.name,
      city: v.city,
      sector: v.sector,
      description: v.description.trim() || null,
      website: v.website.trim() || null,
      contactEmail: v.contactEmail.trim() || null,
      phone: v.phone.trim() || null,
      address: v.address.trim() || null,
      majors: v.majors.split(/[,،]/).map((m) => m.trim()).filter(Boolean),
      coopOpen: v.coopOpen === "on",
    };
    if (await action.run(() => onSubmit(body)) && !initial) form.reset();
  };

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Field label="اسم الجهة" name="name" required minLength={2} defaultValue={initial?.name} />
      <Field label="القطاع" name="sector" required minLength={2} defaultValue={initial?.sector} placeholder="مثال: تقنية المعلومات" />
      <div className="sm:col-span-2"><Field label="نبذة عن الجهة وبرنامج التدريب" name="description" textarea maxLength={3000} defaultValue={initial?.description ?? ""} /></div>
      <Field label="المدينة" name="city" required minLength={2} defaultValue={initial?.city} />
      <Field label="العنوان / الحي (اختياري)" name="address" maxLength={300} defaultValue={initial?.address ?? ""} />
      <Field label="الموقع الإلكتروني" name="website" type="url" placeholder="https://" dir="ltr" defaultValue={initial?.website ?? ""} />
      <Field label="بريد التقديم على التدريب" name="contactEmail" type="email" dir="ltr" defaultValue={initial?.contactEmail ?? ""} />
      <Field label="رقم التواصل (اختياري)" name="phone" maxLength={30} dir="ltr" defaultValue={initial?.phone ?? ""} />
      <Field label="التخصصات المطلوبة (مفصولة بفواصل)" name="majors" defaultValue={initial?.majors?.join("، ")} placeholder="علوم الحاسب، نظم المعلومات" />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="coopOpen" defaultChecked={initial?.coopOpen ?? true} className="size-4 accent-teal-700" />
        التدريب التعاوني مفتوح حالياً (تظهر الجهة للطلاب)
      </label>
      <div className="space-y-3 sm:col-span-2">
        <Alert>{action.error}</Alert>
        {!action.busy && !action.error && action.done && <Alert tone="green">تم الحفظ.</Alert>}
        <Button type="submit" disabled={action.busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}
