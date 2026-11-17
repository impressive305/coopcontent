"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useData } from "@/lib/use-data";
import { REVIEW_BADGES, ROLE_LABELS, type AdminCompany, type AdminUser } from "../admin/types";
import { Alert, Card, Empty, StatusBadge, formatDate } from "../ui";

type Stats = {
  students: number;
  users: Partial<Record<"STUDENT" | "COMPANY" | "SUPERVISOR" | "ADMIN", number>>;
  newUsers: number;
  suspended: number;
  companies: number;
  pendingCompanies: number;
  openOpportunities: number;
  applications: Partial<Record<"PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN", number>>;
  activePlacements: number;
  pendingReports: number;
  activePlans: number;
};

function StatTiles({ stats }: { stats: Stats }) {
  const tiles: [string, number, string][] = [
    ["الطلاب", stats.students, "/dashboard/manage/users"],
    ["تسجيلات آخر 7 أيام", stats.newUsers, "/dashboard/manage/users"],
    ["جهات معتمدة", stats.companies, "/dashboard/manage/companies"],
    ["طلبات تسجيل جهات", stats.pendingCompanies, "/dashboard/manage/companies"],
    ["فرص مفتوحة", stats.openOpportunities, "/dashboard/manage/opportunities"],
    ["طلبات قيد المراجعة", stats.applications.PENDING ?? 0, "/dashboard/manage/opportunities"],
    ["متدربون حالياً", stats.activePlacements, "/dashboard/manage/placements"],
    ["تقارير بانتظار المراجعة", stats.pendingReports, "/dashboard/manage/placements"],
    ["خطط تدريب نشطة", stats.activePlans, "/dashboard/manage/users"],
    ["حسابات موقوفة", stats.suspended, "/dashboard/manage/users"],
    ["حسابات الجهات", stats.users.COMPANY ?? 0, "/dashboard/manage/users"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map(([label, value, href]) => (
        <Link key={label} href={href} className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-brand dark:border-white/10 dark:bg-white/5">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </Link>
      ))}
    </div>
  );
}

const More = ({ href }: { href: string }) => (
  <Link href={href} className="flex items-center gap-1 text-sm text-brand hover:underline">إدارة <ArrowLeft className="size-4" /></Link>
);

export function AdminDashboard() {
  const stats = useData<Stats>("/admin/stats");
  const users = useData<AdminUser[]>("/admin/users");
  const pending = useData<AdminCompany[]>("/admin/companies?status=PENDING,CONTACTED");

  return (
    <>
      {stats.data && <StatTiles stats={stats.data} />}
      <Alert>{stats.error}</Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="أحدث التسجيلات" actions={<More href="/dashboard/manage/users" />}>
          {users.data?.length === 0 && <Empty>لا توجد حسابات بعد.</Empty>}
          <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
            {users.data?.slice(0, 8).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{u.name}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {ROLE_LABELS[u.role]}{u.student && ` · ${u.student.university}`}{u.company && ` · ${u.company.name}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-gray-500">{formatDate(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="طلبات تسجيل الجهات" description="تُعتمد الجهة بعد مراجعة طلبها والتواصل مع مسؤول التدريب." actions={<More href="/dashboard/manage/companies" />}>
          {pending.data?.length === 0 && <Empty>لا توجد طلبات بانتظار المراجعة.</Empty>}
          <ul className="divide-y divide-line text-sm">
            {pending.data?.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">{c.name}<StatusBadge status={REVIEW_BADGES[c.reviewStatus]} /></p>
                  <p className="text-xs text-subtle">{c.user?.name} · {c.city} · {c.sector} · {formatDate(c.createdAt)}</p>
                </div>
                <Link href="/dashboard/manage/companies" className="shrink-0 text-sm font-medium text-brand hover:underline">مراجعة</Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
