"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { UserRole } from "@prisma/client";

interface UseAuthRedirectOptions {
  redirectTo?: string;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

export function useAuthRedirect(options: UseAuthRedirectOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    redirectTo = "/auth/signin",
    requiredRole,
    allowedRoles,
  } = options;

  useEffect(() => {
    if (status === "loading") return; // Still loading

    // If not authenticated, redirect to sign in
    if (status === "unauthenticated") {
      router.push(redirectTo);
      return;
    }

    // If authenticated but doesn't have required role
    if (session?.user && requiredRole && session.user.role !== requiredRole) {
      router.push("/unauthorized");
      return;
    }

    // If authenticated but role not in allowed roles
    if (session?.user && allowedRoles && !allowedRoles.includes(session.user.role)) {
      router.push("/unauthorized");
      return;
    }
  }, [status, session, router, redirectTo, requiredRole, allowedRoles]);

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  };
}

// Convenience hooks for common patterns
export function useRequireAuth() {
  return useAuthRedirect();
}

export function useRequireAdmin() {
  return useAuthRedirect({ requiredRole: "ADMIN" });
}

export function useRequireUser() {
  return useAuthRedirect({ allowedRoles: ["OPERATOR", "ADMIN"] });
}
