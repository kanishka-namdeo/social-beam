# Production Readiness Implementation Plan

## Overview
This plan addresses 40+ critical gaps identified across 6 audit dimensions. Organized into 6 phases by priority and dependency.

**Estimated Total Effort**: 23-31 hours of focused work

---

## Phase 0: Critical Security & Infrastructure Blockers (Immediate)

These must be fixed before any other work.

### 0.1 Create `middleware.ts` for Route Protection
**File**: `middleware.ts` (new file at root)  
**Effort**: 30 minutes

**Actions**:
- Create Next.js middleware that protects all `/dashboard/*` and `/api/*` routes
- Exclusions: `/api/auth/*`, `/api/stripe/webhook`, `/api/cron/*`, `/api/health`, public landing pages
- Pattern: Check `auth()` session, redirect to `/login` if missing
- Add CORS configuration
- Add CSRF protection headers

**Impact**: Prevents accidental public API access if individual routes forget auth checks

---

### 0.2 Add Security Headers to `next.config.ts`
**File**: `next.config.ts`  
**Effort**: 15 minutes

**Actions**:
Add `headers` configuration with:
```typescript
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
},
{
  key: "X-Frame-Options",
  value: "DENY"
},
{
  key: "X-Content-Type-Options",
  value: "nosniff"
},
{
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains"
},
{
  key: "Referrer-Policy",
  value: "strict-origin-when-cross-origin"
},
{
  key: "Permissions-Policy",
  value: "camera=(), microphone=(), geolocation=()"
}
```

**Impact**: Prevents clickjacking, MIME sniffing, protocol downgrade attacks

---

### 0.3 Generate and Document `AUTH_SECRET`
**File**: `.env.example` (new file)  
**Effort**: 10 minutes

**Actions**:
- Generate with `openssl rand -base64 32`
- Document in `.env.example` with all 25+ required env vars
- Add to production environment

**Impact**: NextAuth JWT encryption requires this; without it, tokens are compromised

---

### 0.4 Fix Production Connection Pool Leak
**File**: `lib/prisma.ts`  
**Effort**: 15 minutes

**Actions**:
- Cache PrismaClient on `globalThis` unconditionally (remove `NODE_ENV !== 'production'` check on line 24-26)
- Alternative: Remove `pg` Pool adapter, use Prisma's built-in connection handling

**Impact**: Prevents connection exhaustion in production (currently creates new pool per request)

---

## Phase 1: Security Hardening (Before Launch)

### 1.1 Standardize Cron Authentication
**Files**: All 8 cron routes in `app/api/cron/*/route.ts`  
**Effort**: 45 minutes

**Actions**:
- Standardize on `Authorization: Bearer` pattern (remove `x-cron-secret`)
- Change all GET methods to POST-only (4 routes currently expose GET)
- Add hard fail if `CRON_SECRET` is unset (currently no-ops when missing)

**Routes to fix**:
- `engagement-digest` (GET → POST)
- `reddit-digest` (GET → POST)
- `refresh-tokens` (GET → POST)
- `sync-analytics` (GET+POST → POST only)

---

### 1.2 Add Rate Limiting to Notification Endpoints
**Files**: 
- `app/api/notifications/route.ts`
- `app/api/notifications/batch/route.ts`
- `app/api/notifications/batch-migrate/route.ts`  
**Effort**: 30 minutes

**Actions**:
- Add rate limiting (10 req/min for POST, 30 req/min for GET)
- Add one-time-use guard to `batch-migrate` (check if already migrated)

**Impact**: Prevents DB bloat from authenticated user spam

---

### 1.3 Remove Test Scripts with Plaintext Passwords
**Files**: 
- `verify-password.js`
- `fix-demo-password.js`
- `test-login-api.js`
- `test-login-flow.ts`  
**Effort**: 5 minutes

**Actions**: Delete or add to `.gitignore`

**Impact**: Prevents credential leakage

---

### 1.4 Fix Error Message Leakage
**Files**: 
- `app/api/campaigns/route.ts:182`
- `app/api/debug/clear-analytics/route.ts:65`  
**Effort**: 10 minutes

**Actions**: 
- Change `error.message` to `"Internal server error"`
- Change `String(err)` to generic message

**Impact**: Never expose internal error details to clients

---

## Phase 2: Data Integrity & Schema (Before Launch)

### 2.1 Create Prisma Migration Baseline
**Command**: `pnpm prisma migrate dev --create-only --name initial_baseline`  
**File**: `prisma/migrations/` (currently empty)  
**Effort**: 30 minutes

**Actions**:
- Generate initial migration from current schema
- Commit to git

**Impact**: Establishes migration history, enables rollback, CI/CD schema propagation

---

### 2.2 Add `@default` to All `@id` Fields
**File**: `prisma/schema.prisma`  
**Effort**: 1 hour

**Actions**:
- Add `@default(uuid())` to 26 models missing it:
  - Post, User, Workspace, ConnectedAccount, etc.
- Pick one strategy (`uuid()` recommended) and apply consistently

**Impact**: Prevents runtime crashes if any code path forgets manual ID generation

---

### 2.3 Fix Missing Cascade Deletes
**File**: `prisma/schema.prisma`  
**Effort**: 45 minutes

**Actions**:
Add `onDelete: Cascade` to:
- `Notification.workspaceId` (line 722)
- `FollowerSnapshot` — add Workspace relation (line 234-244)
- `OnboardingSession` — add User relation (line 287-294)
- `BrandDraft` — add Workspace relation (line 113-132)
- `McpAuthorizationCode` and `McpRevokedToken` — add User relations

**Impact**: Prevents orphaned rows and delete failures

---

### 2.4 Wrap Multi-Table Writes in Transactions
**Files**: 
- `app/api/ideas/[id]/convert/route.ts:49-79`
- `app/api/campaigns/[id]/publish/route.ts:133-186`
- `app/api/compose/route.ts:184`  
**Effort**: 1 hour

**Actions**:
- Wrap `post.create` + `idea.update` in `$transaction`
- Wrap entire publish loop in `$transaction`
- Wrap `publishPost()` in try/catch with rollback to `SCHEDULED` on failure

**Impact**: Prevents partial writes and stale states

---

### 2.5 Fix Session Cookie Exposure
**File**: `app/api/settings/accounts/route.ts:32,56`  
**Effort**: 15 minutes

**Actions**:
- Remove `sessionCookie: true` from select
- Remove from response

**Impact**: Prevents LinkedIn session cookie leakage to client

---

### 2.6 Add Missing Indexes
**File**: `prisma/schema.prisma`  
**Effort**: 30 minutes

**Actions**:
Add indexes on:
- `Subscription.[userId, status]`
- `Workspace.[userId]`
- `McpAuthorizationCode.[userId, workspaceId]`
- `McpRevokedToken.[userId]`
- `ContentQueue.[postId]`
- `Idea.[convertedToPostId]`
- `CampaignActivity.[userId]`

---

## Phase 3: Infrastructure & Deployment (Before Launch)

### 3.1 Add `output: 'standalone'` to Next.js Config
**File**: `next.config.ts`  
**Effort**: 5 minutes

**Actions**:
- Add `output: 'standalone'` to config

**Impact**: Required for Docker image optimization

---

### 3.2 Create Production Dockerfile
**File**: `Dockerfile` (new file)  
**Effort**: 1 hour

**Actions**:
Multi-stage build:
- Stage 1: Install dependencies (`pnpm install --frozen-lockfile`)
- Stage 2: Generate Prisma client (`pnpm prisma generate`)
- Stage 3: Build Next.js (`pnpm build`)
- Stage 4: Production runtime (Node 20-alpine, non-root user, copy standalone output)

**Include**: Health check (`CMD curl -f http://localhost:3000/api/health || exit 1`)

---

### 3.3 Create Health Check Endpoint
**File**: `app/api/health/route.ts` (new file)  
**Effort**: 30 minutes

**Actions**:
- Return 200 with `{ status: 'ok', timestamp: new Date().toISOString() }`
- Add database connectivity check (query `SELECT 1`)

**Impact**: Required for Docker healthchecks, load balancers, monitoring

---

### 3.4 Integrate Error Monitoring (Sentry)
**Files**: 
- Install `@sentry/nextjs`
- Create `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Add `Sentry.captureException()` to `app/global-error.tsx`
- Add `SENTRY_DSN` to `.env.example`  
**Effort**: 1 hour

**Impact**: Production errors become visible

---

### 3.5 Implement File Storage Backend
**Files**: 
- Install `@vercel/blob` or `@aws-sdk/client-s3`
- Update `lib/media/storage.ts` to use S3/R2 instead of local filesystem
- Add `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` to `.env.example`  
**Effort**: 2 hours

**Impact**: Media uploads persist across deployments, scalable

---

### 3.6 Set Up Database Backups
**Effort**: 1 hour

**Actions**:
- Create backup script using `pg_dump`
- Schedule via cron (daily at 2 AM)
- Upload to S3 with retention policy (30 days)
- Document restore procedure

**Alternative**: Use managed Postgres with automatic backups (Neon, Supabase, RDS)

---

## Phase 4: UX & Communications (Before Launch)

### 4.1 Create Root Error Boundary
**File**: `app/error.tsx` (new file)  
**Effort**: 30 minutes

**Actions**:
- Copy pattern from `app/(dashboard)/error.tsx`
- Add logging to Sentry

**Impact**: Catches errors in landing pages, auth pages (currently shows raw Next.js error)

---

### 4.2 Fix Receipt Email Double-Division Bug
**Files**: 
- `app/api/stripe/webhook/route.ts:84`
- `lib/email/templates/subscription-receipt.tsx:23`  
**Effort**: 15 minutes

**Actions**:
- Remove `/ 100` from webhook (Stripe already provides dollars)
- Remove `/ 100` from template

**Impact**: $29.00 charge currently shows as $0.29 in receipt emails

---

### 4.3 Implement Push Notification Backend
**Files**: 
- Install `web-push`
- Create `PushSubscription` model in Prisma schema
- Update `app/api/notifications/push/subscribe/route.ts` to store subscription object
- Generate VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- Implement `web-push.sendNotification()` in `lib/notifications/server-dispatch.ts:121-128`  
**Effort**: 2 hours

**Impact**: Push notifications currently non-functional

---

### 4.4 Add Email Retry Logic
**File**: `lib/email/service.ts`  
**Effort**: 1 hour

**Actions**:
- Add exponential backoff retry (3 attempts: 1s, 5s, 25s)
- Log final failures to Sentry
- Consider persistent retry queue (database table) for critical emails

**Impact**: Prevents permanent email loss on transient failures

---

### 4.5 Fix Cron Security Weakness
**Files**: All 8 cron routes  
**Effort**: 15 minutes

**Actions**:
- Change `if (cronSecret && authHeader !== ...)` to `if (!cronSecret || authHeader !== ...)`

**Impact**: Currently auth is no-op when `CRON_SECRET` is unset

---

## Phase 5: Performance & Scalability (Can Be Post-Launch)

### 5.1 Add Caching Strategy
**Files**: 
- `app/api/dashboard/page.tsx` — add `revalidate: 60` (1-minute cache)
- `app/api/analytics/*/route.ts` — add `revalidateTag` with tag-based invalidation
- `app/(dashboard)/dashboard/page.tsx` — add `revalidate: 300` (5-minute cache)  
**Effort**: 1 hour

**Impact**: Reduces database load, improves response times

---

### 5.2 Bound Unbounded Queries
**Files**: 
- `app/(dashboard)/dashboard/page.tsx` — add `take: 50` to `scheduledPosts` query
- `app/api/notifications/batch/route.ts:44-62` — add `take: 1000` limit to `read`/`dismiss` without IDs  
**Effort**: 30 minutes

**Impact**: Prevents memory exhaustion with large datasets

---

### 5.3 Make Cron Jobs Idempotent
**File**: `app/api/cron/reddit-scrape/route.ts`  
**Effort**: 1 hour

**Actions**:
- Add distributed lock (Redis or database row) before starting scrape
- Check lock at start, release in `finally` block
- Timeout lock after 1 hour

**Impact**: Prevents concurrent runs and duplicate data

---

### 5.4 Optimize Analytics Queries
**Files**: 
- `app/api/analytics/performance/route.ts`
- `app/api/analytics/overview/route.ts`  
**Effort**: 2 hours

**Actions**:
- Move aggregation from JS memory to SQL (use `groupBy`, `sum`, `avg` in Prisma)

**Impact**: Reduces RAM usage per request

---

### 5.5 Reduce Client Bundle Size
**Effort**: 2 hours

**Actions**:
- Dynamic import `recharts`, `framer-motion`, `react-grid-layout` (load on demand)
- Tree-shake `@tiptap/*` (only import used extensions)

**Impact**: Faster initial page load, better Core Web Vitals

---

## Verification Checklist

After completing all phases, verify:

- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm run build` succeeds
- [ ] Docker image builds and runs locally
- [ ] Health check endpoint returns 200
- [ ] Auth middleware blocks unauthenticated requests
- [ ] Security headers present in response
- [ ] Cron routes reject GET requests
- [ ] Error boundaries catch and log errors
- [ ] Receipt email shows correct amount
- [ ] Push notifications deliver (if implemented)
- [ ] Database migrations apply cleanly
- [ ] Backups run successfully

---

## Recommended Execution Order

1. **Complete Phase 0 first** (security is non-negotiable)
2. **Phase 1 + Phase 2 in parallel** (independent)
3. **Phase 3** (infrastructure depends on Phase 2 schema fixes)
4. **Phase 4** (UX fixes, can start after Phase 0)
5. **Phase 5** (performance optimization, can be post-launch)

---

## Post-Launch Monitoring

After deployment:
- Monitor Sentry for errors
- Track response times (should improve with caching)
- Watch database connection pool usage
- Verify cron jobs run on schedule
- Check email delivery rates
- Monitor backup success
