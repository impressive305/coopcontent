"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { api, type Application } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Empty, StatusBadge, formatDate, useAction } from "../ui";

// What this page is for, and what it does not cover.
function AboutApplications() {
  return (
    <section className="flex gap-3 rounded-2xl border border-line bg-brand-soft p-5 text-sm leading-7">
      <Info className="mt-1 size-5 shrink-0 text-brand" aria-hidden />
      <div>
        <p className="font-semibold">ما فائدة هذه الصفحة؟</p>
        <p className="text-subtle">
          هنا تتابع الطلبات التي قدّمتها <strong className="font-semibold text-foreground">عبر المنصة</strong> على الفرص التي تنشرها الجهات فيها، وحالة كل طلب:
          قيد المراجعة، أو مقبول، أو مرفوض. يمكنك سحب الطلب ما دام قيد المراجعة، وعند قبولك يُسجَّل تدريبك تلقائياً وتُسحب طلباتك الأخرى.
        </p>
        <p className="mt-1 text-subtle">
          التقديم المباشر على الجهة (ببريدها أو من موقعها) لا يظهر هنا. إن قُبلت بهذه الطريقة، تسجّل وحدة التدريب تدريبك في المنصة لتبدأ برفع التقارير.
        </p>
      </div>
    </section>
  );
}

export function ApplicationsList() {
  const { data, error, reload } = useData<Application[]>("/applications/mine");
  const action = useAction();
  const withdraw = (id: number) => action.run(() => api(`/applications/${id}/withdraw`, { method: "PATCH" })).then(() => reload());

  return (
    <>
      <AboutApplications />
      <Card title={`طلباتي (${data?.length ?? 0})`}>
        <Alert>{error || action.error}</Alert>
        {data?.length === 0 && (
          <Empty>لم تقدّم على أي فرصة عبر المنصة بعد. <Link href="/dashboard/opportunities" className="text-brand underline">تصفّح الفرص</Link></Empty>
        )}
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {data?.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
              <div>
                <p className="font-semibold">{a.opportunity?.title}</p>
                <p className="text-gray-500">{a.opportunity?.company?.name} · قُدّم في {formatDate(a.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                {a.status === "PENDING" && <Button variant="secondary" disabled={action.busy} onClick={() => withdraw(a.id)}>سحب الطلب</Button>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
