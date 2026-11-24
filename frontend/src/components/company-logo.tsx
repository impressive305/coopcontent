"use client";

import { useRef, useState } from "react";
import { BadgeCheck, ImagePlus, Trash2 } from "lucide-react";
import { api, logoUrl } from "@/lib/api";
import { Alert, Button, cx, useAction } from "./ui";

const FALLBACK_COLORS = ["bg-blue-600", "bg-sky-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-emerald-600", "bg-indigo-600"];

// The company's logo, or its first letter on a stable color when it has none.
// Falls back to the letter when the image cannot load (e.g. not served before the company is verified).
export function CompanyLogo({ id, name, version, className }: { id: number; name: string; version?: number | null; className?: string }) {
  const [failed, setFailed] = useState<number | null>(null);
  const base = cx("shrink-0 overflow-hidden rounded-xl ring-1 ring-line", className ?? "size-12");
  if (version && failed !== version) {
    // eslint-disable-next-line @next/next/no-img-element -- served by our API, already sized and cached there
    return <img src={logoUrl(id, version)} alt={`شعار ${name}`} loading="lazy" onError={() => setFailed(version)} className={cx(base, "bg-white object-contain p-1")} />;
  }
  return (
    <span aria-hidden className={cx(base, "grid place-items-center text-lg font-bold text-white", FALLBACK_COLORS[id % FALLBACK_COLORS.length])}>
      {name.trim().replace(/^(ال|شركة\s+)/, "").charAt(0)}
    </span>
  );
}

// The accreditation mark shown next to a company's name.
export function AccreditedBadge({ compact }: { compact?: boolean }) {
  return (
    <span title="جهة معتمدة من وحدة التدريب" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
      <BadgeCheck className="size-3.5" aria-hidden />
      {compact ? <span className="sr-only">جهة معتمدة</span> : "جهة معتمدة"}
    </span>
  );
}

const MAX_BYTES = 300 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

// Upload or remove a logo at `endpoint` (PUT/DELETE). The API re-checks type and size from the bytes.
export function LogoUploader({ endpoint, companyId, name, version, onChange }: { endpoint: string; companyId: number; name: string; version?: number | null; onChange: (version: number | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const action = useAction();

  const upload = (file: File) => {
    if (!TYPES.includes(file.type)) return action.run(() => Promise.reject(new Error("الشعار يجب أن يكون صورة PNG أو JPEG أو WebP.")));
    if (file.size > MAX_BYTES) return action.run(() => Promise.reject(new Error("حجم الشعار يجب ألا يتجاوز 300 كيلوبايت.")));
    return action.run(async () => {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("تعذّرت قراءة الملف."));
        reader.readAsDataURL(file);
      });
      const res = await api<{ logoVersion: number }>(endpoint, { method: "PUT", body: { image } });
      onChange(res.logoVersion);
    });
  };

  const remove = () => action.run(async () => { await api(endpoint, { method: "DELETE" }); onChange(null); });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4">
        <CompanyLogo id={companyId} name={name} version={version} className="size-16" />
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={action.busy} onClick={() => input.current?.click()}><ImagePlus className="size-4" />{version ? "تغيير الشعار" : "رفع شعار"}</Button>
            {version && <Button type="button" variant="ghost" disabled={action.busy} onClick={remove} className="text-red-600"><Trash2 className="size-4" />إزالة</Button>}
          </div>
          <p className="text-xs text-subtle">PNG أو JPEG أو WebP، حتى 300 كيلوبايت. يفضّل مربعاً بخلفية فاتحة.</p>
        </div>
        <input
          ref={input}
          type="file"
          accept={TYPES.join(",")}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }}
        />
      </div>
      <Alert>{action.error}</Alert>
    </div>
  );
}
