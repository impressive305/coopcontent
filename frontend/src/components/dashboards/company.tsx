"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { DEGREES, api, placementTitle, type Application, type CompanyProfile, type CompanyReview, type Opportunity, type Placement, type User } from "@/lib/api";
import { LogoUploader } from "../company-logo";
import { CompanyProfileForm } from "../company-profile-form";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Empty, Field, StatusBadge, cx, formValues, formatDate, useAction } from "../ui";

function NewOpportunityForm({ onCreated }: { onCreated: () => void }) {
  const { busy, error, run } = useAction();
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    const body = { ...v, seats: Number(v.seats), durationWeeks: Number(v.durationWeeks) };
    if (await run(() => api("/opportunities", { method: "POST", body }))) {
      form.reset();
      onCreated();
    }
  };
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="عنوان الفرصة" name="title" required minLength={3} />
      <Field label="التخصص المطلوب" name="major" required placeholder="Computer Science" />
      <div className="sm:col-span-2"><Field label="الوصف" name="description" textarea required minLength={10} /></div>
      <Field label="المدينة" name="city" required />
      <Field label="آخر موعد للتقديم" name="deadline" type="date" required />
      <Field label="عدد المقاعد" name="seats" type="number" min={1} max={500} required />
      <Field label="مدة التدريب (أسابيع)" name="durationWeeks" type="number" min={4} max={52} required defaultValue={24} />
      <div className="sm:col-span-2 space-y-3">
        <Alert>{error}</Alert>
        <Button type="submit" disabled={busy}>نشر الفرصة</Button>
      </div>
    </form>
  );
}

function Applicants({ opportunityId, onDecided }: { opportunityId: number; onDecided: () => void }) {
  const { data, error, reload } = useData<Application[]>(`/opportunities/${opportunityId}/applications`);
  const [startDate, setStartDate] = useState("");
  const action = useAction();
  const decide = (id: number, status: "ACCEPTED" | "REJECTED") =>
    action
      .run(() => api(`/applications/${id}/decision`, { method: "PATCH", body: status === "ACCEPTED" ? { status, startDate } : { status } }))
      .then((ok) => { if (ok) { reload(); onDecided(); } });

  if (data?.length === 0) return <Empty>لا يوجد متقدمون بعد.</Empty>;
  return (
    <div className="space-y-3">
      <div className="w-48"><Field label="تاريخ بدء التدريب (للقبول)" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
      <Alert>{error || action.error}</Alert>
      {data?.map((a) => (
        <div key={a.id} className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{a.student?.user.name} <span className="text-gray-500" dir="ltr">({a.student?.user.email})</span></p>
              <p className="text-gray-500">
                {a.student?.university} · {a.student?.degree ? `${DEGREES[a.student.degree]} · ` : ""}{a.student?.major}{a.student?.gpa ? ` · المعدل ${a.student.gpa}${a.student.gpaScale ? ` من ${a.student.gpaScale}` : ""}` : ""}
                {a.student?.skills.length ? ` · ${a.student.skills.join("، ")}` : ""}
              </p>
            </div>
            {a.status === "PENDING" ? (
              <div className="flex gap-2">
                <Button disabled={action.busy || !startDate} title={startDate ? undefined : "حدد تاريخ البدء أولاً"} onClick={() => decide(a.id, "ACCEPTED")}>قبول</Button>
                <Button variant="danger" disabled={action.busy} onClick={() => decide(a.id, "REJECTED")}>رفض</Button>
              </div>
            ) : (
              <StatusBadge status={a.status} />
            )}
          </div>
          {a.coverLetter && <p className="mt-2 whitespace-pre-line text-gray-700 dark:text-gray-300">{a.coverLetter}</p>}
        </div>
      ))}
    </div>
  );
}

// What a company sees until its sign-up request is approved.
function RequestStatus({ name, status }: { name: string; status: CompanyReview }) {
  if (status === "REJECTED") {
    return (
      <Card title="لم يُعتمد طلب التسجيل">
        <p className="text-sm leading-7 text-subtle">
          راجعت وحدة التدريب طلب تسجيل {name} ولم يُعتمد. للاستفسار أو لإعادة النظر، تواصلوا مع وحدة التدريب.
        </p>
      </Card>
    );
  }
  const steps = [
    { title: "استلام الطلب", text: "وصل طلبكم إلى وحدة التدريب.", done: true },
    { title: "التواصل واستكمال البيانات", text: "يتواصل معكم فريق وحدة التدريب على البريد المسجّل لاستكمال بيانات الجهة، مثل السجل التجاري.", done: status === "CONTACTED" },
    { title: "اعتماد الجهة", text: "بعد الاعتماد تظهر الجهة للطلاب، ويمكنكم نشر الفرص واستقبال الطلبات.", done: false },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <Card title="طلب التسجيل قيد المراجعة" description={`شكراً لتسجيل ${name}. هذه مراحل طلبكم:`}>
      <ol className="space-y-5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className={cx("grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold", s.done ? "bg-brand text-white" : i === current ? "bg-surface text-brand ring-2 ring-brand" : "bg-muted text-subtle")}>
              {s.done ? <Check className="size-4" /> : i + 1}
            </span>
            <span>
              <span className={cx("block text-sm font-semibold", !s.done && i !== current && "text-subtle")}>{s.title}</span>
              <span className="mt-0.5 block text-sm leading-6 text-subtle">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ProfileCard() {
  const { data, error, reload } = useData<CompanyProfile>("/companies/me");
  return (
    <Card title="ملف الجهة كما يراه الطلاب" description="يتواصل الطلاب معكم مباشرة عبر بريد التقديم وموقعكم الإلكتروني، لذا احرصوا على اكتمال هذه البيانات.">
      <Alert>{error}</Alert>
      {data && (
        <div className="space-y-6">
          <LogoUploader endpoint="/companies/me/logo" companyId={data.id} name={data.name} version={data.logoVersion} onChange={reload} />
          {!data.verified && <p className="text-xs text-subtle">يظهر الشعار للطلاب بعد اعتماد الجهة.</p>}
          <CompanyProfileForm initial={data} submitLabel="حفظ الملف" onSubmit={(body) => api("/companies/me", { method: "PATCH", body }).then(reload)} />
        </div>
      )}
    </Card>
  );
}

export function CompanyDashboard({ user }: { user: User }) {
  const opportunities = useData<Opportunity[]>("/opportunities/mine");
  const placements = useData<Placement[]>("/placements");
  const [expanded, setExpanded] = useState<number | null>(null);
  const toggle = useAction();

  if (!user.company?.verified) return <RequestStatus name={user.company?.name ?? ""} status={user.company?.reviewStatus ?? "PENDING"} />;

  const setOpen = (o: Opportunity) =>
    toggle.run(() => api(`/opportunities/${o.id}`, { method: "PATCH", body: { isOpen: !o.isOpen } })).then(() => opportunities.reload());

  return (
    <>
      <ProfileCard />
      <Card title="نشر فرصة تدريبية جديدة">
        <NewOpportunityForm onCreated={opportunities.reload} />
      </Card>

      <Card title="فرصنا التدريبية">
        <Alert>{opportunities.error || toggle.error}</Alert>
        {opportunities.data?.length === 0 && <Empty>لم تنشر أي فرصة بعد.</Empty>}
        <div className="space-y-3">
          {opportunities.data?.map((o) => (
            <div key={o.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{o.title}</h3>
                  <p className="text-sm text-gray-500">
                    {o.seats} مقاعد · {o._count?.applications ?? 0} متقدم · آخر موعد {formatDate(o.deadline)} · {o.isOpen ? "مفتوحة" : "مغلقة"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setOpen(o)}>{o.isOpen ? "إغلاق" : "إعادة فتح"}</Button>
                  <Button onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{expanded === o.id ? "إخفاء المتقدمين" : "المتقدمون"}</Button>
                </div>
              </div>
              {expanded === o.id && <div className="mt-4"><Applicants opportunityId={o.id} onDecided={() => { opportunities.reload(); placements.reload(); }} /></div>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="المتدربون لدينا">
        {placements.data?.length === 0 && <Empty>لا يوجد متدربون حالياً.</Empty>}
        <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
          {placements.data?.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span>{p.student.user.name} · {placementTitle(p)} · {formatDate(p.startDate)} إلى {formatDate(p.endDate)}</span>
              <StatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
