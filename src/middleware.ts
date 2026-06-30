import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// /api/support/compose + kb/bulk-upsert are allowlisted so machine callers
// (ManyChat External Request, n8n) can reach them with a SUPPORT_API_KEY bearer;
// those handlers still enforce cookie-or-bearer auth. Everything else requires
// the cc_access cookie (presence gate here; signature is verified server-side
// in lib/auth.ts hasAccess()).
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/support/kb/bulk-upsert",
  "/api/support/compose",
  "/_next",
  "/favicon.ico"
];

export function middleware(request: NextRequest) {
  const passwordEnabled = Boolean(process.env.APP_ACCESS_PASSWORD);
  if (!passwordEnabled) return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath))) {
    return NextResponse.next();
  }

  const hasCookie = Boolean(request.cookies.get("cc_access")?.value);
  if (hasCookie) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/auth/logout|.*\\..*).*)"]
};
