"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ThemeKey = "theme-modern-teal" | "theme-modern-blue" | "theme-modern-ember";

const THEMES: { key: ThemeKey; label: string }[] = [
  { key: "theme-modern-teal", label: "Teal" },
  { key: "theme-modern-blue", label: "Blue" },
  { key: "theme-modern-ember", label: "Ember" },
];

export function ThemeToggle({ variant = "full" as "full" | "compact" }: { variant?: "full" | "compact" }) {
  const [theme, setTheme] = useState<ThemeKey>("theme-modern-teal");

  // Apply theme to <html> and persist
  const apply = (key: ThemeKey) => {
    setTheme(key);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      ["theme-modern","theme-modern-teal","theme-modern-blue","theme-modern-ember"].forEach(c => root.classList.remove(c));
      root.classList.add(key);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ttpx.theme', key);
    }
  };

  // Load stored theme on mount and apply immediately
  useEffect(() => {
    const stored = (typeof window !== 'undefined' && (localStorage.getItem('ttpx.theme') as ThemeKey | null)) ?? null;
    const initial = stored && THEMES.some(t => t.key === stored) ? stored : "theme-modern-teal";
    apply(initial);
  }, []);

  if (variant === "compact") {
    // A tiny button that cycles themes on click
    const nextTheme = () => {
      if (THEMES.length === 0) return;
      const idxRaw = THEMES.findIndex(t => t.key === theme);
      const idx = idxRaw >= 0 ? idxRaw : 0;
      const next = THEMES[(idx + 1) % THEMES.length];
      if (next) apply(next.key);
    };
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label="Toggle theme"
        title="Toggle theme"
        onClick={nextTheme}
      >
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border"
          style={{ background: 'var(--ring)', borderColor: 'var(--color-border)' }}
        />
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-md border border-[var(--color-border)] overflow-hidden">
      {THEMES.map((t, i) => {
        const selected = theme === t.key;
        return (
          <Button
            key={t.key}
            variant="ghost"
            size="sm"
            className={`rounded-none ${i === 0 ? 'rounded-l-md' : ''} ${i === THEMES.length - 1 ? 'rounded-r-md' : ''} ${selected ? 'ring-2 ring-[var(--ring)]' : ''}`}
            aria-pressed={selected}
            onClick={() => apply(t.key)}
          >
            {t.label}
          </Button>
        );
      })}
    </div>
  );
}
