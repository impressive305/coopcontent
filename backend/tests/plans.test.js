import { api, auth, prisma, resetDb, sessionOf } from './setup.js';
import { COMMON_TASKS, MAJORS } from '../src/lib/plans/catalog.js';
import { buildProfile, generateEnginePlan, tasksPerWeek } from '../src/lib/plans/engine.js';
import { checkPlanConsistency, planContentSchema } from '../src/lib/plans/schema.js';

const student = {
  name: 'Noura',
  email: 'noura@example.com',
  password: 'Coop-Train-2026',
  universityId: '441000123',
  university: 'KSU',
  major: 'علوم الحاسب',
  skills: ['React'],
};

const planRequest = { major: 'علوم الحاسب', focus: 'تطوير الويب', durationWeeks: 12, hoursPerWeek: 40, useAi: false };

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('plan engine', () => {
  test('every major, track and duration yields a valid, consistent plan', () => {
    for (const major of MAJORS) {
      for (const track of major.tracks) {
        for (const durationWeeks of [4, 5, 9, 16, 24, 52]) {
          const plan = generateEnginePlan({ profile: buildProfile({ major, track }), majorName: major.name, durationWeeks, hoursPerWeek: 40, currentSkills: [] });
          expect(() => planContentSchema.parse(plan)).not.toThrow();
          expect(checkPlanConsistency(plan, durationWeeks)).toEqual([]);
          expect(JSON.stringify(plan)).not.toMatch(/\{(tool2|tool|track|project)\}/);
        }
      }
    }
  });
});

describe('plan engine: realistic weeks', () => {
  const report = (t) => t.title.startsWith('كتابة التقرير الأسبوعي');
  const profiles = [
    ...MAJORS.flatMap((major) => major.tracks.map((track) => ({ profile: buildProfile({ major, track }), majorName: major.name }))),
    ...['الدعم الفني في مستشفى', 'التدقيق الداخلي', 'الرعاية السريرية'].map((focus) => ({ profile: buildProfile({ focus }), majorName: 'تخصص' })),
  ];

  test('the number of tasks follows the weekly hours', () => {
    expect([10, 20, 35, 40, 60].map(tasksPerWeek)).toEqual([2, 2, 4, 4, 5]);
    for (const hoursPerWeek of [10, 20, 40, 60]) {
      const plan = generateEnginePlan({ ...profiles[0], durationWeeks: 24, hoursPerWeek });
      for (const week of plan.weeks) {
        const n = week.tasks.filter((t) => !report(t)).length;
        expect(n).toBeLessThanOrEqual(tasksPerWeek(hoursPerWeek));
        expect(n).toBeGreaterThanOrEqual(Math.min(2, tasksPerWeek(hoursPerWeek) - 1));
      }
    }
  });

  test('one-time tasks appear once and project steps only move forward', () => {
    const oneOff = new Set([...COMMON_TASKS.orientation, ...COMMON_TASKS.closure]);
    for (const p of profiles) {
      for (const durationWeeks of [4, 8, 16, 24, 52]) {
        for (const hoursPerWeek of [20, 40]) {
          const plan = generateEnginePlan({ ...p, durationWeeks, hoursPerWeek });
          const titles = plan.weeks.flatMap((w) => w.tasks.map((t) => t.title));
          for (const t of oneOff) expect(titles.filter((x) => x === t).length).toBeLessThanOrEqual(1);
          // Each project step's position in the bank never goes down from week to week.
          const steps = p.profile.banks.project.map((s) => s.slice(0, 12));
          const order = plan.weeks
            .filter((w) => w.phase === 'المشروع التطبيقي')
            .flatMap((w) => w.tasks.map((t) => steps.findIndex((s) => t.title.startsWith(s))).filter((k) => k >= 0));
          expect(order).toEqual([...order].sort((a, b) => a - b));
          expect(new Set(order).size).toBe(order.length);
          // No task twice in the same week.
          for (const w of plan.weeks) expect(new Set(w.tasks.map((t) => t.title)).size).toBe(w.tasks.length);
        }
      }
    }
  });
});

describe('plans API', () => {
  let token;
  beforeEach(async () => {
    token = sessionOf(await api().post('/api/auth/register/student').send(student));
  });

  test('catalog starts from the profile major and suggests fields for any major', async () => {
    const res = await api().get('/api/plans/catalog').set(auth(token));
    expect(res.body.major).toBe('علوم الحاسب');
    expect(res.body.fields).toContain('الدعم الفني وتقنية المعلومات');
    expect(res.body.sectors).toContain('مستشفى أو جهة صحية');
    const nursing = await api().get(`/api/plans/fields?major=${encodeURIComponent('التمريض')}`).set(auth(token));
    expect(nursing.body).toContain('مكافحة العدوى');
  });

  test('builds a plan for any field the student names, in any setting', async () => {
    const res = await api().post('/api/plans').set(auth(token))
      .send({ major: 'علوم الحاسب', focus: 'الدعم الفني في المستشفى', sector: 'مستشفى أو جهة صحية', durationWeeks: 8, useAi: false });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ major: 'علوم الحاسب', focus: 'الدعم الفني في المستشفى', sector: 'مستشفى أو جهة صحية', trackKey: null });
    expect(res.body.content.title).toContain('الدعم الفني في المستشفى');
    expect(res.body.content.weeks).toHaveLength(8);
    expect(checkPlanConsistency(res.body.content, 8)).toEqual([]);

    // A field matching a catalog track still gets that track's richer tasks.
    const web = await api().post('/api/plans').set(auth(token)).send(planRequest);
    expect(web.body).toMatchObject({ majorKey: 'computer_science', trackKey: 'web' });

    // Unknown fields and oversized text are rejected.
    expect((await api().post('/api/plans').set(auth(token)).send({ ...planRequest, studentId: 99 })).status).toBe(400);
    expect((await api().post('/api/plans').set(auth(token)).send({ ...planRequest, focus: 'x'.repeat(121) })).status).toBe(400);
  });

  test('creates a plan, tracks task progress, and keeps one active plan', async () => {
    const first = await api().post('/api/plans').set(auth(token)).send(planRequest);
    expect(first.status).toBe(201);
    expect(first.body.source).toBe('ENGINE');
    expect(first.body.content.weeks).toHaveLength(12);

    const taskId = first.body.content.weeks[0].tasks[0].id;
    const toggled = await api().patch(`/api/plans/${first.body.id}/tasks/${taskId}`).set(auth(token)).send({ done: true });
    expect(toggled.body.content.weeks[0].tasks[0].done).toBe(true);

    const second = await api().post('/api/plans').set(auth(token)).send({ ...planRequest, focus: 'الذكاء الاصطناعي وتعلّم الآلة', durationWeeks: 8 });
    const current = await api().get('/api/plans/current').set(auth(token));
    expect(current.body.id).toBe(second.body.id);
    expect((await api().get('/api/plans').set(auth(token))).body.filter((p) => p.isActive)).toHaveLength(1);

    await api().patch(`/api/plans/${first.body.id}/activate`).set(auth(token));
    expect((await api().get('/api/plans/current').set(auth(token))).body.id).toBe(first.body.id);
  });

  test('rejects unknown tracks and other students\' plans', async () => {
    expect((await api().post('/api/plans').set(auth(token)).send({ ...planRequest, focus: '' })).status).toBe(400);
    const plan = await api().post('/api/plans').set(auth(token)).send(planRequest);
    const other = sessionOf(await api().post('/api/auth/register/student').send({ ...student, email: 'b@example.com', universityId: '441000999' }));
    expect((await api().patch(`/api/plans/${plan.body.id}/tasks/w1-t1`).set(auth(other)).send({ done: true })).status).toBe(404);
    expect((await api().delete(`/api/plans/${plan.body.id}`).set(auth(other))).status).toBe(404);
  });

  test('falls back to the engine when the AI call fails', async () => {
    const saved = { ...process.env };
    // A key plus an unreachable endpoint: the SDK call fails fast.
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:9';
    try {
      const res = await api().post('/api/plans').set(auth(token)).send({ ...planRequest, useAi: true });
      expect(res.status).toBe(201);
      expect(res.body.source).toBe('ENGINE');
      expect(res.body.notice).toBeTruthy();
    } finally {
      process.env = saved;
    }
  }, 30000);

  test('builds a plan by hand and edits any plan week by week', async () => {
    const manual = await api().post('/api/plans/manual').set(auth(token)).send({ title: 'خطتي', durationWeeks: 3 });
    expect(manual.status).toBe(201);
    expect(manual.body.source).toBe('MANUAL');
    expect(manual.body.content.weeks.map((w) => w.theme)).toEqual(['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3']);

    const generated = (await api().post('/api/plans').set(auth(token)).send(planRequest)).body;
    expect(generated.content.weeks.flatMap((w) => w.tasks).every((t) => ['field', 'learning'].includes(t.kind))).toBe(true);

    // Rename week 1, drop week 2, append a new week with a milestone.
    const [w1, , ...rest] = generated.content.weeks;
    const weeks = [
      { ...w1, theme: 'أسبوع معدّل', tasks: [{ id: 'mine-1', title: 'دورة SQL', done: false, kind: 'learning' }] },
      ...rest,
      { phase: 'إضافي', theme: 'أسبوع جديد', objectives: [], tasks: [], deliverable: '', skills: [], milestone: 'عرض نهائي' },
    ];
    const edited = await api().put(`/api/plans/${generated.id}`).set(auth(token)).send({ title: 'جديد', summary: '', goals: ['هدف'], weeks });
    expect(edited.status).toBe(200);
    expect(edited.body.durationWeeks).toBe(12);
    expect(edited.body.content.weeks[0]).toMatchObject({ weekNo: 1, theme: 'أسبوع معدّل' });
    expect(edited.body.content.weeks.at(-1)).toMatchObject({ weekNo: 12, theme: 'أسبوع جديد' });
    expect(edited.body.content.milestones).toEqual([{ weekNo: 12, title: 'عرض نهائي' }]);
    expect(edited.body.content.phases.at(-1)).toMatchObject({ name: 'إضافي', startWeek: 12, endWeek: 12 });
    expect(edited.body.content.weeks[0].milestone).toBeUndefined();

    const toggled = await api().patch(`/api/plans/${generated.id}/tasks/mine-1`).set(auth(token)).send({ done: true });
    expect(toggled.body.content.weeks[0].tasks[0].done).toBe(true);

    const dupes = [{ ...weeks[0] }, { ...weeks[0], theme: 'x' }];
    expect((await api().put(`/api/plans/${generated.id}`).set(auth(token)).send({ title: 'x', summary: '', goals: [], weeks: dupes })).status).toBe(400);
    expect((await api().put(`/api/plans/${generated.id}`).set(auth(token)).send({ title: 'x', summary: '', goals: [], weeks: [] })).status).toBe(400);
  });

  test('updates the student profile', async () => {
    const res = await api().patch('/api/students/me').set(auth(token)).send({ major: 'Software Engineering', skills: ['Node.js'], gpa: 4.5 });
    expect(res.body.student).toMatchObject({ major: 'Software Engineering', skills: ['Node.js'] });
    expect(res.body.passwordHash).toBeUndefined();
  });
});
