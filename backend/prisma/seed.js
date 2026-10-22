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
    create: { universityId: '441000123', university: 'جامعة الملك سعود', major: 'Computer Science', gpa: 4.6, gpaScale: 5, skills: ['React', 'SQL'] },
  },
});
const companyUser = await upsertUser('company@coopconnect.sa', {
  name: 'خالد الدوسري',
  role: 'COMPANY',
  company: { create: { name: 'شركة تقنية الرياض', crNumber: '1010123456', city: 'Riyadh', sector: 'Software', verified: true } },
});

const company = await prisma.company.update({
  where: { userId: companyUser.id },
  data: {
    description: 'شركة ناشئة تبني منتجات برمجية للقطاعين الحكومي والخاص، وتستقبل متدربي التدريب التعاوني في فرق الويب والبيانات.',
    website: 'https://example.com',
    contactEmail: 'coop@example.com',
    phone: '0110000000',
    address: 'طريق الملك فهد، حي العليا',
    majors: ['علوم الحاسب', 'هندسة البرمجيات', 'نظم المعلومات'],
  },
});

// Directory-only companies, as the admin would add them. Students apply to them directly.
const directory = [
  { name: 'مجموعة الأفق للحلول الرقمية', city: 'Jeddah', sector: 'Consulting', address: 'شارع التحلية', majors: ['نظم المعلومات', 'علوم البيانات', 'الأمن السيبراني'], description: 'استشارات التحول الرقمي وتحليل البيانات. برنامج تدريب تعاوني على دفعتين سنوياً.' },
  { name: 'شركة نماء للطاقة', city: 'Dammam', sector: 'Energy', address: 'المنطقة الصناعية الثانية', majors: ['الهندسة الكهربائية', 'الهندسة الميكانيكية', 'الهندسة الصناعية'], description: 'تشغيل وصيانة محطات الطاقة والطاقة المتجددة، مع تدريب ميداني في المواقع.' },
  { name: 'مكتب البنيان للاستشارات الهندسية', city: 'Riyadh', sector: 'Engineering', address: 'حي الملقا', majors: ['الهندسة المدنية'], description: 'تصميم إنشائي وإشراف على تنفيذ المشاريع السكنية والتجارية.' },
];
for (const c of directory) {
  if (!(await prisma.company.findFirst({ where: { name: c.name } }))) {
    await prisma.company.create({ data: { ...c, verified: true, website: 'https://example.com', contactEmail: 'careers@example.com' } });
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

console.log(`Seeded. Supervisor id: ${supervisor.id}. All demo accounts use password "Password123".`);
await prisma.$disconnect();
