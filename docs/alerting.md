# Server-Side Alerting

SocialBeam supports sending alerts to Slack, generic webhooks, and email (via Resend) when critical issues are detected.

## Configuration

Set the following environment variables to enable alerting channels:

| Variable | Required | Description |
|---|---|---|
| `ALERT_SLACK_WEBHOOK_URL` | Optional | Slack incoming webhook URL for the `#alerts` channel |
| `ALERT_GENERIC_WEBHOOK_URL` | Optional | Generic webhook URL (receives JSON POST with alert payload) |
| `RESEND_API_KEY` | For email | Resend API key for transactional email |
| `ALERT_EMAIL_FROM` | For email | Sender address (default: `alerts@socialbeam.local`) |
| `ALERT_EMAIL_TO` | For email | Comma-separated list of recipient email addresses |

If no channels are configured, `sendAlert()` logs a warning and returns without sending.

## Alert Types

| Function | Severity | Trigger |
|---|---|---|
| `alertDatabaseFailure(error)` | critical | Health check detects DB connection failure |
| `alertPublishQueueBacklog(count, ids)` | warning/critical | Watchdog finds posts stuck in PUBLISHING >30min |
| `alertStripeWebhookFailure(event, error)` | critical | Stripe webhook handler throws |
| `alertHighErrorRate(rate)` | critical | Error rate exceeds 10/min |

## Webhook Payload Format

Generic webhooks receive a JSON POST with:

```json
{
  "title": "Database Connection Failure",
  "message": "The application cannot reach the database",
  "severity": "critical",
  "source": "health-check",
  "timestamp": "2026-06-15T18:00:00.000Z",
  "environment": "production",
  "metadata": { "error": "connection refused" }
}
```

Headers include `X-Alert-Severity` and `X-Alert-Source` for routing.

## Slack Setup

1. In Slack, go to **Settings → Manage apps → Incoming Webhooks**
2. Create a webhook for your `#alerts` or `#ops` channel
3. Copy the webhook URL to `ALERT_SLACK_WEBHOOK_URL`

## External Uptime Monitoring

Configure an external monitor to poll `GET /api/health` every 60 seconds:

| Service | Free Tier | Setup |
|---|---|---|
| [UptimeRobot](https://uptimerobot.com) | 50 monitors | Add HTTP(s) monitor pointing to `https://your-domain.com/api/health`, expect 200 |
| [Better Stack](https://betterstack.com) | 10 monitors | Add heartbeat or HTTP monitor |
| [Healthchecks.io](https://healthchecks.io) | 20 checks | Use cron ping or HTTP monitor |

Recommended: set alerting threshold to 2 consecutive failures before paging.

## Integration Points

- `app/api/health/route.ts` — calls `alertDatabaseFailure()` on DB failure
- `app/api/cron/publish-watchdog/route.ts` — calls `alertPublishQueueBacklog()`
- `app/api/stripe/webhook/route.ts` — calls `alertStripeWebhookFailure()` on handler errors
- Error rate monitoring can be added to `instrumentation.ts` or a cron job
