import { api, auth, prisma, resetDb } from './setup.js';
import { MAJORS } from '../src/lib/plans/catalog.js';
import { generateEnginePlan } from '../src/lib/plans/engine.js';
import { checkPlanConsistency, planContentSchema } from '../src/lib/plans/schema.js';

const student = {
  name: 'Noura',
  email: 'noura@example.com',
  password: 'Password123',
  universityId: '441000123',
  university: 'KSU',
  major: 'علوم الحاسب',
  skills: ['React'],
};

const planRequest = { majorKey: 'computer_science', trackKey: 'web', durationWeeks: 12, hoursPerWeek: 40, useAi: false };

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('plan engine', () => {
  test('every major, track and duration yields a valid, consistent plan', () => {
    for (const major of MAJORS) {
      for (const track of major.tracks) {
        for (const durationWeeks of [4, 5, 9, 16, 24, 52]) {
          const plan = generateEnginePlan({ major, track, durationWeeks, hoursPerWeek: 40, currentSkills: [] });
          expect(() => planContentSchema.parse(plan)).not.toThrow();
          expect(checkPlanConsistency(plan, durationWeeks)).toEqual([]);
          expect(JSON.stringify(plan)).not.toMatch(/\{(tool2|tool|track|project)\}/);
        }
      }
    }
  });
});

describe('plans API', () => {
  let token;
  beforeEach(async () => {
    token = (await api().post('/api/auth/register/student').send(student)).body.token;
  });

  test('catalog suggests the major from the profile', async () => {
    const res = await api().get('/api/plans/catalog').set(auth(token));
    expect(res.body.suggestedMajor).toBe('computer_science');
    expect(res.body.majors.length).toBeGreaterThanOrEqual(9);
  });

  test('creates a plan, tracks task progress, and keeps one active plan', async () => {
    const first = await api().post('/api/plans').set(auth(token)).send(planRequest);
    expect(first.status).toBe(201);
    expect(first.body.source).toBe('ENGINE');
    expect(first.body.content.weeks).toHaveLength(12);

    const taskId = first.body.content.weeks[0].tasks[0].id;
    const toggled = await api().patch(`/api/plans/${first.body.id}/tasks/${taskId}`).set(auth(token)).send({ done: true });
    expect(toggled.body.content.weeks[0].tasks[0].done).toBe(true);

    const second = await api().post('/api/plans').set(auth(token)).send({ ...planRequest, trackKey: 'ai', durationWeeks: 8 });
    const current = await api().get('/api/plans/current').set(auth(token));
    expect(current.body.id).toBe(second.body.id);
    expect((await api().get('/api/plans').set(auth(token))).body.filter((p) => p.isActive)).toHaveLength(1);

    await api().patch(`/api/plans/${first.body.id}/activate`).set(auth(token));
    expect((await api().get('/api/plans/current').set(auth(token))).body.id).toBe(first.body.id);
  });

  test('rejects unknown tracks and other students\' plans', async () => {
    expect((await api().post('/api/plans').set(auth(token)).send({ ...planRequest, trackKey: 'nope' })).status).toBe(400);
    const plan = await api().post('/api/plans').set(auth(token)).send(planRequest);
    const other = (await api().post('/api/auth/register/student').send({ ...student, email: 'b@example.com', universityId: '441000999' })).body.token;
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

  test('updates the student profile', async () => {
    const res = await api().patch('/api/students/me').set(auth(token)).send({ major: 'Software Engineering', skills: ['Node.js'], gpa: 4.5 });
    expect(res.body.student).toMatchObject({ major: 'Software Engineering', skills: ['Node.js'] });
    expect(res.body.passwordHash).toBeUndefined();
  });
});
