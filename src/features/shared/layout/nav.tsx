"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { Card } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Nav() {
  const { data: session } = useSession();

  return (
    <Card variant="elevated" className="sticky top-0 z-50  bg-[var(--color-surface)]/80">
      <nav className="flex items-center justify-between p-[var(--space-md)]">
        <div className="flex items-center space-x-[var(--space-lg)]">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">TTPx</span>
          </Link>
          
          {/* Navigation Links for Authenticated Users */}
          {session && (
            <div className="flex items-center space-x-[var(--space-md)]">
              <Link 
                href="/" 
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
              >
                Dashboard
              </Link>
              <Link 
                href="/operations" 
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
              >
                Operations
              </Link>
              <Link
                href="/analytics/attack-matrix"
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
              >
                Analytics
              </Link>
              {/* Admin-only Settings */}
              {session.user.role === UserRole.ADMIN && (
                <Link 
                  href="/settings" 
                  className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-muted)] transition-colors duration-200 font-medium"
                >
                  Settings
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-[var(--space-md)]">
          {session ? (
            <>
              <ThemeToggle />
              <UserMenu />
            </>
          ) : (
            <Link href="/auth/signin">
              <Button variant="primary" size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </nav>
    </Card>
  );
}
