# CoopConnect

منصة ويب لإدارة التدريب التعاوني تربط الطلاب بجهات التدريب والمشرفين الأكاديميين.

| الطبقة | التقنية |
| --- | --- |
| Front-end | Next.js 16 (App Router) + React 19 + Tailwind CSS 4، واجهة عربية RTL |
| Back-end | Node.js 22 + Express 5، REST API، JWT + RBAC، تحقق المدخلات بـ zod |
| Database | PostgreSQL 16 + Prisma ORM |
| Deployment | Docker + docker-compose |

## ما الذي يعمل الآن

### الواجهة
- **صفحة تعريفية كاملة (Landing):** المزايا، الخطة الذكية، الأدوار، خطوات العمل، التخصصات المدعومة، رؤية 2030، الأسئلة الشائعة.
- **لوحة تحكم بقائمة جانبية يمنى:** للطالب أقسام مستقلة (نظرة عامة، خطة التدريب، الفرص، طلباتي، التقارير، الملف الشخصي)، وتتحول القائمة إلى درج على الجوال.

### خطة التدريب الذكية
- **المحرك المدمج** (`backend/src/lib/plans/`): قاعدة معرفة تضم 9 تخصصات و27 مساراً، يبني خطة لأي مدة من 4 إلى 52 أسبوعاً على 5 مراحل (التهيئة، التعلّم، المساهمة، المشروع التطبيقي، التسليم). لكل أسبوع محور وأهداف ومهام ومخرَج ومهارات، وللخطة أهداف ومعالم ومعايير تقييم.
- **المساعد الذكي (Claude):** عند ضبط `ANTHROPIC_API_KEY` يحسّن خطة المحرك لتناسب جهة التدريب والفرصة وأهداف الطالب ومهاراته. المخرجات مقيّدة بمخطط JSON ثم تُتحقق بنيتها (عدد الأسابيع، مجموع أوزان التقييم...). إن فشل أي شيء تُحفظ خطة المحرك ويظهر تنبيه للطالب.
- يؤشّر الطالب على المهام المنجزة فتتحدث نسبة الإنجاز، وتبقى الخطط السابقة محفوظة ويمكن إعادة تفعيلها.

### بقية المنصة

- **المصادقة والأدوار:** تسجيل الطالب وجهة التدريب، تسجيل الدخول، أربعة أدوار (طالب، مشرف، جهة، مسؤول).
- **الفرص:** نشر الجهة المعتمدة للفرص، إغلاقها وإعادة فتحها، بحث الطالب وتصفيته حسب التخصص والمدينة.
- **الطلبات:** تقديم الطالب، سحب الطلب، قبول/رفض الجهة مع التحقق من المقاعد، وإنشاء حالة تدريب (Placement) تلقائياً عند القبول.
- **المسؤول:** اعتماد الجهات، إضافة المشرفين، إسناد المشرف لكل متدرب، ومؤشرات عامة.
- **التقارير:** تقارير أسبوعية ونهائية، اعتماد المشرف أو إعادتها بملاحظات، وتعديل الطالب للتقرير المُعاد.
- **إنهاء التدريب:** يتطلب تقريراً نهائياً معتمداً.

**لم يُنفّذ بعد:** تعديل مهام الخطة يدوياً، رفع الملفات (السيرة الذاتية والمرفقات)، نماذج التقييم (Rubrics)، شهادات PDF برمز QR، الإشعارات بالبريد، والمراسلة الداخلية.

## التشغيل بـ Docker

```bash
docker compose up --build
docker compose exec api npm run db:seed   # بيانات تجريبية (اختياري)
```

الواجهة: http://localhost:3000 — الـ API: http://localhost:4000/api

## التشغيل المحلي للتطوير

المتطلبات: Node.js 22 وPostgreSQL 16.

```bash
# 1) قاعدة البيانات
createdb coopconnect   # أو عبر psql، ثم عدّل DATABASE_URL في backend/.env

# 2) الخادم
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev            # http://localhost:4000

# 3) الواجهة (في نافذة أخرى)
cd frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

### حسابات تجريبية (كلمة المرور لجميعها: `Password123`)

| الدور | البريد |
| --- | --- |
| مسؤول النظام | admin@coopconnect.sa |
| مشرف أكاديمي | supervisor@coopconnect.sa |
| طالب | student@coopconnect.sa |
| جهة تدريب (معتمدة) | company@coopconnect.sa |

## الاختبارات

اختبارات تكامل للـ API (Jest + Supertest) تعمل على قاعدة بيانات منفصلة:

```bash
cd backend
createdb coopconnect_test
DATABASE_URL=postgresql://coop:coop@localhost:5432/coopconnect_test npx prisma migrate deploy
DATABASE_URL=postgresql://coop:coop@localhost:5432/coopconnect_test JWT_SECRET=test NODE_ENV=test npm test
```

> تحذير: الاختبارات تفرّغ جداول قاعدة البيانات المستخدمة، فلا تشغّلها على قاعدة التطوير.

## نقاط الـ API

| Method | Path | الدور |
| --- | --- | --- |
| POST | `/api/auth/register/student` · `/api/auth/register/company` | عام |
| POST | `/api/auth/login` | عام |
| GET | `/api/auth/me` | أي مستخدم |
| GET | `/api/opportunities?q=&major=&city=` | أي مستخدم |
| GET | `/api/opportunities/mine` | جهة |
| POST / PATCH | `/api/opportunities` · `/api/opportunities/:id` | جهة معتمدة |
| GET | `/api/opportunities/:id/applications` | الجهة المالكة |
| POST | `/api/applications` | طالب |
| GET | `/api/applications/mine` | طالب |
| PATCH | `/api/applications/:id/withdraw` | طالب |
| PATCH | `/api/applications/:id/decision` | الجهة المالكة |
| GET | `/api/placements` · `/api/placements/:id` | حسب المشاركة في التدريب |
| PATCH | `/api/placements/:id/supervisor` | مسؤول |
| PATCH | `/api/placements/:id/complete` | مشرف / مسؤول |
| GET / POST | `/api/placements/:id/reports` | المشاركون / الطالب |
| PUT | `/api/reports/:id` | الطالب (للتقرير المُعاد) |
| PATCH | `/api/reports/:id/review` | المشرف المُسند |
| GET / POST | `/api/admin/supervisors` | مسؤول |
| GET / PATCH | `/api/admin/companies` · `/api/admin/companies/:id/verify` | مسؤول |
| GET | `/api/admin/stats` | مسؤول |
| GET | `/api/plans/catalog` | طالب: التخصصات والمسارات والتخصص المقترح |
| GET / POST | `/api/plans` · `/api/plans/current` | طالب |
| PATCH | `/api/plans/:id/tasks/:taskId` · `/api/plans/:id/activate` | طالب (خطته) |
| DELETE | `/api/plans/:id` | طالب (خطته) |
| PATCH | `/api/students/me` | طالب |

## هيكل المشروع

```
coopconnect/
├── docker-compose.yml
├── backend/
│   ├── prisma/          schema.prisma, migrations/, seed.js
│   ├── src/
│   │   ├── app.js       تجميع Express والمسارات
│   │   ├── routes/      auth, admin, opportunities, applications, placements, reports
│   │   ├── middleware/  authenticate + requireRole، validate، error
│   │   └── lib/         prisma, auth (JWT), errors, actors
│   └── tests/           اختبارات التكامل
└── frontend/
    └── src/
        ├── app/         الصفحات: /, /login, /register, /dashboard
        ├── components/  dashboards/ (student, company, supervisor, admin), reports, ui
        └── lib/         api client, auth context, useData
```
