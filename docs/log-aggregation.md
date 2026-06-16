# Log Aggregation

SocialBeam uses [Pino](https://getpino.io) for structured JSON logging to stdout. In production, logs should be shipped to an external aggregation service for search, alerting, and retention.

## Log Format

All logs are JSON with the following shape:

```json
{
  "level": 30,
  "time": "2026-06-15T18:00:00.000Z",
  "env": "production",
  "requestId": "abc-123",
  "userId": "user-456",
  "msg": "api.request.success"
}
```

Log levels: `debug` (20), `info` (30), `warn` (40), `error` (50), `fatal` (60).

## Recommended Providers

### Axiom (Recommended for small teams)

1. Create an account at [axiom.co](https://axiom.co)
2. Create a dataset named `socialbeam-prod`
3. Install the Axiom ingestion action:

```bash
# In docker-compose.prod.yml, add env vars to the app service:
AXIOM_TOKEN=<your-ingest-token>
AXIOM_DATASET=socialbeam-prod
```

4. Use the Axiom Docker collector or ship stdout via Vector/Filebeat:

```yaml
# vector.toml
[sources.docker_logs]
type = "docker_logs"

[sinks.axiom]
type = "axiom"
inputs = ["docker_logs"]
dataset = "socialbeam-prod"
token = "${AXIOM_TOKEN}"
```

### Better Stack Logs (formerly Logtail)

1. Create a source at [logs.betterstack.com](https://logs.betterstack.com)
2. Use the provided source token:

```bash
LOGTAIL_SOURCE_TOKEN=<your-token>
```

3. Ship via Docker log driver or Vector:

```yaml
# docker-compose.prod.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Then use the Better Stack Docker integration or Logtail agent.

### Grafana Loki (Self-hosted)

1. Deploy Loki via Docker Compose or Kubernetes
2. Use Promtail as a log shipper:

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080
positions:
  filename: /tmp/positions.yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
scrape_configs:
  - job_name: socialbeam
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        regex: '/socialbeam-app'
        target_label: app
```

## Log-Based Alerts

Configure these alerts in your log provider:

| Alert | Query | Severity |
|---|---|---|
| Error spike | `count(level=50) > 10 per minute` | critical |
| DB connection lost | `msg:"db.connection*" AND level=60` | critical |
| Stripe webhook failure | `msg:"stripe.webhook.error"` | critical |
| Publish watchdog | `msg:"publish.watchdog.stuck"` | warning |

## Web Vitals

Client-side Core Web Vitals (LCP, FID, CLS, INP, FCP, TTFB) are reported via `lib/web-vitals.ts`.

The module uses the `web-vitals` package and reports metrics to:
1. **Sentry** (if configured) — via `Sentry.metrics`
2. **Analytics endpoint** — POST to `/api/analytics/web-vitals`

### Setup

The `web-vitals` package is installed as a dependency. Import and call `reportWebVitals()` in your client-side entry point or root layout.

### Metrics Tracked

| Metric | Description | Good | Needs Improvement | Poor |
|---|---|---|---|---|
| LCP | Largest Contentful Paint | ≤2.5s | ≤4s | >4s |
| INP | Interaction to Next Paint | ≤200ms | ≤500ms | >500ms |
| CLS | Cumulative Layout Shift | ≤0.1 | ≤0.25 | >0.25 |
| FCP | First Contentful Paint | ≤1.8s | ≤3s | >3s |
| TTFB | Time to First Byte | ≤800ms | ≤1.8s | >1.8s |
