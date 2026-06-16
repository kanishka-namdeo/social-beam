# Log Management with Loki

Operational guide for querying and managing logs in SocialBeam's self-hosted Loki stack.

## Architecture

```
App (Pino JSON logs) → Docker logs → Promtail → Loki → Grafana
```

- **Loki**: Log aggregation service (like Prometheus but for logs)
- **Promtail**: Log shipper that reads Docker container logs and forwards to Loki
- **Grafana**: Query and visualize logs (optional but recommended)

## Accessing Logs

### Via Docker (Development)

```bash
# View live logs
docker compose -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 app

# Filter by level
docker compose -f docker-compose.prod.yml logs app 2>&1 | grep '"level":50'
```

### Via Loki API

Loki runs on `http://localhost:3100` (not exposed publicly).

```bash
# Query last 100 log lines from app
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={app="socialbeam-app"}' \
  --data-urlencode 'limit=100' | jq

# Query errors only
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={app="socialbeam-app"} | json | level="50"' \
  --data-urlencode 'limit=50' | jq
```

### Via Grafana (Recommended)

1. Add Loki as data source: **Configuration → Data Sources → Add data source → Loki**
2. URL: `http://loki:3100`
3. Go to **Explore** tab
4. Select Loki data source
5. Use LogQL queries (see below)

## LogQL Queries

LogQL is Loki's query language (similar to PromQL).

### Basic Queries

```logql
# All logs from app container
{app="socialbeam-app"}

# Filter by container name
{container_name="socialbeam-app"}

# Logs from specific service
{job="socialbeam"}
```

### Filtering

```logql
# Error logs (level 50)
{app="socialbeam-app"} | json | level="50"

# Logs containing specific text
{app="socialbeam-app"} |= "api.request.error"

# Logs NOT containing text
{app="socialbeam-app"} != "health.check"

# Multiple filters
{app="socialbeam-app"} | json | level="50" | line_format "{{.msg}}"
```

### Structured Log Queries

Since logs are JSON, you can query specific fields:

```logql
# Filter by requestId
{app="socialbeam-app"} | json | requestId="abc-123"

# Filter by userId
{app="socialbeam-app"} | json | userId="user-456"

# Filter by message
{app="socialbeam-app"} | json | msg="api.request.error"

# Filter by HTTP method
{app="socialbeam-app"} | json | method="POST"
```

### Aggregations

```logql
# Count errors per minute
sum(count_over_time({app="socialbeam-app"} | json | level="50" [1m])) by (msg)

# Request rate per endpoint
sum(rate({app="socialbeam-app"} | json | msg="api.request.success" [5m])) by (path)

# Error rate (errors / total requests)
sum(rate({app="socialbeam-app"} | json | level="50" [5m])) /
sum(rate({app="socialbeam-app"} | json | msg=~"api.request.*" [5m]))
```

## Common Debugging Queries

### Find all errors in last hour

```logql
{app="socialbeam-app"} | json | level="50"
```

### Find slow API requests (>1s)

```logql
{app="socialbeam-app"} | json | msg="api.request.success" | duration > 1000
```

### Find failed authentication attempts

```logql
{app="socialbeam-app"} | json | msg="auth.login.failed"
```

### Find publish failures

```logql
{app="socialbeam-app"} | json | msg="publish.failed"
```

### Find database errors

```logql
{app="socialbeam-app"} | json | msg=~"db.*" | level="50"
```

### Trace a specific request

```logql
{app="socialbeam-app"} | json | requestId="abc-123-def"
```

## Log Levels

| Level | Number | Usage |
|-------|--------|-------|
| `debug` | 20 | Development only, verbose output |
| `info` | 30 | Normal operations (default in production) |
| `warn` | 40 | Degraded but functional (e.g., Redis down) |
| `error` | 50 | Operation failed but app continues |
| `fatal` | 60 | App cannot continue, will crash |

## Log Format

All logs are structured JSON:

```json
{
  "level": 30,
  "time": "2026-06-15T18:00:00.000Z",
  "env": "production",
  "requestId": "abc-123",
  "userId": "user-456",
  "msg": "api.request.success",
  "method": "GET",
  "path": "/api/analytics/overview",
  "duration": 145
}
```

Key fields:
- `level`: Numeric log level (see table above)
- `time`: ISO 8601 timestamp
- `requestId`: Unique per request (use for tracing)
- `userId`: Authenticated user (if available)
- `msg`: Log message / event name
- Additional fields vary by event

## Log-Based Alerts

Configure alerts in Grafana or Loki for proactive monitoring.

### Alert: Error Spike

```logql
sum(count_over_time({app="socialbeam-app"} | json | level="50" [1m])) > 10
```

**Action**: Check Sentry for error details, review recent deployments.

### Alert: Database Connection Lost

```logql
{app="socialbeam-app"} | json | msg="db.connection.failed" | level="60"
```

**Action**: Check PostgreSQL container, verify `DATABASE_URL`, check network.

### Alert: High Error Rate

```logql
(
  sum(rate({app="socialbeam-app"} | json | level="50" [5m])) /
  sum(rate({app="socialbeam-app"} | json | msg=~"api.request.*" [5m]))
) > 0.05
```

**Action**: Review error logs, check dependencies (DB, Redis, external APIs).

### Alert: Publish Watchdog

```logql
{app="socialbeam-app"} | json | msg="publish.watchdog.stuck"
```

**Action**: Check publish queue, verify CloakBrowser is running, review stuck posts.

## Log Retention

Default Loki configuration retains logs for 30 days. To change:

Edit `deploy/loki-config.yml`:

```yaml
limits_config:
  retention_period: 90d  # Change to desired retention
```

Restart Loki:

```bash
docker compose -f docker-compose.prod.yml restart loki
```

## Performance Tuning

### Increase Loki Memory Limit

If Loki is slow or dropping logs, increase memory:

In `docker-compose.prod.yml`:

```yaml
loki:
  deploy:
    resources:
      limits:
        memory: 1G  # Increase from 512M
```

### Reduce Promtail Batch Size

If logs are delayed, reduce batch size in `deploy/promtail-config.yml`:

```yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
    batchwait: 1s      # Reduce from default 3s
    batchsize: 1048576 # Reduce from default 1MB
```

## Troubleshooting

### Logs not appearing in Loki

1. Check Promtail is running:
   ```bash
   docker compose -f docker-compose.prod.yml logs promtail
   ```

2. Verify Promtail can reach Loki:
   ```bash
   docker compose -f docker-compose.prod.yml exec promtail wget -qO- http://loki:3100/ready
   ```

3. Check Promtail positions file (tracks last read position):
   ```bash
   docker compose -f docker-compose.prod.yml exec promtail cat /tmp/positions.yaml
   ```

### Loki using too much disk

1. Check disk usage:
   ```bash
   docker system df -v | grep loki
   ```

2. Reduce retention period (see above)

3. Compact index (Loki 2.0+):
   ```bash
   docker compose -f docker-compose.prod.yml exec loki loki-compactor
   ```

## Related Documentation

- [Log Aggregation Overview](./log-aggregation.md) - General logging architecture
- [Monitoring Checklist](./monitoring-checklist.md) - Pre-launch verification
- [Alerting Configuration](./alerting.md) - Server-side alerting setup
