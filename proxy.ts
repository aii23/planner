import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const publicRoutes = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const authCookie = request.cookies.get("AUTH_PASSWORD");
  const isAuthenticated = authCookie ? verifyToken(authCookie.value) : false;

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/backlog", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
