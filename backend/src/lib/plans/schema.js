import { z } from 'zod';

// The shape every plan has, whether the engine or the AI agent produced it.
export const planContentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  goals: z.array(z.string()),
  skills: z.array(z.object({
    name: z.string(),
    category: z.enum(['technical', 'professional']),
  })),
  phases: z.array(z.object({
    key: z.string(),
    name: z.string(),
    startWeek: z.int(),
    endWeek: z.int(),
  })),
  weeks: z.array(z.object({
    weekNo: z.int(),
    phase: z.string(),
    theme: z.string(),
    objectives: z.array(z.string()),
    tasks: z.array(z.object({ id: z.string(), title: z.string(), done: z.boolean() })),
    deliverable: z.string(),
    skills: z.array(z.string()),
  })),
  milestones: z.array(z.object({ weekNo: z.int(), title: z.string() })),
  evaluation: z.array(z.object({ criterion: z.string(), weight: z.int() })),
});

// Structural checks the zod shape can't express.
export const checkPlanConsistency = (plan, durationWeeks) => {
  const problems = [];
  if (plan.weeks.length !== durationWeeks) problems.push(`expected ${durationWeeks} weeks, got ${plan.weeks.length}`);
  plan.weeks.forEach((w, i) => {
    if (w.weekNo !== i + 1) problems.push(`week ${i + 1} is numbered ${w.weekNo}`);
    if (w.tasks.length === 0) problems.push(`week ${i + 1} has no tasks`);
  });
  const weightSum = plan.evaluation.reduce((sum, e) => sum + e.weight, 0);
  if (weightSum !== 100) problems.push(`evaluation weights sum to ${weightSum}`);
  if (plan.milestones.some((m) => m.weekNo < 1 || m.weekNo > durationWeeks)) problems.push('milestone outside plan range');
  const taskIds = plan.weeks.flatMap((w) => w.tasks.map((t) => t.id));
  if (new Set(taskIds).size !== taskIds.length) problems.push('duplicate task ids');
  return problems;
};
