"use client";

import { useState } from "react";
import { Building2, Check, GraduationCap, ShieldCheck, Users } from "lucide-react";

const roles = [
  {
    key: "student", label: "الطالب", icon: GraduationCap,
    title: "تدريبك كله في لوحة واحدة",
    points: ["تصفّح الفرص المناسبة لتخصصك ومدينتك والتقديم بنقرة", "خطة تدريب أسبوعية يولّدها المساعد الذكي حسب تخصصك ومسارك", "متابعة المهام الأسبوعية ونسبة الإنجاز", "رفع التقارير الأسبوعية والنهائية واستلام ملاحظات المشرف", "ملف شخصي بمهاراتك ومعدلك وتخصصك"],
  },
  {
    key: "supervisor", label: "المشرف الأكاديمي", icon: Users,
    title: "متابعة كل طلابك دون رسائل متفرقة",
    points: ["قائمة الطلاب المسندين وحالة كل منهم", "مراجعة التقارير واعتمادها أو إعادتها مع ملاحظات مكتوبة", "سجل كامل لتقارير كل طالب منذ بداية التدريب", "إنهاء التدريب بعد اعتماد التقرير النهائي"],
  },
  {
    key: "company", label: "جهة التدريب", icon: Building2,
    title: "استقطاب المتدربين بإجراءات واضحة",
    points: ["نشر الفرص التدريبية بالتخصص والمدينة والمقاعد والمدة", "فرز المتقدمين ومراجعة ملفاتهم ومهاراتهم", "قبول المتدرب وتحديد تاريخ البدء فينشأ سجل التدريب تلقائياً", "متابعة المتدربين الحاليين"],
  },
  {
    key: "admin", label: "وحدة التدريب", icon: ShieldCheck,
    title: "حوكمة البرنامج وبياناته",
    points: ["اعتماد جهات التدريب بعد التحقق من السجل التجاري", "إضافة المشرفين وإسنادهم للطلاب", "مؤشرات لحظية: المتدربون، الطلبات، التقارير المعلّقة", "بيانات موثّقة تدعم متطلبات الاعتماد الأكاديمي"],
  },
];

export function RoleTabs() {
  const [active, setActive] = useState(roles[0].key);
  const role = roles.find((r) => r.key === active)!;
  const Icon = role.icon;
  return (
    <div>
      <div role="tablist" className="mx-auto mb-8 flex max-w-2xl flex-wrap justify-center gap-2">
        {roles.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={r.key === active}
            onClick={() => setActive(r.key)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${r.key === active ? "bg-brand text-white shadow" : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200"}`}
          >
            <r.icon className="size-4" />
            {r.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mx-auto grid max-w-4xl items-center gap-8 rounded-2xl border border-black/10 bg-white p-6 sm:p-10 md:grid-cols-[auto_1fr] dark:border-white/10 dark:bg-white/5">
        <div className="grid size-20 place-items-center rounded-2xl bg-teal-50 text-brand dark:bg-teal-500/15"><Icon className="size-10" /></div>
        <div>
          <h3 className="mb-4 text-xl font-bold">{role.title}</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {role.points.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
