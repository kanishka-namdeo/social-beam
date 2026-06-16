# Rollback Procedure

Step-by-step rollback procedures for Social Beam deployments.

## Docker Image Tagging Strategy

### Tag Naming Convention

All Docker images follow this tagging strategy:

```
socialbeam-app:<version>
socialbeam-app:<git-sha>
socialbeam-app:latest
```

| Tag | Example | Description |
|-----|---------|-------------|
| Semantic version | `v1.2.3` | Stable release, manually tagged |
| Git SHA | `a1b2c3d` | Every build gets the commit SHA |
| Latest | `latest` | Most recent production build |
| Branch | `feat/new-dashboard` | Feature branch builds (CI only) |

### Build-Time Tagging

```bash
# In CI/CD or deployment script
VERSION=$(git describe --tags --always --dirty)
GIT_SHA=$(git rev-parse --short HEAD)

docker build -t socialbeam-app:${VERSION} \
             -t socialbeam-app:${GIT_SHA} \
             -t socialbeam-app:latest \
             -f Dockerfile .
```

### Pre-Deployment Tag Verification

```bash
# Verify image exists before deploying
docker pull socialbeam-app:${GIT_SHA} || {
  echo "Image ${GIT_SHA} not found in registry. Aborting."
  exit 1
}
```

## Rollback Scenarios

### Scenario 1: Bad Deployment (Application Code)

**Trigger**: New deployment causes errors, crashes, or regressions.

**Time to rollback**: ~2 minutes

```bash
# Step 1: Identify the last known-good image
docker images socialbeam-app --format "{{.Tag}} {{.CreatedAt}}" | head -10

# Or from deployment history (if logged)
# cat /opt/social-beam/deploy-history.log

# Step 2: Stop current stack
cd /opt/social-beam
docker compose -f docker-compose.prod.yml down app

# Step 3: Update docker-compose.prod.yml to use the previous image tag
# Change: image: socialbeam-app:latest
# To:     image: socialbeam-app:<previous-sha>

# Step 4: Start with previous image
docker compose -f docker-compose.prod.yml up -d app

# Step 5: Verify health
sleep 10
curl -f https://yourdomain.com/api/health/live || echo "Rollback verification failed!"

# Step 6: Run smoke tests
./scripts/smoke-test.sh

# Step 7: Update deploy history
echo "$(date -u) ROLLBACK to $(git rev-parse --short HEAD)" >> deploy-history.log
```

### Scenario 2: Bad Database Migration

**Trigger**: Schema migration breaks the application.

**Time to rollback**: ~5-10 minutes (depends on database size)

```bash
# Step 1: Stop the application to prevent further writes
cd /opt/social-beam
docker compose -f docker-compose.prod.yml stop app

# Step 2: Identify the backup to restore
ls -lt backups/socialbeam_*.sql.gz | head -5

# Step 3: Restore from backup
# The backup should be from BEFORE the migration ran
./scripts/restore.sh backups/socialbeam_<timestamp>.sql.gz

# Step 4: Mark the migration as un-applied (if Prisma tracks it)
# Check the _prisma_migrations table
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U socialbeam -d socialbeam -c \
  "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# Delete the bad migration record if needed
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U socialbeam -d socialbeam -c \
  "DELETE FROM _prisma_migrations WHERE migration_name = '<bad-migration-name>';"

# Step 5: Rollback application code to pre-migration version
# (Follow Scenario 1 steps)

# Step 6: Restart and verify
docker compose -f docker-compose.prod.yml start app
sleep 10
curl -f https://yourdomain.com/api/health/ready

# Step 7: Run data integrity checks
docker compose -f docker-compose.prod.yml exec app \
  pnpm db:migrate  # Verify no pending migrations

# Verify critical tables
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U socialbeam -d socialbeam -c \
  "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM posts;"
```

### Scenario 3: Infrastructure Failure (Container Crash)

**Trigger**: Docker container crashes, OOM killed, or unhealthy.

**Time to recovery**: ~1 minute (automatic with restart policy)

```bash
# Step 1: Check container status
docker compose -f docker-compose.prod.yml ps

# Step 2: Check logs for crash reason
docker compose -f docker-compose.prod.yml logs app --tail=100

# Step 3: If OOM killed, check memory limits
docker stats --no-stream socialbeam-app-1

# Step 4: Restart the service (Docker should auto-restart due to unless-stopped policy)
docker compose -f docker-compose.prod.yml restart app

# Step 5: If restart fails, check disk space
df -h
docker system df

# Step 6: Clean up if needed
docker system prune -f
docker compose -f docker-compose.prod.yml up -d
```

### Scenario 4: SSL Certificate Expiry

**Trigger**: Let's Encrypt certificate expires or fails to renew.

```bash
# Step 1: Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null \
  | openssl x509 -noout -dates

# Step 2: Force certificate renewal
docker compose -f docker-compose.prod.yml exec certbot \
  certbot renew --force-renewal

# Step 3: Reload nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Step 4: Verify new certificate
sleep 5
curl -I https://yourdomain.com
```

### Scenario 5: Complete VPS Recovery

**Trigger**: Server failure, data loss, or migration to new VPS.

**Time to recovery**: ~30-60 minutes

```bash
# Step 1: Provision new VPS (follow docs/deployment.md)

# Step 2: Clone repository
cd /opt
git clone https://github.com/your-org/social-beam.git
cd social-beam

# Step 3: Restore environment variables
# Copy .env.production from backup/secret store
# NEVER commit .env.production to git

# Step 4: Restore database
./scripts/restore.sh s3://your-bucket/backups/socialbeam_<latest>.sql.gz

# Step 5: Run migrations
pnpm install --frozen-lockfile
pnpm db:migrate

# Step 6: Deploy application
docker compose -f docker-compose.prod.yml up -d

# Step 7: Verify
./scripts/smoke-test.sh

# Step 8: Update DNS if needed
# Point DNS to new VPS IP
```

## Rollback Drill (Quarterly)

Perform this drill quarterly to ensure team readiness.

### Drill Steps

1. **Preparation** (5 min)
   - Notify team of drill
   - Document current version: `git rev-parse HEAD`
   - Record current database state snapshot

2. **Deploy Change** (5 min)
   - Make a small, identifiable change (e.g., add feature flag)
   - Deploy new version
   - Verify change is live

3. **Execute Rollback** (10 min)
   - Time the rollback from decision to verification
   - Follow the appropriate scenario above
   - Document any issues

4. **Verification** (5 min)
   - Run smoke tests: `./scripts/smoke-test.sh`
   - Verify data integrity
   - Confirm rollback version is correct

5. **Post-Mortem** (10 min)
   - Record total time
   - Document any issues or blockers
   - Update this document if procedure changed
   - Store drill results in `docs/rollback-drill-results/`

### Drill Results Template

```markdown
## Rollback Drill - YYYY-MM-DD

| Metric | Value |
|--------|-------|
| Date | YYYY-MM-DD |
| Conducted by | Name |
| Scenario tested | X |
| Time to rollback | X minutes |
| Smoke test passed | Yes/No |
| Data integrity verified | Yes/No |
| Issues found | Description |
| Action items | List |
```

## Prevention Measures

### Before Every Deployment

1. **Run environment verification**:
   ```bash
   ./scripts/verify-env.sh
   ```

2. **Run smoke tests on staging**:
   ```bash
   ./scripts/smoke-test.sh https://staging.yourdomain.com
   ```

3. **Create database backup**:
   ```bash
   ./scripts/backup.sh
   ```

4. **Tag the current image before deploying new one**:
   ```bash
   CURRENT_SHA=$(docker inspect socialbeam-app:latest --format '{{.Id}}' | cut -c8-15)
   docker tag socialbeam-app:latest socialbeam-app:pre-deploy-${CURRENT_SHA}
   ```

### Deployment Checklist

- [ ] Environment verification passed
- [ ] Smoke tests passed on staging
- [ ] Database backup completed
- [ ] Previous image tagged and preserved
- [ ] Rollback procedure reviewed
- [ ] Team notified of deployment window
- [ ] Monitoring alerts verified active

## Related Documentation

- [Deployment Guide](./deployment.md) - Full VPS deployment procedure
- [Database Backup & Restore](./database-backup-restore.md) - Database backup strategy
- [Backup Procedure](./backup-procedure.md) - Backup and restore testing
