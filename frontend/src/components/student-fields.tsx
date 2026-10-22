"use client";

import { useState } from "react";
import { ALL_UNIVERSITIES, UNIVERSITIES } from "@/lib/universities";
import { Field, Select } from "./ui";

const OTHER = "__other";

// University dropdown; "أخرى" reveals a free-text field submitted under the same name.
export function UniversityField({ defaultValue = "" }: { defaultValue?: string }) {
  const known = !defaultValue || ALL_UNIVERSITIES.includes(defaultValue);
  const [choice, setChoice] = useState(known ? defaultValue : OTHER);

  return (
    <>
      <Select label="الجامعة" name={choice === OTHER ? undefined : "university"} required value={choice} onChange={(e) => setChoice(e.target.value)}>
        <option value="" disabled>اختر جامعتك</option>
        {Object.entries(UNIVERSITIES).map(([group, names]) => (
          <optgroup key={group} label={`الجامعات ال${group}`}>
            {names.map((n) => <option key={n} value={n}>{n}</option>)}
          </optgroup>
        ))}
        <option value={OTHER}>أخرى</option>
      </Select>
      {choice === OTHER && <Field label="اسم الجامعة" name="university" required minLength={2} defaultValue={known ? "" : defaultValue} />}
    </>
  );
}

// GPA input whose maximum follows the chosen scale (4 or 5).
export function GpaField({ defaultValue, defaultScale }: { defaultValue?: string | null; defaultScale?: number | null }) {
  const [scale, setScale] = useState(String(defaultScale ?? 5));

  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
      <Field label="المعدل (اختياري)" name="gpa" type="number" step="0.01" min="0" max={scale} defaultValue={defaultValue ?? ""} dir="ltr" />
      <Select label="من" name="gpaScale" value={scale} onChange={(e) => setScale(e.target.value)} aria-label="مقياس المعدل">
        <option value="5">5</option>
        <option value="4">4</option>
      </Select>
    </div>
  );
}
