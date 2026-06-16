import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import authConfig from "./auth.config";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/role-guard";
import { auth } from "@/lib/auth";
import { checkBodySize } from "@/lib/body-size-guard";
import {
  generateCsrfToken,
  isValidCsrfToken,
  getCsrfCookieName,
  getCsrfHeaderName,
} from "@/lib/csrf";

const { auth: middlewareAuth } = NextAuth(authConfig);

const protectedRoutes = ["/onboarding", "/dashboard"];
const authRoutes = ["/login", "/register"];
const adminRoutes = ["/admin"];

// Public API routes that don't require authentication (exact match)
const PUBLIC_API_ROUTES = [
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/mcp-authorize",
  "/api/auth/mcp-token",
  "/api/auth/mcp-revoke",
  "/api/stripe/webhook",
  "/api/linkedin/oauth-callback",
  "/api/cron/publish",
  "/api/cron/sync-analytics",
  "/api/cron/refresh-tokens",
  "/api/cron/engagement-digest",
  "/api/cron/brand-draft-cleanup",
  "/api/cron/checkpoint-cleanup",
  "/api/cron/publish-watchdog",
  "/api/cron/reddit-scrape",
  "/api/cron/reddit-digest",
  "/api/mcp/health",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
];

// Public API route prefixes (for catch-all routes like NextAuth)
const PUBLIC_API_PREFIXES = ["/api/auth/"];

// Debug routes that should only be accessible in development
const DEBUG_ROUTES = ["/api/debug/"];

// Cron routes use Bearer CRON_SECRET auth — skip CSRF validation
const CRON_ROUTE_PREFIX = "/api/cron/";

const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function isCronRoute(pathname: string): boolean {
  return pathname.startsWith(CRON_ROUTE_PREFIX);
}

function needsCsrfValidation(pathname: string, method: string): boolean {
  if (!STATE_CHANGING_METHODS.includes(method)) return false;
  if (isCronRoute(pathname)) return false;
  // NextAuth has its own CSRF protection - don't double-validate
  if (pathname.startsWith('/api/auth/callback/')) return false;
  return true;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const appWs = appUrl.replace(/^http/, 'ws');
  const connectSrc = [
    "'self'",
    "https://api.openai.com",
    "https://api.stripe.com",
    "https://api.resend.com",
    "https://*.sentry.io",
    "https://api.linkedin.com",
    "https://api.twitter.com",
    "https://api.x.com",
    "https://api.pinterest.com",
    "https://www.reddit.com",
    "https://api.unsplash.com",
    "https://api.pexels.com",
    "https://api.giphy.com",
    "wss:",
  ];
  if (appWs) connectSrc.push(appWs);
  if (process.env.NODE_ENV !== "production") {
    connectSrc.push("ws://localhost:*", "http://localhost:*");
  }

  const cspDirectives = [
    "default-src 'self'",
    // 'unsafe-inline' required for Next.js hydration scripts; 'unsafe-eval' only in dev for HMR
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  return response;
}

async function handleApiAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Block debug routes in production
  if (process.env.NODE_ENV === "production") {
    for (const debugRoute of DEBUG_ROUTES) {
      if (pathname.startsWith(debugRoute)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
  }

  // Check if route is in public allowlist (exact match)
  const isPublicRoute = PUBLIC_API_ROUTES.some(
    (route) => pathname === route
  );
  if (isPublicRoute) {
    return null;
  }

  // Check if route matches a public prefix (e.g., /api/auth/*)
  const isPublicPrefix = PUBLIC_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isPublicPrefix) {
    return null;
  }

  // Debug routes allowed in development
  const isDebugRoute = DEBUG_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isDebugRoute && process.env.NODE_ENV === "development") {
    return null;
  }

  // Verify authentication for all other API routes
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export const proxy = middlewareAuth(async function proxy(
  request: NextRequest
) {
  const url = request.nextUrl.pathname;

  // Handle API route authentication
  if (url.startsWith("/api/") || url.startsWith("/.well-known/")) {
    // Check body size for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const sizeError = checkBodySize(request);
      if (sizeError) {
        return addSecurityHeaders(sizeError);
      }
    }

    // CSRF validation for state-changing requests (cron routes use Bearer auth, skip CSRF)
    if (needsCsrfValidation(url, request.method)) {
      const cookieToken = request.cookies.get(getCsrfCookieName())?.value;
      const headerToken = request.headers.get(getCsrfHeaderName()) ?? undefined;
      if (!isValidCsrfToken(cookieToken, headerToken)) {
        return addSecurityHeaders(
          NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
        );
      }
    }

    const apiResult = await handleApiAuth(request);
    if (apiResult) {
      return addSecurityHeaders(apiResult);
    }
    const passThrough = NextResponse.next();
    return addSecurityHeaders(passThrough);
  }

  // Page-level route protection
  const session = await middlewareAuth();
  const hasSession = !!session;

  const isProtectedRoute = protectedRoutes.some((route) =>
    url.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => url.startsWith(route));
  const isAdminRoute = adminRoutes.some((route) => url.startsWith(route));

  if (isProtectedRoute && !hasSession) {
    logger.info("middleware.redirect", {
      path: url,
      reason: "unauthenticated",
      target: "/login",
    });
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/login", request.url))
    );
  }

  if (isAuthRoute && hasSession) {
    logger.info("middleware.redirect", {
      path: url,
      reason: "already_authenticated",
      target: "/",
    });
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/", request.url))
    );
  }

  if (isAdminRoute && hasSession) {
    const admin = await isAdmin();
    if (!admin) {
      logger.info("middleware.redirect", {
        path: url,
        reason: "insufficient_role",
        target: "/dashboard",
      });
      return addSecurityHeaders(
        NextResponse.redirect(new URL("/dashboard", request.url))
      );
    }
  }

  logger.debug("middleware.pass", { path: url });
  const response = addSecurityHeaders(NextResponse.next());

  // Set CSRF token cookie on page responses for double-submit pattern
  if (!request.cookies.has(getCsrfCookieName())) {
    response.cookies.set(getCsrfCookieName(), generateCsrfToken(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
