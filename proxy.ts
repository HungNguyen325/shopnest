import { NextResponse, type NextRequest } from "next/server";

const COOKIE = process.env.SESSION_COOKIE_NAME || "cf_session";

const APP_PREFIXES = [
  "/dashboard",
  "/products",
  "/posts",
  "/create",
  "/calendar",
  "/ideas",
  "/templates",
  "/analytics",
  "/settings",
];
// Auth pages intentionally do NOT auto-redirect on cookie presence: a stale
// cookie that fails the DB session check would bounce /login ↔ /dashboard
// forever. The login page decides client-side via /api/account.

/**
 * Route guard (Next.js 16 "proxy" convention, formerly middleware). A missing/expired session cookie redirects to /login; every
 * API route still re-verifies the session against the database, so this is a
 * UX guard rather than the security boundary.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(COOKIE)?.value);

  const isAppRoute = APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isAppRoute && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/posts/:path*",
    "/create/:path*",
    "/calendar/:path*",
    "/ideas/:path*",
    "/templates/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
