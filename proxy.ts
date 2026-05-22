import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import authConfig from "./auth.config";
import { logger } from "@/lib/logger";

const { auth: middlewareAuth } = NextAuth(authConfig);

const protectedRoutes = ["/onboarding", "/dashboard"];
const authRoutes = ["/login", "/register"];

export const proxy = middlewareAuth(async function proxy(request: NextRequest) {
  const url = request.nextUrl.pathname;
  const session = await middlewareAuth();
  const hasSession = !!session;

  const isProtectedRoute = protectedRoutes.some((route) =>
    url.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => url.startsWith(route));

  if (isProtectedRoute && !hasSession) {
    logger.info("middleware.redirect", {
      path: url,
      reason: "unauthenticated",
      target: "/login",
    });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && hasSession) {
    logger.info("middleware.redirect", {
      path: url,
      reason: "already_authenticated",
      target: "/",
    });
    return NextResponse.redirect(new URL("/", request.url));
  }

  logger.debug("middleware.pass", { path: url });
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
