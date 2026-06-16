# Monitoring Verification Checklist

Pre-launch monitoring verification for Social Beam production deployment.

## Pre-Launch Monitoring Setup

Complete ALL items in this checklist before going live with real traffic.

---

## 1. Error Tracking (Sentry)

### 1.1 Configuration

- [ ] `NEXT_PUBLIC_SENTRY_DSN` set in `.env.production`
- [ ] `@sentry/nextjs` installed and configured
- [ ] `instrumentation.ts` initializes Sentry SDK
- [ ] Source maps uploaded during build (verify `sentry-cli` in build pipeline)

### 1.2 Verification

- [ ] **Trigger a test error** and confirm it appears in Sentry dashboard:
  ```bash
  curl -X POST https://yourdomain.com/api/compose \
    -H "Content-Type: application/json" \
    -d '{"platform": "nonexistent_platform", "content": "test"}'
  ```
- [ ] Error shows correct stack trace with source-mapped file names
- [ ] User context is attached to errors (user ID, workspace ID)
- [ ] Release tag matches deployed version (git SHA)

### 1.3 Alert Rules

- [ ] Email alerts configured for new error occurrences
- [ ] Slack/webhook alerts configured for critical errors
- [ ] Alert frequency set (not more than 1 alert per 5 minutes per issue)

---

## 2. Log Aggregation

### 2.1 Configuration

- [ ] Application logs in structured JSON format (Pino)
- [ ] Docker log driver configured (json-file with rotation)
- [ ] Log aggregation service connected (Loki/Datadog/Papertrail)
- [ ] Log levels properly set (`info` for production, not `debug`)

### 2.2 Verification

- [ ] **Check application logs flow to aggregation service**:
  ```bash
  docker compose -f docker-compose.prod.yml logs app --tail=5
  ```
- [ ] Logs contain structured fields: `timestamp`, `level`, `message`, `requestId`
- [ ] No sensitive data in logs (no passwords, tokens, or PII)
- [ ] Log rotation configured (`max-size: 10m`, `max-file: 3`)

### 2.3 Dashboard

- [ ] Log dashboard created with key queries:
  - Error rate over time
  - Slow requests (>1s)
  - 5xx responses by endpoint
  - Authentication failures

---

## 3. Uptime Monitoring

### 3.1 Configuration

- [ ] External uptime monitor configured (UptimeRobot/Better Stack/Healthchecks.io)
- [ ] Monitor checks `GET /api/health/live` every 30-60 seconds
- [ ] Monitor checks `GET /` every 5 minutes
- [ ] Alert contacts configured (email + Slack)
- [ ] Alert threshold: 2 consecutive failures before paging

### 3.2 Verification

- [ ] **Trigger test downtime** and confirm alert is received:
  ```bash
  docker compose -f docker-compose.prod.yml stop app
  # Wait for alert (should arrive within 2-3 minutes)
  docker compose -f docker-compose.prod.yml start app
  ```
- [ ] Alert includes: service name, URL, response code, timestamp
- [ ] Recovery notification received after app restarts

### 3.3 Monitored Endpoints

| Endpoint | Frequency | Expected Status |
|----------|-----------|-----------------|
| `/api/health/live` | 30s | 200 |
| `/api/health/ready` | 60s | 200 |
| `/` (homepage) | 5min | 200 |
| `/api/health` | 5min | 200 |

---

## 4. Performance Monitoring

### 4.1 Core Web Vitals

- [ ] `useReportWebVitals` configured in `app/layout.tsx`
- [ ] Web Vitals sent to analytics/Sentry
- [ ] Dashboard shows LCP, FID, CLS metrics

### 4.2 API Response Times

- [ ] Response time logging in place (or use Sentry/AWS X-Ray)
- [ ] p95 response time tracked per endpoint
- [ ] Slow query logging enabled for database

### 4.3 Verification

- [ ] Run load test and check metrics:
  ```bash
  k6 run --vus 20 --duration 30s scripts/load-test.js
  ```
- [ ] p95 response time under 2 seconds for all endpoints
- [ ] Error rate under 1% during load test
- [ ] No memory leaks observed (memory stable over test duration)

---

## 5. Infrastructure Monitoring

### 5.1 Server Metrics

- [ ] CPU usage monitored (alert at >80% for 5 minutes)
- [ ] Memory usage monitored (alert at >85%)
- [ ] Disk usage monitored (alert at >80%)
- [ ] Network I/O monitored

### 5.2 Docker Container Health

- [ ] Container restart count tracked (alert on >3 restarts/hour)
- [ ] Container memory usage monitored
- [ ] Container CPU usage monitored
- [ ] Disk space for Docker volumes monitored

### 5.3 Database Monitoring

- [ ] PostgreSQL connection pool utilization tracked
- [ ] Slow query log enabled (>1s queries logged)
- [ ] Database size monitored (alert at >80% of disk)
- [ ] Replication lag monitored (if using replicas)

### 5.4 Verification

- [ ] **Check current server metrics**:
  ```bash
  # CPU
  top -bn1 | head -5

  # Memory
  free -h

  # Disk
  df -h

  # Docker resource usage
  docker stats --no-stream
  ```

---

## 6. Business Metrics

### 6.1 Key Indicators

- [ ] Active users tracked (daily/weekly/monthly)
- [ ] Posts published per day tracked
- [ ] Platform connection success rate tracked
- [ ] Revenue/MRR tracked (Stripe integration)

### 6.2 Alerting

- [ ] Sudden drop in active users alerts configured
- [ ] Publish failure rate alerts configured (>5% failure rate)
- [ ] Stripe webhook failure alerts configured

---

## 7. Security Monitoring

### 7.1 Detection

- [ ] Failed login attempts monitored and alerted
- [ ] Rate limit triggers logged
- [ ] Suspicious IP patterns tracked
- [ ] API abuse detection in place

### 7.2 Verification

- [ ] **Test security monitoring**:
  ```bash
  # Simulate brute force
  for i in {1..20}; do
    curl -s -X POST https://yourdomain.com/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@example.com","password":"wrong'$i'"}'
  done
  ```
- [ ] Alerts received for brute force attempt
- [ ] Rate limit events logged

---

## 8. Alert Testing Matrix

| Alert Type | Test Method | Expected Result | Status |
|------------|-------------|-----------------|--------|
| Uptime down | Stop app container | Alert within 2-3 min | [ ] |
| Error rate spike | Trigger 5 errors rapidly | Alert within 5 min | [ ] |
| High CPU | Run CPU-intensive task | Alert at >80% | [ ] |
| Low disk | Fill disk temporarily | Alert at >80% | [ ] |
| Database failure | Stop PostgreSQL | Immediate alert | [ ] |
| SSL expiry | Check cert dates | Alert if <30 days | [ ] |
| Backup failure | Break backup script | Alert on failure | [ ] |
| Publish failure | Trigger publish failure | Alert within 5 min | [ ] |
| Stripe webhook error | Send invalid webhook | Alert on failure | [ ] |

---

## 9. Monitoring Dashboard

### 9.1 Required Views

Create a monitoring dashboard with these panels:

| Panel | Data Source | Refresh |
|-------|-------------|---------|
| Error Rate (5m window) | Sentry | 30s |
| Response Time (p50/p95/p99) | Sentry/AWS X-Ray | 30s |
| Request Volume | Server logs | 30s |
| Active Users | Database analytics | 5min |
| Posts Published | Database analytics | 5min |
| Database Connections | PostgreSQL metrics | 30s |
| CPU/Memory/Disk | Server metrics | 1min |
| Uptime Status | Uptime monitor | 30s |

### 9.2 Access

- [ ] Dashboard accessible to all team members
- [ ] Mobile access configured for on-call alerts
- [ ] Dashboard link in team wiki/runbook

---

## 10. Runbook Links

Ensure these runbooks are accessible from the monitoring dashboard:

- [ ] [Deployment Guide](./deployment.md)
- [ ] [Rollback Procedure](./rollback-procedure.md)
- [ ] [Backup Procedure](./backup-procedure.md)
- [ ] [Database Backup & Restore](./database-backup-restore.md)
- [ ] [Alerting Configuration](./alerting.md)

---

## Sign-Off

| Team Member | Role | Sign-Off Date | Notes |
|-------------|------|---------------|-------|
| | Engineering | | |
| | DevOps | | |
| | Product | | |

---

## Related Documentation

- [Alerting Configuration](./alerting.md) - Server-side alerting setup
- [Deployment Guide](./deployment.md) - Full VPS deployment
- [Rollback Procedure](./rollback-procedure.md) - Application rollback
- [Load Testing](../scripts/load-test.js) - k6 load test scripts
