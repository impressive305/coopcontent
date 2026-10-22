"use client";

import { Moon, Sun } from "lucide-react";
import { THEME_KEY } from "@/lib/theme";
import { cx } from "./ui";

export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  };

  // Icons switch via the dark: variant, so the button renders the same on server and client.
  return (
    <button type="button" onClick={toggle} aria-label="تبديل الوضع الليلي" title="الوضع الليلي / النهاري" className={cx("rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10", className)}>
      <Moon className="size-[18px] dark:hidden" />
      <Sun className="hidden size-[18px] dark:block" />
    </button>
  );
}
