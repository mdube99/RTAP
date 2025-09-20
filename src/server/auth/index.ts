import NextAuth from "next-auth";

import { authConfig } from "./config";

// Export NextAuth helpers directly without wrapping in React cache.
// Wrapping can cause request context leakage for API/middleware flows,
// which rely on per-request cookies for session resolution.
const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

export { auth, handlers, signIn, signOut };
