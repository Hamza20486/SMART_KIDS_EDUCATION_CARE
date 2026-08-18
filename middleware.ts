import { NextRequest, NextResponse } from "next/server";
import {
  defaultLocale,
  isLocale,
  localeCookie,
} from "./lib/i18n/config";

const protectedPrefixes = ["/admin", "/parent", "/super-admin", "/account"];

function hasSession(request: NextRequest) {
  return request.cookies.getAll().some(
    ({ name }) =>
      name.startsWith("authjs.session-token") ||
      name.startsWith("__Secure-authjs.session-token"),
  );
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/");
  const pathLocale = isLocale(segments[1]) ? segments[1] : null;

  if (!pathLocale) {
    const preferred = request.cookies.get(localeCookie)?.value;
    const browserLocale = request.headers
      .get("accept-language")
      ?.split(",")
      .map((value) => value.trim().slice(0, 2))
      .find(isLocale);
    const locale = isLocale(preferred)
      ? preferred
      : browserLocale ?? defaultLocale;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const internalPath = `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/";
  const protectedPath = protectedPrefixes.some(
    (prefix) => internalPath === prefix || internalPath.startsWith(`${prefix}/`),
  );
  if (protectedPath && !hasSession(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${pathLocale}/login`;
    loginUrl.search = "";
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = internalPath;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-smart-kids-locale", pathLocale);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.rewrite(rewriteUrl, {
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);
  response.cookies.set(localeCookie, pathLocale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
