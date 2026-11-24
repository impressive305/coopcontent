import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { COOP_COMPANIES } from './companies.js';
import { parseLogo } from '../src/lib/logos.js';
import { BCRYPT_ROUNDS } from '../src/lib/auth.js';

const prisma = new PrismaClient();
const password = await bcrypt.hash('Password123', BCRYPT_ROUNDS);

const upsertUser = (email, data) =>
  prisma.user.upsert({ where: { email }, update: {}, create: { email, passwordHash: password, ...data } });

await upsertUser('admin@coopconnect.sa', { name: 'مسؤول النظام', role: 'ADMIN' });
// The supervisor role is paused (see src/lib/features.js); its demo account is created only when it is enabled.
if (process.env.SUPERVISOR_ROLE_ENABLED === 'true') {
  await upsertUser('supervisor@coopconnect.sa', { name: 'د. سارة العتيبي', role: 'SUPERVISOR' });
}
await upsertUser('student@coopconnect.sa', {
  name: 'نورة القحطاني',
  role: 'STUDENT',
  student: {
    create: { universityId: '441000123', university: 'جامعة الملك سعود', major: 'Computer Science', degree: 'BACHELOR', gpa: 4.6, gpaScale: 5, skills: ['React', 'SQL'] },
  },
});
const companyUser = await upsertUser('company@coopconnect.sa', {
  name: 'خالد الدوسري',
  role: 'COMPANY',
  company: { create: { name: 'جهة تجريبية (حساب عرض)', crNumber: '1010123456', city: 'الرياض', sector: 'تقنية المعلومات', verified: true, reviewStatus: 'APPROVED' } },
});

const company = await prisma.company.update({
  where: { userId: companyUser.id },
  // Demo login for trying the company role; not a real organization.
  data: {
    name: 'جهة تجريبية (حساب عرض)',
    city: 'الرياض',
    sector: 'تقنية المعلومات',
    description: 'حساب تجريبي لتجربة دور جهة التدريب ونشر الفرص والتقديم عبر المنصة. ليست جهة حقيقية، ويمكن للمسؤول إخفاؤها أو حذفها.',
    website: null,
    contactEmail: null,
    phone: null,
    address: null,
    majors: ['علوم الحاسب', 'نظم المعلومات'],
  },
});

// Real organizations with co-op programs, managed by the admin from then on.
// Logos go through the same validation as uploads.
for (const { logo, ...c } of COOP_COMPANIES) {
  const existing = await prisma.company.findFirst({ where: { name: c.name }, include: { logo: { select: { companyId: true } } } });
  const company = existing ?? (await prisma.company.create({ data: { ...c, verified: true, reviewStatus: 'APPROVED', reviewedAt: new Date() } }));
  if (logo && !existing?.logo) {
    const image = (await readFile(new URL(`./logos/${logo}`, import.meta.url))).toString('base64');
    await prisma.companyLogo.create({ data: { companyId: company.id, ...parseLogo(image) } });
  }
}

if (!(await prisma.opportunity.count({ where: { companyId: company.id } }))) {
  const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.opportunity.createMany({
    data: [
      { companyId: company.id, title: 'متدرب تطوير واجهات أمامية', description: 'بناء واجهات React وNext.js لمنتجات الشركة.', major: 'Computer Science', city: 'Riyadh', seats: 3, durationWeeks: 24, deadline },
      { companyId: company.id, title: 'متدرب هندسة بيانات', description: 'تصميم قواعد بيانات PostgreSQL وبناء خطوط معالجة البيانات.', major: 'Information Systems', city: 'Riyadh', seats: 2, durationWeeks: 16, deadline },
    ],
  });
}

console.log('Seeded. All demo accounts use password "Password123".');
await prisma.$disconnect();
