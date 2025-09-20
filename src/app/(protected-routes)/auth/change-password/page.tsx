"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { api } from "@/trpc/react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

function ChangePasswordInner() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const { data: session } = useSession();

  const changeMutation = api.users.changeOwnPassword.useMutation({
    onSuccess: async () => {
      // Refresh JWT to clear mustChangePassword by re-signing in silently
      const email = session?.user?.email;
      if (email) {
        await signIn("credentials", { email, password: newPassword, redirect: true, callbackUrl });
        return;
      }
      router.push(callbackUrl);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    changeMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm mb-1">Current Password</label>
              <input
                type="password"
                className="w-full p-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">New Password</label>
              <input
                type="password"
                className="w-full p-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Confirm New Password</label>
              <input
                type="password"
                className="w-full p-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-[var(--color-error)]">{error}</div>}
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" size="sm" disabled={changeMutation.isPending}>
                {changeMutation.isPending ? "Saving..." : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-10 text-[var(--color-text-secondary)]">Loading…</div>}>
      <ChangePasswordInner />
    </Suspense>
  );
}
