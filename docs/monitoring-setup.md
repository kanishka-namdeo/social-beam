# Uptime Monitoring Setup

Quick-start guide for external uptime monitoring of SocialBeam production.

## Health Endpoints

Two endpoints are available for monitoring:

| Endpoint | Purpose | Recommended Interval | Expected Response |
|----------|---------|---------------------|-------------------|
| `/api/health/live` | Liveness probe (app running) | 30 seconds | `200 OK` with `{"status":"ok"}` |
| `/api/health/ready` | Readiness probe (all deps healthy) | 5 minutes | `200 OK` with `{"status":"healthy"}` or `503` if degraded |

## UptimeRobot Setup (Recommended)

[UptimeRobot](https://uptimerobot.com) offers 50 free monitors.

### Step 1: Create Account

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Verify your email

### Step 2: Add Monitors

Click **"+ Add New Monitor"** and create these monitors:

#### Monitor 1: Liveness Check

- **Monitor Type**: HTTP(s)
- **Friendly Name**: SocialBeam - Liveness
- **URL**: `https://yourdomain.com/api/health/live`
- **Monitoring Interval**: 30 seconds (available on paid plan; use 5 min on free)
- **Expected Status**: 200

#### Monitor 2: Readiness Check

- **Monitor Type**: HTTP(s)
- **Friendly Name**: SocialBeam - Readiness
- **URL**: `https://yourdomain.com/api/health/ready`
- **Monitoring Interval**: 5 minutes
- **Expected Status**: 200

#### Monitor 3: Homepage

- **Monitor Type**: HTTP(s)
- **Friendly Name**: SocialBeam - Homepage
- **URL**: `https://yourdomain.com/`
- **Monitoring Interval**: 5 minutes
- **Expected Status**: 200

### Step 3: Configure Alerts

1. Go to **My Settings → Alert Contacts**
2. Add alert contacts:
   - Email (team distribution list)
   - Slack webhook (for `#alerts` channel)
   - SMS (for on-call engineer)
3. Set alert threshold: **2 consecutive failures** before triggering

### Step 4: Test Alerts

```bash
# Temporarily stop the app to trigger alerts
docker compose -f docker-compose.prod.yml stop app

# Wait 2-3 minutes for alerts to fire
# Then restart
docker compose -f docker-compose.prod.yml start app
```

Verify:
- [ ] Alert received within 2-3 minutes
- [ ] Alert includes service name, URL, timestamp
- [ ] Recovery notification received after restart

## Key User Flow Monitoring

In addition to health checks, monitor critical user flows:

### Login Flow

Create a synthetic transaction that:
1. Loads `/login`
2. Submits credentials (use test account)
3. Verifies redirect to `/dashboard`
4. Checks for authenticated user data

Tools: [Checkly](https://checklyhq.com), [Playwright](https://playwright.dev), or custom script.

### Post Creation Flow

Synthetic transaction that:
1. Navigates to `/compose`
2. Enters test content
3. Clicks "Schedule"
4. Verifies success message

### Platform Connection Flow

Synthetic transaction that:
1. Navigates to `/accounts`
2. Clicks "Connect Account"
3. Verifies OAuth flow initiates

## Alert Configuration

### Slack Integration

1. In Slack, create `#alerts` channel
2. Add incoming webhook: **Apps → Manage → Custom Apps → New Integration → Incoming Webhooks**
3. Copy webhook URL
4. In UptimeRobot: **My Settings → Alert Contacts → Add Alert Contact → Webhook**
5. Paste webhook URL

### Email Alerts

- Add team distribution list: `team@socialbeam.ai`
- Add on-call engineer email
- Set digest: immediate for critical, daily summary for warnings

### SMS Alerts

- Add on-call phone number
- Use for critical alerts only (downtime > 5 minutes)

## Monitoring Dashboard

Create a status page (UptimeRobot Pro feature or use [Better Stack](https://betterstack.com)):

- Public status page: `status.socialbeam.ai`
- Show uptime for last 30/90 days
- Include incident history

## Related Documentation

- [Monitoring Checklist](./monitoring-checklist.md) - Full pre-launch verification
- [Alerting Configuration](./alerting.md) - Server-side alerting setup
- [Deployment Guide](./deployment.md) - VPS deployment instructions
