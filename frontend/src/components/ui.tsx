"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ title, description, actions, children, className }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6", className)}>
      {(title || actions) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-1 text-sm text-subtle">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({ variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand text-white shadow-sm hover:bg-brand-dark",
        variant === "secondary" && "border border-line bg-surface hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
    />
  );
}

export const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition placeholder:text-subtle/70 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-muted disabled:text-subtle";

export function Field({ label, hint, textarea, ...props }: { label: string; hint?: React.ReactNode; textarea?: boolean } & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {textarea ? <textarea rows={3} {...props} className={inputClass} /> : <input {...props} className={inputClass} />}
      {hint && <span className="block text-xs text-subtle">{hint}</span>}
    </label>
  );
}

export function Select({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select {...props} className={inputClass}>{children}</select>
    </label>
  );
}

const tones = {
  gray: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  red: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
};

const statusLabels: Record<string, [string, keyof typeof tones]> = {
  PENDING: ["قيد المراجعة", "amber"],
  ACCEPTED: ["مقبول", "green"],
  REJECTED: ["مرفوض", "red"],
  WITHDRAWN: ["مسحوب", "gray"],
  ACTIVE: ["قيد التدريب", "blue"],
  COMPLETED: ["مكتمل", "green"],
  SUBMITTED: ["بانتظار المراجعة", "amber"],
  APPROVED: ["معتمد", "green"],
  RETURNED: ["مُعاد للتعديل", "red"],
  CLOSED: ["التدريب مغلق", "gray"],
  SUSPENDED: ["موقوف", "red"],
  UNVERIFIED: ["بانتظار الاعتماد", "amber"],
  REVIEW_PENDING: ["طلب جديد", "amber"],
  REVIEW_CONTACTED: ["تم التواصل", "blue"],
  REVIEW_APPROVED: ["معتمدة", "green"],
  REVIEW_REJECTED: ["مرفوض", "red"],
};

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = statusLabels[status] ?? [status, "gray"];
  return <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{label}</span>;
}

export function Alert({ children, tone = "red" }: { children: React.ReactNode; tone?: "red" | "amber" | "green" }) {
  if (!children) return null;
  return <p role={tone === "red" ? "alert" : undefined} className={cx("rounded-xl px-3.5 py-2.5 text-sm", tones[tone])}>{children}</p>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-subtle">{children}</p>;
}

// Side panel over the page; closes on Escape or a click outside.
export function Drawer({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="إغلاق" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/5 bg-background/95 px-5 py-4 backdrop-blur dark:border-white/10">
          <h2 className="text-lg font-bold">{title}</h2>
          <button aria-label="إغلاق" onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"><X className="size-5" /></button>
        </header>
        <div className="space-y-6 p-5">{children}</div>
      </aside>
    </div>
  );
}

export const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "short", day: "numeric" });

// Runs an async action with a busy flag and a captured error message.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await fn();
      setDone(true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, done, run };
}

export const formValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form)) as Record<string, string>;
