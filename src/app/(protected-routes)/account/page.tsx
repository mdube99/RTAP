"use client";

import { useState } from "react";
import { signIn as registerPasskey } from "next-auth/webauthn";
import { api } from "@/trpc/react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@components/ui";
import {
  parseUserWithPasskey,
  type UserWithPasskey,
} from "@features/shared/users/user-validators";
import { formatDateTime } from "@lib/formatDate";

const renderLastLogin = (lastLogin: UserWithPasskey["lastLogin"]) => {
  if (!lastLogin) return "Never";

  if (lastLogin instanceof Date) {
    return formatDateTime(lastLogin);
  }

  if (typeof lastLogin === "string" || typeof lastLogin === "number") {
    const parsed = new Date(lastLogin);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateTime(parsed);
    }
  }

  return String(lastLogin);
};

export default function AccountPage() {
  const { data: meData, refetch, isLoading } = api.users.me.useQuery();
  const me = parseUserWithPasskey(meData);
  const [status, setStatus] = useState<
    "idle" | "registering" | "success" | "error"
  >("idle");

  const handleRegisterPasskey = async () => {
    setStatus("registering");
    try {
      const res = await registerPasskey("passkey", {
        action: "register",
        redirect: false,
      });
      if (!res) {
        setStatus("error");
        return;
      }
      if (res.error) {
        setStatus("error");
        return;
      }
      setStatus("success");
      await refetch();
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        Account
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Loading…
            </p>
          )}
          {!isLoading && me && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Name: {me.name ?? "Not set"}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Email: {me.email}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Role: {me.role}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Last login: {renderLastLogin(me.lastLogin)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {me?.passkeyCount && me.passkeyCount > 0
              ? `You have ${me.passkeyCount} passkey${me.passkeyCount === 1 ? "" : "s"} registered.`
              : "No passkeys registered yet."}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegisterPasskey}
              disabled={status === "registering"}
            >
              {status === "registering"
                ? "Registering…"
                : "Register new passkey"}
            </Button>
            {status === "success" && (
              <span className="text-xs text-[var(--color-success-fg)]">
                Passkey registered successfully.
              </span>
            )}
            {status === "error" && (
              <span className="text-xs text-[var(--status-error-fg)]">
                Registration failed. Please try again.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
