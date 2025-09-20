import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

export const middleware = auth(async (request) => {
  const session = request.auth;
  const { pathname } = request.nextUrl;

  // Allow only explicit public auth routes; assets are excluded by matcher below
  if (pathname.startsWith('/api/auth') || pathname === '/auth/signin') {
    return NextResponse.next();
  }

  // Respond with 401 for API requests (JSON callers), redirect for pages
  if (!session) {
    const isApiRoute = pathname.startsWith('/api') && !pathname.startsWith('/api/auth');
    const accept = request.headers.get('accept') ?? '';
    const wantsJson = isApiRoute || accept.includes('application/json');

    if (wantsJson) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }
  // Enforce password change if the token/session indicates reset is required
  const mustChange = (session.user as { mustChangePassword?: boolean }).mustChangePassword === true;
  if (mustChange) {
    const isApiRoute = pathname.startsWith('/api') && !pathname.startsWith('/api/auth');
    // Allow the password change page and the specific tRPC mutation endpoint used by that page
    const isChangePage =
      pathname.startsWith('/auth/change-password') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/trpc/users.changeOwnPassword');
    if (!isChangePage) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 });
      }
      const changeUrl = new URL('/auth/change-password', request.url);
      changeUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(changeUrl);
    }
  }

  return NextResponse.next();
});

export default middleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
