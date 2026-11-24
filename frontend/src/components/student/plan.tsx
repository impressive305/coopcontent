"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import type { TrainingPlan } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { Alert } from "../ui";
import { PlanBuilder } from "./plan-builder";
import { PlanWorkspace } from "./plan-workspace";

export { SOURCE_LABELS, TaskItem } from "./plan-shared";

export function TrainingPlanPage() {
  const { data, loading, error } = useData<TrainingPlan | null>("/plans/current");
  const [plan, setPlan] = useState<TrainingPlan | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const current = plan === undefined ? data : plan;

  if (loading && current === undefined) return <p className="text-sm text-subtle">جارٍ التحميل...</p>;
  if (error) return <Alert>{error}</Alert>;

  if (!current || creating) {
    return (
      <>
        {!current && (
          <section className="rounded-3xl bg-gradient-to-l from-blue-700 to-blue-900 p-6 text-white sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Bot className="size-6" />خطتك التدريبية تبدأ من هنا</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-blue-50/90">
              اكتب تخصصك والمجال الذي ستتدرب فيه، أياً كان. خذ مسودة جاهزة تعدّلها، أو ابنِ خطتك بنفسك أسبوعاً بأسبوع،
              ووزّع وقتك بين التدريب الميداني والتعلّم الذاتي.
            </p>
          </section>
        )}
        <PlanBuilder onCreated={(p) => { setPlan(p); setCreating(false); }} onCancel={current ? () => setCreating(false) : undefined} />
      </>
    );
  }

  // Keyed by plan so switching plans starts the workspace from that plan's content.
  return <PlanWorkspace key={current.id} plan={current} onReplace={setPlan} onNew={() => setCreating(true)} />;
}
