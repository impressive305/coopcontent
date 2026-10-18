"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Briefcase, CalendarCheck, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Route, UserRound, X,
  type LucideIcon,
} from "lucide-react";
import type { Role, User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cx } from "../ui";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };

const studentNav: NavItem[] = [
  { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/dashboard/plan", label: "خطة التدريب", icon: CalendarCheck, badge: "ذكية" },
  { href: "/dashboard/opportunities", label: "الفرص التدريبية", icon: Briefcase },
  { href: "/dashboard/applications", label: "طلباتي", icon: ClipboardList },
  { href: "/dashboard/reports", label: "التقارير", icon: FileText },
  { href: "/dashboard/profile", label: "الملف الشخصي", icon: UserRound },
];

const navByRole: Record<Role, NavItem[]> = {
  STUDENT: studentNav,
  COMPANY: [{ href: "/dashboard", label: "لوحة جهة التدريب", icon: LayoutDashboard }],
  SUPERVISOR: [{ href: "/dashboard", label: "طلابي وتقاريرهم", icon: LayoutDashboard }],
  ADMIN: [{ href: "/dashboard", label: "لوحة وحدة التدريب", icon: LayoutDashboard }],
};

export const roleLabels: Record<Role, string> = { STUDENT: "طالب", COMPANY: "جهة تدريب", SUPERVISOR: "مشرف أكاديمي", ADMIN: "مسؤول النظام" };

function Sidebar({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const items = navByRole[user.role];

  return (
    <div className="flex h-full flex-col bg-teal-950 text-teal-50">
      <Link href="/" className="flex items-center gap-2 px-5 py-5 text-lg font-bold" onClick={onNavigate}>
        <span className="grid size-8 place-items-center rounded-lg bg-white/15"><Route className="size-4" /></span>
        CoopConnect
      </Link>
      <nav className="flex-1 space-y-1 px-3" aria-label="القائمة الرئيسية">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active ? "bg-white font-semibold text-teal-950 shadow" : "text-teal-100 hover:bg-white/10",
              )}
            >
              <Icon className="size-[18px]" />
              <span className="flex-1">{label}</span>
              {badge && <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold", active ? "bg-teal-100 text-teal-900" : "bg-white/15")}>{badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-white/10 p-3">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-bold">{user.name.trim().charAt(0)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-teal-200">{roleLabels[user.role]}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 py-1.5 text-sm hover:bg-white/10"
        >
          <LogOut className="size-4" /> تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

export function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = navByRole[user.role].find((i) => (i.href === "/dashboard" ? pathname === i.href : pathname.startsWith(i.href)));

  return (
    <div className="min-h-full">
      {/* Desktop sidebar: fixed on the start (right) edge */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 lg:block">
        <Sidebar user={user} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="إغلاق القائمة" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 shadow-2xl">
            <button aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="absolute end-3 top-5 z-10 rounded-lg p-1 text-teal-100 hover:bg-white/10"><X className="size-5" /></button>
            <Sidebar user={user} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/5 bg-white/85 px-4 py-3 backdrop-blur sm:px-6 dark:border-white/10 dark:bg-[#0f1115]/85">
          <button aria-label="فتح القائمة" onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-black/5 lg:hidden dark:hover:bg-white/10"><Menu className="size-5" /></button>
          <h1 className="text-lg font-bold">{current?.label ?? "لوحة التحكم"}</h1>
        </header>
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
