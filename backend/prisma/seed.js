import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const password = await bcrypt.hash('Password123', 10);

const upsertUser = (email, data) =>
  prisma.user.upsert({ where: { email }, update: {}, create: { email, passwordHash: password, ...data } });

await upsertUser('admin@coopconnect.sa', { name: 'مسؤول النظام', role: 'ADMIN' });
const supervisor = await upsertUser('supervisor@coopconnect.sa', { name: 'د. سارة العتيبي', role: 'SUPERVISOR' });
await upsertUser('student@coopconnect.sa', {
  name: 'نورة القحطاني',
  role: 'STUDENT',
  student: {
    create: { universityId: '441000123', university: 'جامعة الملك سعود', major: 'Computer Science', skills: ['React', 'SQL'] },
  },
});
const companyUser = await upsertUser('company@coopconnect.sa', {
  name: 'خالد الدوسري',
  role: 'COMPANY',
  company: { create: { name: 'شركة تقنية الرياض', crNumber: '1010123456', city: 'Riyadh', sector: 'Software', verified: true } },
});

const company = await prisma.company.findUnique({ where: { userId: companyUser.id } });
if (!(await prisma.opportunity.count({ where: { companyId: company.id } }))) {
  const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.opportunity.createMany({
    data: [
      { companyId: company.id, title: 'متدرب تطوير واجهات أمامية', description: 'بناء واجهات React وNext.js لمنتجات الشركة.', major: 'Computer Science', city: 'Riyadh', seats: 3, durationWeeks: 24, deadline },
      { companyId: company.id, title: 'متدرب هندسة بيانات', description: 'تصميم قواعد بيانات PostgreSQL وبناء خطوط معالجة البيانات.', major: 'Information Systems', city: 'Riyadh', seats: 2, durationWeeks: 16, deadline },
    ],
  });
}

console.log(`Seeded. Supervisor id: ${supervisor.id}. All demo accounts use password "Password123".`);
await prisma.$disconnect();
