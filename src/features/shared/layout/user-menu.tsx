"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { User } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface UserMenuProps {
  collapsed?: boolean;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!session) return null;
  const name = session.user?.name ?? session.user?.email;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title={collapsed ? name ?? undefined : undefined}
        className={`flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] ${collapsed ? "w-8 h-8 justify-center p-0" : ""}`}
      >
        {collapsed ? (
          <User className="h-5 w-5" />
        ) : (
          <>
            <span className="truncate max-w-[120px]">{name}</span>
            <svg
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-48 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-md z-50">
          <Link
            href="/account"
            className="block px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
            onClick={() => setOpen(false)}
          >
            Account
          </Link>
          <div className="px-3 py-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--color-text-secondary)]">Theme</span>
              <ThemeToggle variant="compact" />
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="block w-full text-left px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
