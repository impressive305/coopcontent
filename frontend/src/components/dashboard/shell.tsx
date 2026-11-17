"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Briefcase, Building2, CalendarCheck, ClipboardList, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Route, UserRound, Users, X,
  type LucideIcon,
} from "lucide-react";
import type { Role, User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "../theme-toggle";
import { cx } from "../ui";

type NavItem = { href: string; label: string; description: string; icon: LucideIcon; badge?: string };
type NavGroup = { title?: string; items: NavItem[] };

const navByRole: Record<Role, NavGroup[]> = {
  STUDENT: [
    { items: [{ href: "/dashboard", label: "نظرة عامة", description: "ملخص تدريبك وخطوتك التالية", icon: LayoutDashboard }] },
    {
      title: "التدريب",
      items: [
        { href: "/dashboard/plan", label: "خطة التدريب", description: "رتّب تدريبك أسبوعاً بأسبوع وتابع إنجازك", icon: CalendarCheck },
        { href: "/dashboard/opportunities", label: "الفرص التدريبية", description: "الجهات التي تفتح التدريب التعاوني وطرق التقديم", icon: Briefcase },
        { href: "/dashboard/applications", label: "طلباتي", description: "طلباتك المقدّمة عبر المنصة وحالتها", icon: ClipboardList },
        { href: "/dashboard/reports", label: "التقارير", description: "اكتب تقاريرك وتعلّم كيف تجعلها احترافية", icon: FileText },
      ],
    },
    { title: "الحساب", items: [{ href: "/dashboard/profile", label: "الملف الشخصي", description: "بياناتك الأكاديمية ومهاراتك", icon: UserRound }] },
  ],
  COMPANY: [{ items: [{ href: "/dashboard", label: "لوحة الجهة", description: "ملف الجهة وفرصها ومتدربوها", icon: LayoutDashboard }] }],
  // The supervisor role is paused (see lib/features.ts); its accounts cannot sign in.
  SUPERVISOR: [{ items: [{ href: "/dashboard", label: "طلابي وتقاريرهم", description: "", icon: LayoutDashboard }] }],
  ADMIN: [
    { items: [{ href: "/dashboard", label: "نظرة عامة", description: "مؤشرات المنصة وما يحتاج إلى إجراء", icon: LayoutDashboard }] },
    {
      title: "الإدارة",
      items: [
        { href: "/dashboard/manage/users", label: "المستخدمون", description: "كل الحسابات المسجلة وصلاحياتها", icon: Users },
        { href: "/dashboard/manage/companies", label: "جهات التدريب", description: "الدليل الذي يراه الطلاب، والاعتماد والشعارات", icon: Building2 },
        { href: "/dashboard/manage/opportunities", label: "الفرص والطلبات", description: "الفرص المنشورة على المنصة وطلبات الطلاب", icon: Briefcase },
        { href: "/dashboard/manage/placements", label: "حالات التدريب", description: "المتدربون الحاليون وتقاريرهم", icon: GraduationCap },
      ],
    },
  ],
};

export const roleLabels: Record<Role, string> = { STUDENT: "طالب", COMPANY: "جهة تدريب", SUPERVISOR: "مشرف أكاديمي", ADMIN: "مسؤول النظام" };

const isActive = (href: string, pathname: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

function Sidebar({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0b2f2c] to-[#071d1b] text-teal-50">
      <Link href="/" className="flex items-center gap-2.5 px-5 pt-6 pb-8 text-lg font-bold" onClick={onNavigate}>
        <span className="grid size-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><Route className="size-[18px]" /></span>
        CoopConnect
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3" aria-label="القائمة الرئيسية">
        {navByRole[user.role].map((group, i) => (
          <div key={group.title ?? i}>
            {group.title && <p className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-teal-200/50">{group.title}</p>}
            <ul className="space-y-1">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(href, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                        active ? "bg-white/10 font-semibold text-white" : "text-teal-100/75 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {active && <span aria-hidden className="absolute inset-y-2 start-0 w-1 rounded-full bg-teal-300" />}
                      <Icon className="size-[18px]" />
                      <span className="flex-1">{label}</span>
                      {badge && <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] font-semibold text-teal-100">{badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-400/20 text-sm font-bold text-teal-100">{user.name.trim().charAt(0)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-teal-200/60">{roleLabels[user.role]}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-sm text-teal-100/80 transition hover:bg-white/5 hover:text-white"
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
  const current = navByRole[user.role].flatMap((g) => g.items).find((i) => isActive(i.href, pathname));

  return (
    <div className="min-h-full">
      {/* Desktop sidebar: fixed on the start (right) edge */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[17rem] lg:block">
        <Sidebar user={user} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="إغلاق القائمة" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 shadow-2xl">
            <button aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="absolute end-3 top-6 z-10 rounded-lg p-1 text-teal-100 hover:bg-white/10"><X className="size-5" /></button>
            <Sidebar user={user} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:ps-[17rem]">
        <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:px-8">
            <button aria-label="فتح القائمة" onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-muted lg:hidden"><Menu className="size-5" /></button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold">{current?.label ?? "لوحة التحكم"}</h1>
              {current?.description && <p className="hidden truncate text-xs text-subtle sm:block">{current.description}</p>}
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
