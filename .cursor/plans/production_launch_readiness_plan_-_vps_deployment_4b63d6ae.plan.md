---
name: Production Launch Readiness Plan - VPS Deployment
overview: ""
todos: []
isProject: false
---

# Production Launch Readiness Plan - VPS Deployment

## Executive Summary

Deep analysis reveals **7 critical launch blockers**, **12 high-priority security gaps**, and **operational deficiencies** that must be resolved before going live. The app has strong fundamentals (bcrypt-12, AES-256-GCM encryption, PKCE OAuth, DB-backed cron locks) but requires immediate fixes to MCP OAuth validation, unauthenticated endpoints, and deployment documentation.

---

## Phase 0: Critical Launch Blockers (Must Complete Before Deployment)

### 0.1 Fix MCP OAuth Client Validation
**Risk**: Any client_id accepted, any redirect_uri valid → authorization code interception  
**Files to modify**: 
- `app/api/auth/mcp-authorize/route.ts` - Add client_id allowlist validation
- `lib/mcp/auth.ts` - Implement registered client store or use environment-based allowlist

**Changes needed**:
```typescript
// Validate client_id against registered/allowed clients
const ALLOWED_CLIENTS = process.env.MCP_ALLOWED_CLIENT_IDS?.split(',') || [];
if (!ALLOWED_CLIENTS.includes(clientId)) {
  return NextResponse.json({ error: 'Unauthorized client' }, { status: 401 });
}

// Validate redirect_uri against registered URIs per client
const registeredRedirectUris = await getRegisteredRedirectUris(clientId);
if (!registeredRedirectUris.includes(redirectUri)) {
  return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 });
}
```

### 0.2 Fix MCP Token Revocation System
**Risk**: JTI claim not set in JWTs → revoked tokens remain valid  
**File**: `lib/mcp/jwt.ts`

**Changes needed**:
```typescript
// When signing JWT, include jti claim
const jwt = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setJti(crypto.randomUUID()) // CRITICAL: Add this
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(secret);

// When verifying, extract jti and check revocation list
const { payload } = await jwtVerify(token, secret);
if (payload.jti && await isTokenRevoked(payload.jti)) {
  throw new Error('Token revoked');
}
```

### 0.3 Fix Stripe Price ID Validation
**Risk**: Client can specify arbitrary price IDs → unauthorized charges  
**File**: `app/api/stripe/checkout/route.ts`

**Changes needed**:
```typescript
const VALID_PRICE_IDS = [
  process.env.STRIPE_PRICE_MONTHLY,
  process.env.STRIPE_PRICE_YEARLY,
  process.env.STRIPE_PRICE_PRO_MONTHLY,
  process.env.STRIPE_PRICE_PRO_YEARLY,
].filter(Boolean);

if (!VALID_PRICE_IDS.includes(priceId)) {
  logger.error('stripe.checkout.invalid_price', { priceId, userId });
  return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
}
```

### 0.4 Secure Unauthenticated Endpoints
**Risk**: `/api/sync/status` accessible without auth, no error handling  
**File**: `app/api/sync/status/route.ts`

**Changes needed**:
```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getWorkspaceForUser(session.user.id);
    // ... existing logic
  } catch (error) {
    logger.error('sync.status.error', { error: String(error), userId: session?.user?.id });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Also check and secure**:
- Verify all cron routes are POST-only (some still expose GET)
- Audit proxy.ts public API allowlist for over-permission

### 0.5 Create .env.example File
**Risk**: No documentation for 25+ required environment variables  
**File**: `.env.example` (new file)

**Content needed**:
```bash
# ===== DATABASE =====
DATABASE_URL="postgresql://user:password@localhost:5432/socialbeam"

# ===== AUTHENTICATION =====
AUTH_SECRET="generate-with-openssl-random-hex-32"
NEXTAUTH_URL="https://yourdomain.com"

# ===== AI/LLM =====
OPENAI_API_KEY="sk-..."
BASE_URL="https://api.openai.com/v1"
MODEL="gpt-4o"
FAST_MODEL="gpt-4o-mini"

# ===== PAYMENTS =====
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_MONTHLY="price_..."
STRIPE_PRICE_YEARLY="price_..."
STRIPE_PRICE_PRO_MONTHLY="price_..."
STRIPE_PRICE_PRO_YEARLY="price_..."

# ===== EMAIL =====
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# ===== SECURITY =====
TOKEN_ENCRYPTION_KEY="generate-with-openssl-random-hex-32"
MCP_JWT_SECRET="generate-with-openssl-random-hex-32"
CRON_SECRET="generate-with-openssl-random-hex-32"

# ===== PUSH NOTIFICATIONS =====
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."

# ===== OPTIONAL: OAUTH PROVIDERS =====
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""

# ===== OPTIONAL: STORAGE =====
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""

# ===== OPTIONAL: MONITORING =====
NEXT_PUBLIC_SENTRY_DSN=""

# ===== OPTIONAL: REDIS =====
REDIS_URL="redis://localhost:6379"

# ===== APP CONFIG =====
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### 0.6 Replace Nginx Placeholder Domain
**Risk**: SSL certificates won't work with `your-domain.com`  
**File**: `nginx/nginx.conf`

**Changes needed**:
Replace all instances of `your-domain.com` with actual domain. Also update certbot command in `docker-compose.prod.yml`.

### 0.7 Activate Error Rate Monitoring
**Risk**: `alertHighErrorRate()` exists but never called → blind to outages  
**Files to modify**:
- `app/api/compose/route.ts` - Track error rate
- `lib/publish/orchestrator.ts` - Alert on publish failures
- Create new middleware or wrapper to monitor error rates globally

**Implementation approach**: Use Redis counter with sliding window (e.g., count errors in last 5 minutes). Trigger alert when threshold exceeded (e.g., >10 errors/minute).

---

## Phase 1: High-Priority Security Hardening

### 1.1 Implement CSRF Protection
**Risk**: Cross-site request forgery attacks on state-changing operations  
**Approach**: Add CSRF tokens to forms and validate on POST/PUT/PATCH/DELETE

**Files to modify**:
- Create `lib/csrf.ts` - Token generation/validation utilities
- `proxy.ts` middleware - Add CSRF validation for state-changing requests (except API routes using other auth mechanisms like cron secrets)
- All form components - Include CSRF token in hidden inputs

### 1.2 Tighten IP-Based Rate Limiting
**Risk**: `x-forwarded-for` spoofable without proper nginx/proxy config  
**File**: `lib/auth-rate-limit.ts`, `lib/redis-rate-limiter.ts`

**Changes needed**:
```typescript
// Only trust first IP in x-forwarded-for chain
function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim(); // First IP only
  }
  return req.headers.get('x-real-ip') || 'unknown';
}
```

Ensure nginx sets `X-Real-IP` correctly:
```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

### 1.3 Switch Email Verification to POST
**Risk**: GET-based email verification vulnerable to browser prefetch  
**Files to modify**:
- `app/api/auth/verify-email/route.ts` - Change from GET to POST
- Email template (`lib/email/templates/verification.tsx`) - Update link to trigger auto-submit form
- Create `app/(auth)/verify-email/page.tsx` - Auto-submit page that POSTs to API

### 1.4 Restrict Content Security Policy
**Risk**: `unsafe-eval` and `unsafe-inline` weaken XSS protection  
**File**: `next.config.ts`

**Changes needed**:
Remove `'unsafe-eval'` from `script-src`. For `unsafe-inline`, evaluate if inline scripts are actually needed (likely from third-party integrations). If possible, use nonce-based CSP:

```typescript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; ..."
}
```

### 1.5 Invalidate Sessions on Password Reset
**Risk**: Existing sessions remain valid after password change  
**File**: `app/api/auth/reset-password/route.ts`

**Changes needed**:
```typescript
await prisma.session.deleteMany({
  where: { userId: user.id }
});
```

### 1.6 Validate OAuth State Parameter
**Risk**: CSRF via OAuth state manipulation  
**Files**: `app/api/onboarding/oauth/callback/route.ts`, LinkedIn callback

**Changes needed**: Store state in httpOnly cookie during auth initiation, validate matches on callback.

### 1.7 Audit Cron Route Accessibility
**Files**: All `app/api/cron/*/route.ts` files

**Verification needed**:
- Confirm all cron routes only export POST handler (not GET)
- Ensure CRON_SECRET validation happens before any business logic
- Check that advisory lock acquisition uses unique lock IDs per cron job

---

## Phase 2: Data Integrity & Reliability

### 2.1 Establish Prisma Migration Baseline
**Risk**: Single `0_init` migration prevents schema evolution tracking  
**Action**:
```bash
pnpm dlx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/1_baseline/migration.sql
pnpm dlx prisma migrate resolve --applied 1_baseline
```

Document migration workflow in README/deployment docs.

### 2.2 Encrypt Stored OAuth Tokens
**Risk**: Some ConnectedAccount records may have unencrypted tokens  
**File**: `prisma/migrations/X_encrypt_existing_tokens/migration.sql` + migration script

**Approach**: One-time migration script to encrypt existing plaintext tokens, then add NOT NULL constraint to encrypted fields.

### 2.3 Implement Dead Letter Queue for Failed Jobs
**Risk**: Permanently failed publishes/syncs silently lost  
**New table in Prisma schema**:
```prisma
model DeadLetterQueue {
  id            String   @id @default(cuid())
  entityType    String   // 'post', 'sync', 'token_refresh'
  entityId      String
  error         String
  retryCount    Int      @default(0)
  maxRetries    Int      @default(3)
  nextRetryAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  metadata      Json?
}
```

**Files to create**:
- `lib/dead-letter-queue.ts` - DLQ management
- Modify `lib/publish/orchestrator.ts` - Push to DLQ after max retries
- Add admin UI route `app/(dashboard)/admin/dlq/page.tsx` - Manual retry inspection

### 2.4 Add Circuit Breakers for External APIs
**Risk**: Cascading failures when LinkedIn/Stripe/Resend down  
**File**: Create `lib/circuit-breaker.ts`

**Implementation**: Track failure count per service. Open circuit after threshold (e.g., 5 failures). Half-open after cooldown (e.g., 60s). Apply to:
- `lib/analytics/sync.ts` - LinkedIn/Instagram/Facebook APIs
- `lib/oauth/token-refresh.ts` - Token refresh calls
- `lib/email/service.ts` - Resend API

### 2.5 Add Max Retry Limit to Watchdog
**Risk**: Watchdog retries posts indefinitely  
**File**: `lib/publish/watchdog.ts`

**Changes needed**: Add `retryCount` field to Post model, increment on each retry, skip if exceeds max (e.g., 3).

### 2.6 Activate Sentry Performance Spans
**Risk**: No distributed tracing for critical paths  
**Files to modify**:
- `lib/publish/orchestrator.ts` - Wrap publish operations in `Sentry.startSpan`
- `lib/analytics/sync.ts` - Wrap sync operations
- `lib/agent/graph.ts` - Trace agent execution

**Example**:
```typescript
const result = await Sentry.startSpan(
  { name: 'publish.post', op: 'queue.process', attributes: { postId } },
  async () => {
    return await publishPost(post);
  }
);
```

### 2.7 Alert on Token Expiry
**Risk**: Users silently lose platform connectivity  
**File**: `lib/oauth/token-refresh.ts`

**Changes needed**: After marking account as `expired`, send notification to user via email/in-app notification.

---

## Phase 3: Operational Readiness

### 3.1 Add Redis to Production Docker Compose
**Risk**: Code supports Redis but prod compose doesn't include it → falls back to in-memory (not shared across instances)  
**File**: `docker-compose.prod.yml`

**Add service**:
```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
  networks:
    - internal
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 1G
```

Update `app` service environment:
```yaml
environment:
  - REDIS_URL=redis://redis:6379
depends_on:
  redis:
    condition: service_started
```

### 3.2 Automate Backup Scheduling
**Risk**: Backup scripts exist but not automated  
**File**: Create systemd timer or add to docker-compose

**Approach 1 (systemd)**:
```ini
# /etc/systemd/system/socialbeam-backup.timer
[Unit]
Description=Daily SocialBeam backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

**Approach 2 (cron inside container)**:
Add cron entry in Dockerfile or separate sidecar container running cron.

### 3.3 Standardize Console Logging
**Risk**: 8 API routes use `console.error` instead of structured logger  
**Files to fix**:
- `app/api/processes/route.ts`
- `app/api/processes/[id]/route.ts`
- `app/api/processes/[id]/cancel/route.ts`
- `app/api/processes/[id]/stream/route.ts`
- `app/api/health/route.ts`

**Replace**: `console.error(...)` → `logger.error(...)`

### 3.4 Add Test Script and CI Integration
**Risk**: Vitest installed but no test script, zero test coverage verification  
**File**: `package.json`

**Add**:
```json
"scripts": {
  "test": "vitest",
  "test:ci": "vitest run --coverage"
}
```

**File**: `.github/workflows/ci.yml`

**Add step**:
```yaml
- name: Run tests
  run: pnpm test:ci
```

### 3.5 Align Node Versions
**Risk**: Main Dockerfile uses Node 20, CloakBrowser uses Node 22  
**File**: `Dockerfile`

**Change**: Upgrade to Node 22 LTS (or align both to 20 LTS). Document reasoning.

### 3.6 Add Database Migration Script
**Risk**: No convenient way to run migrations in production  
**File**: `package.json`

**Add**:
```json
"scripts": {
  "db:migrate": "prisma migrate deploy",
  "db:seed": "tsx prisma/seed.ts"
}
```

Note: `db:seed` already uses `npx tsx` — change to `pnpm dlx tsx` for consistency.

### 3.7 Create Deployment Documentation
**Risk**: No clear deployment guide for VPS  
**File**: Create `docs/deployment.md`

**Include**:
1. VPS provisioning steps (Ubuntu 22.04+, firewall, SSH hardening)
2. DNS configuration
3. Docker/docker-compose installation
4. Environment variable setup (reference .env.example)
5. Initial database migration
6. SSL certificate generation
7. Smoke test checklist
8. Rollback procedure

### 3.8 Fix db:seed Script Convention
**File**: `package.json`

**Change**: `"db:seed": "npx tsx ..."` → `"db:seed": "pnpm dlx tsx ..."`

---

## Phase 4: Performance & Monitoring

### 4.1 Implement OpenTelemetry Tracing
**Benefit**: Distributed tracing across services  
**Files to create/modify**:
- Install `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
- `instrumentation.ts` - Initialize OTel SDK
- Export traces to Sentry or Jaeger

### 4.2 Add Core Web Vitals Monitoring
**File**: `app/layout.tsx` or dedicated component

**Use Next.js built-in**:
```typescript
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics/Sentry
    Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: 'info',
      extra: metric,
    });
  });
}
```

### 4.3 Analyze and Optimize Bundle Size
**Command**:
```bash
ANALYZE=true pnpm build
```

**Review**: Identify large dependencies, lazy-load where possible (e.g., TipTap editors, Recharts, Framer Motion).

### 4.4 Implement Response Caching Strategy
**Files to add caching headers**:
- `app/api/analytics/**/route.ts` - Cache aggregation results (5min)
- `app/api/dashboard/widgets/route.ts` - Cache widget configs (1min)
- Static assets already cached by nginx (good)

**Example**:
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
  },
});
```

### 4.5 Set Up Uptime Monitoring
**Service**: Use UptimeRobot, Pingdom, or self-hosted Healthchecks.io

**Monitor**:
- `https://yourdomain.com/api/health/live` (every 30s)
- `https://yourdomain.com` (every 5min)
- Key user flows (login, post creation) weekly

### 4.6 Configure Log Aggregation
**Risk**: Pino logs to stdout but no central collection  
**Options**:
- **Self-hosted**: Loki + Grafana (add to docker-compose)
- **Cloud**: Datadog, LogDNA, Papertrail

Add to `docker-compose.prod.yml`:
```yaml
loki:
  image: grafana/loki:latest
  # ... config
```

Configure Docker logging driver to send to Loki.

---

## Phase 5: SEO & User Experience

### 5.1 Add robots.txt and sitemap.xml
**Files to create**:
- `app/robots.ts` - Dynamic robots.txt generation
- `app/sitemap.ts` - Dynamic sitemap generation

**Example robots.ts**:
```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
```

### 5.2 Create Custom 404 Page
**File**: Create `app/not-found.tsx`

**Design**: Match brand aesthetic, provide navigation back to home/dashboard.

### 5.3 Improve Error Pages
**Files**: Review all `error.tsx` files

**Enhancements**:
- Clear error messages (no technical jargon)
- Actionable next steps
- "Contact support" link
- Breadcrumb navigation

### 5.4 Add Loading Indicators for Long Operations
**Identify slow operations**:
- Publish queue processing (show progress)
- Analytics sync (show status updates)
- Brand context generation (show streaming progress)

**Implementation**: Use existing SSE infrastructure or polling with progress indicators.

---

## Phase 6: Pre-Launch Verification Checklist

### 6.1 Environment Variable Verification
**Script to create**: `scripts/verify-env.sh`

**Checks**:
- All required vars present and non-empty
- DATABASE_URL connects successfully
- AUTH_SECRET is 32+ bytes
- Stripe keys are valid (test API call)
- Resend API key works (send test email)
- S3 credentials have correct permissions

### 6.2 Public Domain Smoke Tests
**Manual checklist**:
- [ ] Homepage loads (<3s)
- [ ] Login flow works end-to-end
- [ ] Dashboard widgets render
- [ ] Create a post (write path verification)
- [ ] Schedule a post
- [ ] View analytics
- [ ] Health endpoint returns 200 through public domain
- [ ] SSL certificate valid
- [ ] HSTS header present
- [ ] Rate limiting active (try 10 rapid requests)

### 6.3 Rollback Drill
**Test rollback procedure**:
1. Deploy current version (tag as v1.0.0)
2. Make a change and deploy v1.0.1
3. Execute rollback to v1.0.0
4. Verify system operational
5. Document time taken and any issues

**Rollback mechanism**: Tag Docker images, keep previous image available.

### 6.4 Load Testing
**Tool**: k6 or Artillery

**Test scenarios**:
- Homepage load (100 concurrent users)
- Login flow (50 concurrent)
- Post creation (20 concurrent)
- Analytics dashboard (30 concurrent)

**Metrics to capture**:
- Response times (p50, p95, p99)
- Error rates
- CPU/memory usage
- Database connection pool saturation

### 6.5 Security Penetration Test
**Automated tools**:
- OWASP ZAP scan
- SQLMap against API endpoints
- SSL Labs test (A+ target)

**Manual checks**:
- Attempt to access other users' data (horizontal privilege escalation)
- Test rate limits with different IPs
- Verify CORS restrictions
- Check for information leakage in error messages

### 6.6 Backup and Restore Test
**Procedure**:
1. Create backup using `scripts/backup.sh`
2. Spin up separate test database
3. Restore backup to test database
4. Verify data integrity
5. Document restoration time

### 6.7 Monitoring Verification
**Checklist**:
- [ ] Sentry receiving errors (trigger test error)
- [ ] Logs flowing to aggregation service
- [ ] Uptime monitor reporting healthy
- [ ] Alerts configured and tested
- [ ] Core Web Vitals being reported

---

## Execution Priority

**Week 1 (Launch Blockers)**: Phase 0 (all 0.1-0.7 items)  
**Week 2 (Security)**: Phase 1 (all 1.1-1.7 items)  
**Week 3 (Data Integrity)**: Phase 2 (all 2.1-2.7 items)  
**Week 4 (Operations)**: Phase 3 (all 3.1-3.8 items)  
**Week 5 (Performance)**: Phase 4 (4.1-4.6, prioritize 4.1, 4.5)  
**Week 6 (Polish)**: Phase 5 (all items)  
**Week 7 (Verification)**: Phase 6 (all checks, load test, rollback drill)

---

## Risk Mitigation

**Highest risks if skipped**:
1. MCP OAuth vulnerabilities (Phase 0.1, 0.2) - attacker can intercept authorizations
2. Unauthenticated endpoints (Phase 0.4) - data exposure
3. Missing .env.example (Phase 0.5) - deployment errors
4. No dead letter queue (Phase 2.3) - silent data loss
5. No backup automation (Phase 3.2) - unrecoverable data loss
6. No rollback test (Phase 6.3) - extended outage during incidents

**Minimum viable launch** (if time-constrained): Complete Phase 0 and Phase 1 immediately. Defer Phases 2-6 to post-launch sprint, but implement backup automation (3.2) and uptime monitoring (4.5) before any real traffic.
