import type { UserRole } from "@prisma/client";
export interface TestContext {
  headers: Headers;
  session: {
    user: { id: string; role: UserRole; email: string; name: string };
    expires: string;
  } | null;
  db: any;
  requestId: string;
}

export function createTestContext(db: any, userRole: UserRole = "OPERATOR", userId = "user-1"): TestContext {
  const headers = new Headers();
  const requestId = "test-request";
  return {
    headers,
    session: {
      user: {
        id: userId,
        role: userRole,
        email: "test@example.com",
        name: "Test User",
      },
      expires: "2030-01-01",
    },
    db,
    requestId,
  };
}

