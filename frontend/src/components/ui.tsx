"use client";

import { useState } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ title, actions, children, className }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5", className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({ variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      {...props}
      className={cx(
        "rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "secondary" && "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
    />
  );
}

const inputClass = "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/20";

export function Field({ label, textarea, ...props }: { label: string; textarea?: boolean } & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {textarea ? <textarea rows={3} {...props} className={inputClass} /> : <input {...props} className={inputClass} />}
    </label>
  );
}

export function Select({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block space-y-1 text-sm">
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
};

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = statusLabels[status] ?? [status, "gray"];
  return <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{label}</span>;
}

export function Alert({ children, tone = "red" }: { children: React.ReactNode; tone?: "red" | "amber" | "green" }) {
  if (!children) return null;
  return <p className={cx("rounded-lg px-3 py-2 text-sm", tones[tone])}>{children}</p>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-gray-500">{children}</p>;
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
