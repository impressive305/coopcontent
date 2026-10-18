import Link from "next/link";

const features = [
  ["للطلاب", "تصفح الفرص التدريبية، التقديم بنقرة، ورفع التقارير الأسبوعية ومتابعة حالتها."],
  ["للمشرفين الأكاديميين", "مراجعة تقارير الطلاب واعتمادها أو إعادتها مع الملاحظات، وإغلاق التدريب."],
  ["لجهات التدريب", "نشر الفرص، فرز المتقدمين، وقبولهم مع تحديد تاريخ بدء التدريب."],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-16">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-brand">CoopConnect</p>
        <h1 className="text-3xl font-bold leading-snug sm:text-4xl">إدارة التدريب التعاوني في مكان واحد</h1>
        <p className="max-w-2xl text-gray-600 dark:text-gray-300">
          منصة تربط طلاب الجامعات السعودية بجهات التدريب والمشرفين الأكاديميين، من نشر الفرصة حتى اعتماد التقرير النهائي.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">تسجيل الدخول</Link>
          <Link href="/register" className="rounded-lg border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20">إنشاء حساب</Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {features.map(([title, body]) => (
          <div key={title} className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-2 font-semibold">{title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
