"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn as signInOauth } from "next-auth/react";
import { signIn as signInPasskey } from "next-auth/webauthn";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@components/ui";

interface Props {
  passkeysEnabled: boolean;
  googleEnabled: boolean;
  callbackUrl: string;
  initialError?: string;
}

export default function SignInPageClient({ passkeysEnabled, googleEnabled, callbackUrl, initialError }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"passkey" | "google" | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const toMessage = (err?: string | null) => {
    if (!err) return null;
    switch (err) {
      case "AccessDenied":
        return "Access denied. Contact an administrator.";
      case "Verification":
        return "This login link has expired or was already used.";
      default:
        return "Sign-in failed. Please try again.";
    }
  };

  const handlePasskey = async () => {
    if (!passkeysEnabled) return;
    setLoading("passkey");
    setError(null);
    try {
      const res = await signInPasskey("passkey", { callbackUrl, redirect: false });
      if (!res) {
        setError("Passkey sign-in failed. Please try again.");
      } else if (res.error) {
        setError(toMessage(res.error));
      } else if (res.ok && res.url) {
        router.push(res.url);
      }
    } catch {
      setError("Passkey sign-in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLoading("google");
    setError(null);
    try {
      const res = await signInOauth("google", { callbackUrl, redirect: false });
      if (res?.error) {
        setError(toMessage(res.error));
      } else if (res?.url) {
        window.location.assign(res.url);
      }
    } finally {
      setLoading(null);
    }
  };

  const nothingEnabled = !googleEnabled && !passkeysEnabled;

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <CardTitle className="text-[var(--color-text-primary)] tracking-tight">TTPx</CardTitle>
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Red Team operations and analytics</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="text-sm text-[var(--status-error-fg)] border border-[var(--status-error-fg)]/30 rounded px-3 py-2">
              {error}
            </div>
          )}

          {passkeysEnabled && (
            <Button
              variant="glass"
              className="w-full"
              onClick={handlePasskey}
              disabled={loading !== null}
            >
              {loading === "passkey" ? "Connecting…" : "Sign in with Passkey"}
            </Button>
          )}

          {googleEnabled && passkeysEnabled && (
            <div className="relative text-center">
              <div className="h-px bg-[var(--color-border)]" />
              <span className="inline-block px-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] -mt-2 relative">
                or
              </span>
            </div>
          )}

          {googleEnabled && (
            <Button variant="glass" className="w-full" onClick={handleGoogle} disabled={loading !== null}>
              {loading === "google" ? "Redirecting…" : "Continue with Google"}
            </Button>
          )}

          {nothingEnabled && (
            <div className="text-sm text-[var(--color-text-secondary)]">
              No sign-in methods are currently enabled. Please contact an administrator.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
