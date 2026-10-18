"use client";

import Link from "next/link";
import { api, type Application } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert, Button, Card, Empty, StatusBadge, formatDate, useAction } from "../ui";

export function ApplicationsList() {
  const { data, error, reload } = useData<Application[]>("/applications/mine");
  const action = useAction();
  const withdraw = (id: number) => action.run(() => api(`/applications/${id}/withdraw`, { method: "PATCH" })).then(() => reload());

  return (
    <Card title={`طلباتي (${data?.length ?? 0})`}>
      <Alert>{error || action.error}</Alert>
      {data?.length === 0 && (
        <Empty>لم تقدّم على أي فرصة بعد. <Link href="/dashboard/opportunities" className="text-brand underline">تصفّح الفرص</Link></Empty>
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
  );
}
