"use client";

import { useState } from "react";
import Link from "next/link";
import { toDataURL as qrToDataURL } from "qrcode";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@components/ui";
import ConfirmModal from "@components/ui/confirm-modal";

export default function AccountPage() {
  const { data: me } = api.users.me.useQuery();
  const utils = api.useUtils();
  const generate = api.users.generateTotpSecret.useMutation({
    onSuccess: async (data: { secret: string; otpauth: string }) => {
      const url = await (qrToDataURL as (text: string) => Promise<string>)(data.otpauth);
      setSecret({ secret: data.secret, otpauth: data.otpauth, qr: url });
    },
  });
  const enable = api.users.enableTotp.useMutation({
    onSuccess: () => {
      setSecret(null);
      setToken("");
      void utils.users.me.invalidate();
    },
  });
  const disable = api.users.disableTotp.useMutation({
    onSuccess: () => {
      setConfirmDisable(false);
      setPassword("");
      void utils.users.me.invalidate();
    },
  });

  const [secret, setSecret] = useState<{ secret: string; otpauth: string; qr: string } | null>(null);
  const [token, setToken] = useState("");
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/auth/change-password">
            <Button variant="secondary" size="sm">Change Password</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {me?.twoFactorEnabled ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">TOTP authentication is enabled.</p>
              <Button variant="danger" size="sm" onClick={() => setConfirmDisable(true)}>
                Disable 2FA
              </Button>
              <ConfirmModal
                open={confirmDisable}
                title="Disable Two-factor Authentication"
                description="Enter your password to disable two-factor authentication."
                confirmLabel="Disable"
                onCancel={() => { setConfirmDisable(false); setPassword(""); }}
                onConfirm={() => disable.mutate({ password })}
                loading={disable.isPending}
              >
                <div className="mb-4">
                  <Label htmlFor="password" required>
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    variant="elevated"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </ConfirmModal>
            </div>
          ) : secret ? (
            <div className="space-y-4">
              <Image
                src={secret.qr}
                alt="TOTP QR"
                width={192}
                height={192}
                className="mx-auto"
                unoptimized
                priority
              />
              <p className="text-sm break-all text-center text-[var(--color-text-muted)]">{secret.secret}</p>
              <div>
                <Label htmlFor="token" required>
                  Authentication Code
                </Label>
                <Input
                  id="token"
                  type="text"
                  variant="elevated"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={enable.isPending || token.trim().length === 0}
                  onClick={() => enable.mutate({ secret: secret.secret, token })}
                >
                  Enable
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setSecret(null); setToken(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
              Enable TOTP
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
