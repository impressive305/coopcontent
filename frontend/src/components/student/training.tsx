"use client";

import Link from "next/link";
import { CheckCircle2, Clock, FileText, RotateCcw } from "lucide-react";
import { placementTitle, placementWeeksElapsed, type Placement, type Report } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { ReportsList } from "../reports";
import { Card, StatusBadge, formatDate } from "../ui";
import { ReportGuide } from "./report-guide";

function Counter({ icon: Icon, label, value, tone }: { icon: typeof FileText; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
      <Icon className={`size-5 ${tone}`} />
      <span>
        <span className="block text-lg leading-6 font-bold">{value}</span>
        <span className="text-xs text-subtle">{label}</span>
      </span>
    </div>
  );
}

function PlacementReports({ placement }: { placement: Placement }) {
  const reports = useData<Report[]>(`/placements/${placement.id}/reports`);
  const list = reports.data ?? [];
  const weekly = list.filter((r) => r.type === "WEEKLY");
  // How far behind the weekly reports are.
  const missing = Math.max(0, placementWeeksElapsed(placement) - weekly.length);

  return (
    <Card
      title={placementTitle(placement)}
      description={`${placement.company.name} · ${formatDate(placement.startDate)} إلى ${formatDate(placement.endDate)}`}
      actions={<StatusBadge status={placement.status} />}
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter icon={FileText} label="تقارير مرفوعة" value={list.length} tone="text-brand" />
        <Counter icon={CheckCircle2} label="معتمدة" value={list.filter((r) => r.status === "APPROVED").length} tone="text-emerald-600" />
        <Counter icon={RotateCcw} label="مُعادة للتعديل" value={list.filter((r) => r.status === "RETURNED").length} tone="text-amber-600" />
        <Counter icon={Clock} label="أسابيع بلا تقرير" value={placement.status === "ACTIVE" ? missing : 0} tone="text-red-600" />
      </div>
      <ReportsList placementId={placement.id} mode={placement.status === "ACTIVE" ? "student" : "readonly"} onChange={reports.reload} />
    </Card>
  );
}

export function TrainingReports() {
  const { data } = useData<Placement[]>("/placements");
  const placement = data?.find((p) => p.status === "ACTIVE") ?? data?.[0];

  return (
    <div className="grid grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      <div className="min-w-0">
        {data && !placement && (
          <Card title="تقاريري">
            <p className="text-sm leading-7 text-subtle">
              تبدأ برفع التقارير بعد تسجيل تدريبك في المنصة: تلقائياً عند قبولك في فرصة منشورة على المنصة، أو عن طريق وحدة التدريب إن قُبلت
              بالتواصل المباشر مع الجهة. إلى ذلك الحين، اقرأ الدليل لتبدأ بداية صحيحة.
            </p>
            <Link href="/dashboard/opportunities" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">تصفّح جهات التدريب</Link>
          </Card>
        )}
        {placement && <PlacementReports placement={placement} />}
      </div>
      <div className="2xl:sticky 2xl:top-24">
        <ReportGuide />
      </div>
    </div>
  );
}
