import {
  COMMON_TASKS, PHASES, PHASE_OBJECTIVES, PHASE_THEMES, PROFESSIONAL_SKILLS, WEEKLY_REPORT_TASK,
} from './catalog.js';

const fill = (text, ctx) =>
  text.replace(/\{(tool2|tool|track|project)\}/g, (_, k) => ctx[k]);

// Picks `count` items starting at `offset`, wrapping around the bank.
const rotate = (bank, offset, count) =>
  Array.from({ length: Math.min(count, bank.length) }, (_, i) => bank[(offset + i) % bank.length]);

// Splits N weeks across the five phases. Orientation and closure get at least one
// week; short plans (< 5 weeks) skip the separate learning phase.
export const allocateWeeks = (n) => {
  const phases = n < 5 ? PHASES.filter((p) => p.key !== 'learning') : PHASES;
  const counts = phases.map(() => 1);
  let remaining = n - phases.length;
  const totalWeight = phases.reduce((s, p) => s + p.weight, 0);
  const ideal = phases.map((p) => (p.weight / totalWeight) * n);
  while (remaining > 0) {
    // Give the next week to the phase furthest below its ideal share.
    let best = 0;
    ideal.forEach((target, i) => {
      if (target - counts[i] > ideal[best] - counts[best]) best = i;
    });
    counts[best] += 1;
    remaining -= 1;
  }
  let start = 1;
  return phases.map((p, i) => {
    const range = { key: p.key, name: p.name, startWeek: start, endWeek: start + counts[i] - 1 };
    start += counts[i];
    return range;
  });
};

const phaseDeliverables = {
  orientation: 'خطة تدريب معتمدة من المشرف الميداني',
  learning: 'ملخص ما تم تعلّمه مع تطبيق عملي موثّق',
  contribution: 'مهام منجزة ومراجعة من الفريق',
  project: 'نسخة عاملة وموثّقة من المشروع التطبيقي',
  closure: 'التقرير النهائي والعرض الختامي',
};

/**
 * Builds a complete week-by-week co-op plan from the catalog.
 * Deterministic: the same inputs always give the same plan.
 */
export const generateEnginePlan = ({ major, track, durationWeeks, hoursPerWeek, company, goals, currentSkills = [] }) => {
  const ctx = {
    tool: track.tools[0],
    tool2: track.tools[1] ?? track.tools[0],
    track: track.name,
    project: track.project,
  };
  const phases = allocateWeeks(durationWeeks);
  const banks = {
    orientation: COMMON_TASKS.orientation,
    learning: major.tasks.learning,
    contribution: major.tasks.contribution,
    project: major.tasks.project,
    closure: COMMON_TASKS.closure,
  };

  const weeks = [];
  for (const phase of phases) {
    const length = phase.endWeek - phase.startWeek + 1;
    for (let i = 0; i < length; i += 1) {
      const weekNo = phase.startWeek + i;
      const themes = PHASE_THEMES[phase.key];
      // Spread the phase's themes evenly over its weeks; a theme spanning several
      // weeks is numbered so consecutive weeks stay distinguishable.
      const themeIndex = (k) => Math.min(themes.length - 1, Math.floor((k * themes.length) / length));
      const span = Array.from({ length }, (_, k) => k).filter((k) => themeIndex(k) === themeIndex(i));
      const part = span.length > 1 ? ` (${span.indexOf(i) + 1}/${span.length})` : '';
      const theme = fill(themes[themeIndex(i)], ctx) + part;
      const bank = banks[phase.key];
      // The project phase walks its bank in order so the steps progress.
      const picks = phase.key === 'project'
        ? rotate(bank, Math.floor((i * bank.length) / length), 2)
        : rotate(bank, i * 2, phase.key === 'orientation' || phase.key === 'closure' ? 3 : 2);
      const titles = [...picks.map((t) => fill(t, ctx)), WEEKLY_REPORT_TASK];
      const isPhaseEnd = weekNo === phase.endWeek;
      weeks.push({
        weekNo,
        phase: phase.name,
        theme,
        objectives: rotate(PHASE_OBJECTIVES[phase.key], i, 2).map((o) => fill(o, ctx)),
        tasks: titles.map((title, t) => ({
          id: `w${weekNo}-t${t + 1}`,
          title,
          done: false,
          kind: phase.key === 'learning' && title !== WEEKLY_REPORT_TASK ? 'learning' : 'field',
        })),
        deliverable: isPhaseEnd ? phaseDeliverables[phase.key] : `التقرير الأسبوعي رقم ${weekNo}`,
        skills: [track.skills[(weekNo - 1) % track.skills.length], PROFESSIONAL_SKILLS[(weekNo - 1) % PROFESSIONAL_SKILLS.length]],
      });
    }
  }

  const byKey = Object.fromEntries(phases.map((p) => [p.key, p]));
  const mid = Math.ceil(durationWeeks / 2);
  const milestones = [
    { weekNo: 1, title: 'اجتماع التهيئة واعتماد خطة التدريب' },
    byKey.learning && { weekNo: byKey.learning.endWeek, title: 'اعتماد فكرة المشروع التطبيقي ونطاقه' },
    { weekNo: mid, title: 'التقييم المرحلي في منتصف التدريب' },
    { weekNo: byKey.project.endWeek, title: 'عرض المشروع التطبيقي على الفريق' },
    { weekNo: durationWeeks, title: 'تسليم التقرير النهائي والتقييم الختامي' },
  ]
    .filter(Boolean)
    // Keep one milestone per week (short plans can collide).
    .filter((m, i, all) => all.findIndex((x) => x.weekNo === m.weekNo) === i)
    .sort((a, b) => a.weekNo - b.weekNo);

  const newSkills = track.skills.filter((s) => !currentSkills.some((c) => c.toLowerCase() === s.toLowerCase()));
  const projectEnd = byKey.project.endWeek;
  const planGoals = [
    `اكتساب مهارات ${track.skills.slice(0, 2).join(' و')} وتطبيقها في مهام فعلية لدى ${company || 'جهة التدريب'}`,
    `تسليم ${track.project} بنهاية الأسبوع ${projectEnd}، موثّقاً ومعتمداً من المشرف الميداني`,
    `رفع جميع التقارير الأسبوعية (وعددها ${durationWeeks}) في مواعيدها واعتمادها من المشرف الأكاديمي`,
    `إتقان استخدام ${track.tools.slice(0, 3).join('، ')} في بيئة عمل حقيقية`,
    `تطوير المهارات المهنية: ${PROFESSIONAL_SKILLS.slice(0, 3).join('، ')}`,
  ];
  if (goals?.trim()) planGoals.push(`هدف شخصي: ${goals.trim()}`);

  return {
    title: `خطة التدريب التعاوني — ${major.name} (${track.name})`,
    summary: `خطة من ${durationWeeks} أسبوعاً بمعدل ${hoursPerWeek} ساعة أسبوعياً${company ? ` في ${company}` : ''}، تبدأ بالتهيئة وبناء الأساس في ${track.name}، ثم المساهمة في مهام الفريق، وتتوّج بمشروع تطبيقي: ${track.project}.`,
    goals: planGoals,
    skills: [
      ...(newSkills.length ? newSkills : track.skills).map((name) => ({ name, category: 'technical' })),
      ...PROFESSIONAL_SKILLS.slice(0, 3).map((name) => ({ name, category: 'professional' })),
    ],
    phases,
    weeks,
    milestones,
    evaluation: [
      { criterion: 'جودة المهام المنجزة والالتزام بالمواعيد', weight: 30 },
      { criterion: 'المشروع التطبيقي', weight: 30 },
      { criterion: 'التقارير الأسبوعية والتقرير النهائي', weight: 20 },
      { criterion: 'السلوك المهني والعمل ضمن فريق', weight: 20 },
    ],
  };
};
