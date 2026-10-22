import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function AuthShell({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-brand">CoopConnect</Link>
        <ThemeToggle />
      </div>
      <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h1 className="mb-5 text-xl font-bold">{title}</h1>
        {children}
      </div>
      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">{footer}</p>
    </main>
  );
}
