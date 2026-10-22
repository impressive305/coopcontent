import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound } from '../lib/errors.js';
import { currentStudent } from '../lib/actors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { MAJORS, findMajor, matchMajor } from '../lib/plans/catalog.js';
import { generateEnginePlan } from '../lib/plans/engine.js';
import { aiAvailable, generateAiPlan } from '../lib/plans/ai.js';
import { derivePhases, planEditSchema } from '../lib/plans/schema.js';

const router = Router();
router.use(authenticate, requireRole('STUDENT'));

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const createSchema = z.object({
  majorKey: z.string(),
  trackKey: z.string(),
  durationWeeks: z.int().min(4).max(52),
  hoursPerWeek: z.int().min(10).max(48).default(40),
  startDate: z.coerce.date().optional(),
  goals: z.string().trim().max(1000).optional(),
  useAi: z.boolean().default(true),
});

const manualSchema = z.object({
  title: z.string().trim().min(1).max(200),
  durationWeeks: z.int().min(1).max(52),
  hoursPerWeek: z.int().min(1).max(60).default(40),
  startDate: z.coerce.date().optional(),
});

// Saves `data` as the student's only active plan.
const createActivePlan = (studentId, data) =>
  prisma.$transaction(async (tx) => {
    await tx.trainingPlan.updateMany({ where: { studentId, isActive: true }, data: { isActive: false } });
    return tx.trainingPlan.create({ data: { studentId, ...data } });
  });

const activePlacement = (studentId) =>
  prisma.placement.findFirst({
    where: { studentId, status: 'ACTIVE' },
    include: { company: true, application: { include: { opportunity: true } } },
  });

// Majors/tracks for the plan wizard, pre-selected from the student's profile and placement.
router.get('/catalog', async (req, res) => {
  const student = await currentStudent(req.user.id);
  const placement = await activePlacement(student.id);
  res.json({
    aiAvailable: aiAvailable(),
    suggestedMajor: matchMajor(student.major)?.key ?? null,
    placement: placement && {
      company: placement.company.name,
      opportunity: placement.application.opportunity.title,
      startDate: placement.startDate,
      durationWeeks: Math.round((placement.endDate - placement.startDate) / WEEK_MS),
    },
    majors: MAJORS.map((m) => ({
      key: m.key,
      name: m.name,
      nameEn: m.nameEn,
      tracks: m.tracks.map((t) => ({ key: t.key, name: t.name, tools: t.tools, project: t.project })),
    })),
  });
});

router.get('/', async (req, res) => {
  const student = await currentStudent(req.user.id);
  const plans = await prisma.trainingPlan.findMany({
    where: { studentId: student.id },
    select: { id: true, majorKey: true, trackKey: true, durationWeeks: true, source: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(plans);
});

router.get('/current', async (req, res) => {
  const student = await currentStudent(req.user.id);
  const plan = await prisma.trainingPlan.findFirst({ where: { studentId: student.id, isActive: true } });
  res.json(plan);
});

router.post('/', validate(createSchema), async (req, res) => {
  const student = await currentStudent(req.user.id);
  const { majorKey, trackKey, durationWeeks, hoursPerWeek, goals, useAi } = req.body;
  const major = findMajor(majorKey);
  const track = major?.tracks.find((t) => t.key === trackKey);
  if (!major || !track) throw new HttpError(400, 'Unknown major or track');

  const placement = await activePlacement(student.id);
  const startDate = req.body.startDate ?? placement?.startDate;
  const ctx = {
    major,
    track,
    durationWeeks,
    hoursPerWeek,
    startDate,
    goals,
    university: student.university,
    currentSkills: student.skills,
    company: placement?.company.name,
    sector: placement?.company.sector,
    opportunity: placement && {
      title: placement.application.opportunity.title,
      description: placement.application.opportunity.description,
    },
  };

  const draft = generateEnginePlan(ctx);
  let content = draft;
  let source = 'ENGINE';
  let model = null;
  let notice = null;
  if (useAi && aiAvailable()) {
    try {
      ({ plan: content, model } = await generateAiPlan(ctx, draft));
      source = 'AI';
    } catch (err) {
      console.error('AI plan generation failed, using engine plan:', err.message);
      notice = 'تعذّر توليد الخطة بالذكاء الاصطناعي، فأُنشئت بالمحرك المدمج.';
    }
  }

  const plan = await createActivePlan(student.id, {
    placementId: placement?.id,
    majorKey,
    trackKey,
    durationWeeks,
    hoursPerWeek,
    startDate,
    source,
    model,
    content,
  });
  res.status(201).json({ ...plan, notice });
});

// An empty week-by-week skeleton the student fills in themselves.
router.post('/manual', validate(manualSchema), async (req, res) => {
  const student = await currentStudent(req.user.id);
  const { title, durationWeeks, hoursPerWeek } = req.body;
  const placement = await activePlacement(student.id);
  const plan = await createActivePlan(student.id, {
    placementId: placement?.id,
    durationWeeks,
    hoursPerWeek,
    startDate: req.body.startDate ?? placement?.startDate,
    source: 'MANUAL',
    content: {
      title,
      summary: '',
      goals: [],
      skills: [],
      phases: [],
      weeks: Array.from({ length: durationWeeks }, (_, i) => ({
        weekNo: i + 1,
        phase: '',
        theme: `الأسبوع ${i + 1}`,
        objectives: [],
        tasks: [],
        deliverable: '',
        skills: [],
      })),
      milestones: [],
      evaluation: [],
    },
  });
  res.status(201).json(plan);
});

const loadOwnPlan = async (userId, id) => {
  const student = await currentStudent(userId);
  const plan = await prisma.trainingPlan.findFirst({ where: { id, studentId: student.id } });
  if (!plan) throw notFound('Plan');
  return plan;
};

router.patch(
  '/:id/tasks/:taskId',
  validate(z.object({ done: z.boolean() })),
  async (req, res) => {
    const plan = await loadOwnPlan(req.user.id, Number(req.params.id));
    const content = plan.content;
    const task = content.weeks.flatMap((w) => w.tasks).find((t) => t.id === req.params.taskId);
    if (!task) throw notFound('Task');
    task.done = req.body.done;
    const updated = await prisma.trainingPlan.update({ where: { id: plan.id }, data: { content } });
    res.json(updated);
  },
);

// Replaces the plan's editable content: the student may rename, add, remove
// and reorder weeks and tasks, whatever produced the plan.
router.put('/:id', validate(planEditSchema), async (req, res) => {
  const plan = await loadOwnPlan(req.user.id, Number(req.params.id));
  const { weeks: edited, ...overview } = req.body;
  const taskIds = edited.flatMap((w) => w.tasks.map((t) => t.id));
  if (new Set(taskIds).size !== taskIds.length) throw new HttpError(400, 'Duplicate task ids');

  const weeks = edited.map(({ milestone, ...w }, i) => ({ ...w, weekNo: i + 1 }));
  const content = {
    ...plan.content,
    ...overview,
    weeks,
    phases: derivePhases(weeks),
    milestones: edited.flatMap((w, i) => (w.milestone ? [{ weekNo: i + 1, title: w.milestone }] : [])),
  };
  const updated = await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { content, durationWeeks: weeks.length },
  });
  res.json(updated);
});

router.patch('/:id/activate', async (req, res) => {
  const plan = await loadOwnPlan(req.user.id, Number(req.params.id));
  const [, updated] = await prisma.$transaction([
    prisma.trainingPlan.updateMany({ where: { studentId: plan.studentId, isActive: true }, data: { isActive: false } }),
    prisma.trainingPlan.update({ where: { id: plan.id }, data: { isActive: true } }),
  ]);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const plan = await loadOwnPlan(req.user.id, Number(req.params.id));
  await prisma.trainingPlan.delete({ where: { id: plan.id } });
  res.status(204).end();
});

export default router;
