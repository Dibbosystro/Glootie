import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/_next", "/favicon.ico"];

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
