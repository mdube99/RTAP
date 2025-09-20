"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@components/ui";

interface Props {
  credsEnabled: boolean;
  googleEnabled: boolean;
  callbackUrl: string;
  initialError?: string;
}

export default function SignInPageClient({ credsEnabled, googleEnabled, callbackUrl, initialError }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const toMessage = (err?: string | null) => {
    if (!err) return null;
    switch (err) {
      case "CredentialsSignin":
        return "Invalid email, password, or 2FA code.";
      case "AccessDenied":
        return "Access denied. Contact an administrator.";
      default:
        return "Sign-in failed. Please try again.";
    }
  };

  const onCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        code,
        callbackUrl,
        redirect: false,
      });
      if (!res) {
        setError("Sign-in failed. Please try again.");
      } else if (res.error) {
        setError(toMessage(res.error));
      } else if (res.ok && res.url) {
        router.push(res.url);
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("google", { callbackUrl, redirect: false });
      if (res?.error) {
        setError(toMessage(res.error));
      } else if (res?.url) {
        // Use hard navigation for external OAuth URLs to avoid client-side flicker
        window.location.assign(res.url);
      }
    } finally {
      setLoading(false);
    }
  };

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

          {googleEnabled && (
            <Button variant="glass" className="w-full" onClick={onGoogle} disabled={loading}>
              Continue with Google
            </Button>
          )}

          {googleEnabled && credsEnabled && (
            <div className="relative text-center">
              <div className="h-px bg-[var(--color-border)]" />
              <span className="inline-block px-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] -mt-2 relative">or</span>
            </div>
          )}

          {credsEnabled && (
            <form onSubmit={onCredentials} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="code">2FA Code (if enabled)</Label>
                <Input id="code" inputMode="numeric" pattern="[0-9]*" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <Button type="submit" variant="glass" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}

          {!googleEnabled && !credsEnabled && (
            <div className="text-sm text-[var(--color-text-secondary)]">
              No sign-in methods are currently enabled. Please contact an administrator.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
