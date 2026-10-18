import { Bot, CalendarCheck, ClipboardList, FileText, LayoutDashboard, Briefcase, UserRound, Check } from "lucide-react";

// Static illustration of the student dashboard for the hero section.
export function DashboardPreview() {
  const nav = [
    [LayoutDashboard, "نظرة عامة", false],
    [Briefcase, "الفرص التدريبية", false],
    [CalendarCheck, "خطة التدريب", true],
    [FileText, "التقارير", false],
    [UserRound, "الملف الشخصي", false],
  ] as const;
  const tasks = [
    ["كتابة وثيقة متطلبات الميزة واعتمادها", true],
    ["تصميم البنية التقنية ومخطط البيانات", true],
    ["كتابة التقرير الأسبوعي ورفعه للمشرف", false],
  ] as const;
  return (
    <div aria-hidden className="relative rounded-2xl border border-black/10 bg-white p-3 shadow-2xl shadow-teal-900/10 dark:border-white/10 dark:bg-[#151922]">
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="flex gap-3">
        <div className="hidden w-40 shrink-0 space-y-1 rounded-xl bg-teal-900 p-2.5 text-[11px] text-teal-50 sm:block">
          <p className="mb-3 px-2 pt-1 text-xs font-bold">CoopConnect</p>
          {nav.map(([Icon, label, active]) => (
            <div key={label} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${active ? "bg-white/15 font-semibold" : "opacity-80"}`}>
              <Icon className="size-3.5" />
              {label}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["الأسبوع", "8 / 24"], ["المهام المنجزة", "64%"], ["التقارير المعتمدة", "7"]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-gray-50 p-2 dark:bg-white/5">
                <p className="text-sm font-bold">{v}</p>
                <p className="text-[10px] text-gray-500">{k}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-black/5 p-3 dark:border-white/10">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold">الأسبوع 8 · تحليل متطلبات المشروع</p>
              <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800 dark:bg-teal-500/20 dark:text-teal-100"><Bot className="size-3" /> خطة ذكية</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"><div className="h-full w-2/3 rounded-full bg-teal-600" /></div>
            <ul className="space-y-1.5 text-[11px]">
              {tasks.map(([t, done]) => (
                <li key={t} className="flex items-center gap-2">
                  <span className={`grid size-4 place-items-center rounded border ${done ? "border-teal-600 bg-teal-600 text-white" : "border-gray-300"}`}>{done && <Check className="size-3" />}</span>
                  <span className={done ? "text-gray-400 line-through" : ""}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
            <ClipboardList className="size-4 shrink-0" />
            التقرير الأسبوعي رقم 8 مستحق يوم الخميس
          </div>
        </div>
      </div>
    </div>
  );
}
