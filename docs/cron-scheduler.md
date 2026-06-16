# External Cron Scheduler

This document describes the external cron scheduler setup for Social Beam's scheduled tasks.

## Overview

Social Beam uses an external cron scheduler (system crontab) to trigger scheduled tasks via HTTP endpoints. This approach provides better reliability and monitoring compared to in-process schedulers like `node-cron`, especially in multi-instance deployments or containerized environments.

## Why External Cron?

### Problems with In-Process Cron (node-cron)

1. **Multiple instances**: If running multiple app instances, each runs the cron job → duplicate work
2. **No persistence**: If the app crashes during a job, it's lost
3. **Hard to monitor**: No built-in logging or alerting
4. **Scaling issues**: Jobs run on every instance, not just one

### Benefits of External Cron

1. **Single execution**: Cron runs once, regardless of app instances
2. **Reliable**: System-level scheduler, survives app restarts
3. **Observable**: Logs to standard locations, easy to monitor
4. **Flexible**: Can run from any machine with network access
5. **Standard**: Uses familiar crontab syntax

## Cron Jobs

### Critical Jobs (Must Run Externally)

These jobs are time-sensitive and must run exactly once:

| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| **Publish Posts** | Every 5 minutes | `/api/cron/publish` | Publish scheduled social media posts |
| **Sync Analytics** | Hourly (:30) | `/api/cron/sync-analytics` | Fetch latest metrics from platforms |
| **Refresh Tokens** | Daily 3:00 AM | `/api/cron/refresh-tokens` | Refresh OAuth tokens before expiry |
| **Reddit Scrape** | Every 6 hours | `/api/cron/reddit-scrape` | Scrape Reddit for trending content |

### Non-Critical Jobs (Can Run Externally or Internally)

These jobs are less time-sensitive:

| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| **Engagement Digest** | Daily 8:00 AM | `/api/cron/engagement-digest` | Send engagement summary emails |
| **Reddit Digest** | Daily 9:00 AM | `/api/cron/reddit-digest` | Send Reddit trends digest |
| **Brand Draft Cleanup** | Daily 4:00 AM | `/api/cron/brand-draft-cleanup` | Remove stale brand context drafts |
| **Checkpoint Cleanup** | Weekly Sun 5:00 AM | `/api/cron/checkpoint-cleanup` | Clean up old LangGraph checkpoints |
| **Database Backup** | Daily 2:00 AM | Script: `scripts/backup-db.sh` | Backup database to S3 |

## Installation

### Option 1: System Crontab (Recommended for VPS)

1. **Set environment variables**:

Create `/etc/default/socialbeam-cron`:

```bash
# Application URL
APP_URL=http://localhost:3000

# Cron authentication secret
CRON_SECRET=your-secure-random-secret-here

# S3 backup configuration (for database backups)
S3_BUCKET=socialbeam-backups
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=socialbeam
DB_USER=socialbeam
DB_PASSWORD=your-db-password
```

2. **Create log directory**:

```bash
sudo mkdir -p /var/log/socialbeam
sudo chown $USER:$USER /var/log/socialbeam
```

3. **Install crontab**:

```bash
# Load environment and install crontab
sudo sh -c 'cat /etc/default/socialbeam-cron scripts/crontab.txt | crontab -'
```

Or manually:

```bash
# Edit crontab
crontab -e

# Add this line at the top to load environment
SHELL=/bin/bash
APP_URL=http://localhost:3000
CRON_SECRET=your-secure-random-secret-here

# Then paste contents from scripts/crontab.txt
```

4. **Verify installation**:

```bash
# List current crontab
crontab -l

# Check cron service is running
sudo systemctl status cron
```

### Option 2: Docker Container Cron

If running in Docker, add cron to the container:

1. **Install cron in Dockerfile**:

```dockerfile
# In runner stage
RUN apk add --no-cache cronie

# Copy crontab
COPY scripts/crontab.txt /etc/crontabs/root

# Start cron in entrypoint
CMD crond -b && node server.js
```

2. **Or use a separate cron container**:

Create `docker-compose.cron.yml`:

```yaml
services:
  cron:
    image: alpine:latest
    container_name: socialbeam-cron
    restart: unless-stopped
    environment:
      - APP_URL=http://app:3000
      - CRON_SECRET=${CRON_SECRET}
    volumes:
      - ./scripts/crontab.txt:/etc/crontabs/root:ro
    command: crond -f -l 8
    depends_on:
      - app
```

### Option 3: External Cron Service

For production, consider managed cron services:

- **AWS EventBridge Rules**: Trigger Lambda or HTTP endpoints on schedule
- **Google Cloud Scheduler**: HTTP target with authentication
- **Azure Logic Apps**: Recurrence trigger with HTTP action
- **cron-job.org**: Free external cron service with monitoring

## Authentication

All cron endpoints require Bearer token authentication:

```bash
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  ${APP_URL}/api/cron/publish
```

The `CRON_SECRET` is validated in each cron route handler. Generate a secure secret:

```bash
# Generate random 32-byte hex string
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Monitoring

### Check Cron Execution

```bash
# View recent cron logs
tail -100 /var/log/socialbeam/cron-publish.log

# Check for errors
grep -i "error\|failed" /var/log/socialbeam/cron-*.log | tail -20

# Verify cron is running
sudo systemctl status cron
```

### Log Rotation

Create `/etc/logrotate.d/socialbeam`:

```
/var/log/socialbeam/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $USER $USER
}
```

### Alerting

Set up alerts for cron failures:

1. **Simple monitoring script** (`scripts/check-cron.sh`):

```bash
#!/bin/bash
# Check if cron jobs ran successfully in the last hour

LOG_DIR="/var/log/socialbeam"
ALERT_EMAIL="admin@example.com"

for log in cron-publish.log cron-analytics.log; do
    if ! grep -q "$(date '+%Y-%m-%d %H')" "${LOG_DIR}/${log}"; then
        echo "Cron job ${log} may have failed" | mail -s "Cron Alert" ${ALERT_EMAIL}
    fi
done
```

2. **External monitoring**: Use services like:
   - Healthchecks.io: Ping-based cron monitoring
   - Cronitor: Dedicated cron monitoring
   - PagerDuty: Alert on cron failures

## Troubleshooting

### Cron Job Not Running

1. **Check cron service**:
   ```bash
   sudo systemctl status cron
   sudo systemctl restart cron
   ```

2. **Verify crontab**:
   ```bash
   crontab -l
   ```

3. **Check cron logs**:
   ```bash
   # Ubuntu/Debian
   grep CRON /var/log/syslog | tail -20
   
   # RHEL/CentOS
   grep CRON /var/log/cron | tail -20
   ```

4. **Test manually**:
   ```bash
   # Source environment and run manually
   set -a && source /etc/default/socialbeam-cron && set +a
   curl -s -X POST -H "Authorization: Bearer ${CRON_SECRET}" ${APP_URL}/api/cron/publish
   ```

### Authentication Failures

**Error**: `401 Unauthorized`

**Solutions**:
1. Verify `CRON_SECRET` matches in environment and crontab
2. Check for whitespace or encoding issues
3. Regenerate secret and update both locations

### Endpoint Not Responding

**Error**: `Could not resolve host` or `Connection refused`

**Solutions**:
1. Verify `APP_URL` is correct and accessible
2. Check application is running: `pm2 status` or `docker ps`
3. Test endpoint manually: `curl ${APP_URL}/api/health`
4. Check firewall rules allow localhost connections

### Duplicate Executions

**Problem**: Job runs multiple times

**Causes**:
1. Multiple crontabs installed (user + root)
2. Both external cron and internal node-cron running
3. Multiple app instances with node-cron

**Solutions**:
1. Check for duplicate crontabs: `crontab -l` and `sudo crontab -l`
2. Disable node-cron in production (set `DISABLE_INTERNAL_CRON=true`)
3. Use external cron only for critical jobs

## Migration from node-cron

To migrate from in-process node-cron to external cron:

1. **Install external cron** (see Installation section)

2. **Disable internal cron** in production:
   ```bash
   # Add to .env
   DISABLE_INTERNAL_CRON=true
   ```

3. **Verify external cron works**:
   ```bash
   # Wait for next scheduled run, then check logs
   tail -f /var/log/socialbeam/cron-publish.log
   ```

4. **Monitor for 24 hours** to ensure all jobs run successfully

5. **Remove node-cron code** (optional):
   - Remove cron initialization from `lib/cron/index.ts`
   - Keep route handlers (still needed for HTTP endpoints)

## Security Considerations

1. **Use strong CRON_SECRET**: Minimum 32 random bytes, hex-encoded
2. **Restrict network access**: Cron endpoints should only accept localhost connections
3. **Rate limiting**: Add rate limits to cron endpoints to prevent abuse
4. **Audit logs**: Log all cron executions with timestamps and results
5. **Rotate secrets**: Periodically rotate `CRON_SECRET`

## Performance Considerations

1. **Stagger jobs**: Don't schedule all jobs at the same time
2. **Timeout handling**: Add timeouts to curl commands:
   ```bash
   curl --max-time 300 -s -X POST ...
   ```
3. **Concurrent execution**: Ensure cron jobs handle concurrent runs gracefully
4. **Resource limits**: Monitor system resources during peak cron times

## Related Documentation

- [Database Backups](./database-backups.md) - Backup schedule and procedures
- [Deployment Guide](./deployment.md) - Production deployment
- [API Reference](./api-reference.md) - Cron endpoint documentation
