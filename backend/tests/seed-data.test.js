import { COOP_COMPANIES, TRAINING_PLATFORMS } from '../prisma/companies.js';
import { companyProfileSchema } from '../src/routes/companies.js';
import { prisma } from './setup.js';

afterAll(() => prisma.$disconnect());

// Seed data is held to the same rules as anything an admin types in.
describe('seed directory data', () => {
  const all = [...COOP_COMPANIES, ...TRAINING_PLATFORMS];

  test.each(all.map((c) => [c.name, c]))('%s passes the company profile validation', (_name, { logo, accredited, ...profile }) => {
    const result = companyProfileSchema.safeParse(profile);
    expect(result.success ? [] : result.error.issues).toEqual([]);
    expect(profile.website).toMatch(/^https:\/\//);
  });

  test('names are unique, since the seed skips companies that already exist by name', () => {
    const names = all.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('lists the seven recognized training platforms, each with the badge', () => {
    expect(TRAINING_PLATFORMS.map((p) => p.name)).toEqual([
      'منصة دروب', 'مؤسسة مسك', 'منصة إثرائي', 'منصة إدراك', 'أكاديمية منشآت', 'أكاديمية طويق', 'منصة سطر',
    ]);
    expect(TRAINING_PLATFORMS.every((p) => p.accredited === true)).toBe(true);
    expect(COOP_COMPANIES.some((c) => c.accredited)).toBe(false);
  });
});
