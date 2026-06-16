# Backup and Restore Test Procedure

Comprehensive backup/restore testing for Social Beam production deployments.

## Overview

This document covers the procedure for testing backup creation and restoration, including automated scripts, manual verification steps, and disaster recovery scenarios.

## Existing Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `backup.sh` | Local backup with optional S3 upload | `scripts/backup.sh` |
| `restore.sh` | Restore from local or S3 backup | `scripts/restore.sh` |
| `backup-db.sh` | Full pg_dump with S3 upload | `scripts/backup-db.sh` |
| `restore-db.sh` | Full restore with S3 download | `scripts/restore-db.sh` |

## Backup Strategy

### Automated Schedule

Backups run daily at 2:00 AM UTC via cron:

```bash
# /etc/cron.d/socialbeam
0 2 * * * root /opt/social-beam/scripts/backup.sh >> /var/log/socialbeam-backup.log 2>&1
```

### Retention Policy

| Storage | Retention | Cleanup Method |
|---------|-----------|----------------|
| Local | 30 days | `find -mtime +30 -delete` in backup.sh |
| S3 | 90 days | S3 lifecycle policy |

### Backup Naming

```
socialbeam_YYYY-MM-DDTHHMMSSZ.sql.gz
```

Example: `socialbeam_2026-06-15T020000Z.sql.gz`

## Backup Test Procedure

### Step 1: Create a Backup

```bash
cd /opt/social-beam

# Run backup
./scripts/backup.sh

# Verify backup was created
ls -lh backups/socialbeam_*.sql.gz | tail -3

# Verify backup is not empty
BACKUP_FILE=$(ls -t backups/socialbeam_*.sql.gz | head -1)
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")
if [ "$BACKUP_SIZE" -gt 1000 ]; then
  echo "Backup size: $BACKUP_SIZE bytes (OK)"
else
  echo "WARNING: Backup seems too small ($BACKUP_SIZE bytes)"
fi
```

### Step 2: Verify Backup Integrity

```bash
BACKUP_FILE=$(ls -t backups/socialbeam_*.sql.gz | head -1)

# Test that it's a valid gzip file
gunzip -t "$BACKUP_FILE" && echo "Valid gzip" || echo "Corrupt backup!"

# Preview the SQL content (first 20 lines)
zcat "$BACKUP_FILE" | head -20

# Check that it contains expected tables
zcat "$BACKUP_FILE" | grep "CREATE TABLE" | head -20
```

### Step 3: Restore to Test Database

**Important**: Never restore to production without a full backup first.

```bash
# Create a test database
createdb socialbeam_test 2>/dev/null || true

# Set the test database URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/socialbeam_test"

# Restore backup
./scripts/restore.sh "$BACKUP_FILE"

# If scripts/restore.sh prompts for confirmation, type RESTORE
# Or use the --force equivalent by piping:
echo "RESTORE" | ./scripts/restore.sh "$BACKUP_FILE"
```

### Step 4: Verify Data Integrity

```bash
# Connect to test database and run checks
psql "postgresql://user:pass@localhost:5432/socialbeam_test" << 'EOF'
-- Check critical tables have data
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'connected_accounts', COUNT(*) FROM connected_accounts
UNION ALL
SELECT 'workspaces', COUNT(*) FROM workspaces
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions;

-- Verify sequences are intact
SELECT sequencename, last_value FROM sessions_id_seq;

-- Check for orphaned records
SELECT 'orphaned_posts' as check_name, COUNT(*) as count
FROM posts p
LEFT JOIN workspaces w ON p.workspace_id = w.id
WHERE w.id IS NULL;
EOF
```

### Step 5: Run Application Migration Check

```bash
# Ensure no migrations are pending on restored database
export DATABASE_URL="postgresql://user:pass@localhost:5432/socialbeam_test"
pnpm dlx prisma migrate status
```

### Step 6: Clean Up

```bash
# Drop the test database
dropdb socialbeam_test

# Clean up any temporary files
rm -rf /tmp/socialbeam_restore_*
```

## Restore Scenarios

### Scenario A: Restore Latest Backup

```bash
cd /opt/social-beam

# Stop the app first
docker compose -f docker-compose.prod.yml stop app

# Find and restore latest backup
./scripts/restore.sh "$(ls -t backups/socialbeam_*.sql.gz | head -1)"

# Restart app
docker compose -f docker-compose.prod.yml start app

# Verify
curl -f https://yourdomain.com/api/health/ready
```

### Scenario B: Restore Specific Backup

```bash
# List available backups
ls -lh backups/socialbeam_*.sql.gz

# Restore specific backup
./scripts/restore.sh backups/socialbeam_2026-06-14T020000Z.sql.gz
```

### Scenario C: Restore from S3

```bash
# List S3 backups
aws s3 ls s3://your-bucket/backups/ --human-readable

# Restore from S3
./scripts/restore.sh s3://your-bucket/backups/socialbeam_2026-06-15T020000Z.sql.gz
```

### Scenario D: Full Disaster Recovery

When restoring to a new server or after complete data loss:

```bash
# 1. Provision new server (see docs/deployment.md)

# 2. Clone repository
cd /opt
git clone https://github.com/your-org/social-beam.git
cd social-beam

# 3. Set up environment
cp .env.example .env.production
# Edit .env.production with production values

# 4. Start PostgreSQL
docker compose -f docker-compose.prod.yml up -d postgres

# 5. Wait for Postgres to be ready
until docker compose -f docker-compose.prod.yml exec postgres pg_isready; do
  sleep 2
done

# 6. Restore database from S3
./scripts/restore.sh s3://your-bucket/backups/$(aws s3 ls s3://your-bucket/backups/ | grep socialbeam | sort | tail -1 | awk '{print $4}')

# 7. Run migrations (should be no-ops if backup is current)
pnpm install --frozen-lockfile
pnpm db:migrate

# 8. Start full stack
docker compose -f docker-compose.prod.yml up -d

# 9. Verify
./scripts/smoke-test.sh
```

## Updated Backup Script Enhancements

The existing `scripts/backup.sh` and `scripts/restore.sh` have been verified for production use. Key features:

### backup.sh
- Loads `.env.production` automatically
- Creates timestamped gzip-compressed dumps
- Optional S3 upload with `S3_BUCKET` env var
- Automatic local cleanup via `RETENTION_DAYS`
- Exit code 1 on failure

### restore.sh
- Supports local files and S3 URLs
- Terminates existing connections before restore
- Confirmation prompt (type `RESTORE` to proceed)
- Single-transaction restore for atomicity
- Cleans up temp files on exit

### restore-db.sh (alternative)
- Lists available S3 backups with `--list`
- Force mode with `--force`
- Full pg_restore with format=custom backups
- Colored output for readability

## Backup Monitoring

### Cron Log Monitoring

```bash
# Check recent backup logs
tail -50 /var/log/socialbeam-backup.log

# Check for failures
grep -i "error\|failed" /var/log/socialbeam-backup.log | tail -10
```

### Automated Backup Verification

Add this cron job to verify backups daily:

```bash
# /etc/cron.d/socialbeam-verify-backup
30 3 * * * root /opt/social-beam/scripts/verify-backup.sh >> /var/log/socialbeam-backup-verify.log 2>&1
```

Create `scripts/verify-backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

LATEST=$(ls -t /opt/social-beam/backups/socialbeam_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "ERROR: No backup files found"
  exit 1
fi

# Check file age (should be < 26 hours)
FILE_AGE=$(( $(date +%s) - $(stat -c%Y "$LATEST") ))
if [ "$FILE_AGE" -gt 93600 ]; then
  echo "ERROR: Latest backup is older than 26 hours"
  exit 1
fi

# Check file size (should be > 1KB)
FILE_SIZE=$(stat -c%s "$LATEST")
if [ "$FILE_SIZE" -lt 1000 ]; then
  echo "ERROR: Backup file too small ($FILE_SIZE bytes)"
  exit 1
fi

# Verify gzip integrity
gunzip -t "$LATEST" 2>/dev/null || {
  echo "ERROR: Backup file is corrupt"
  exit 1
}

echo "OK: Backup verified - $LATEST ($FILE_SIZE bytes, $(( FILE_AGE / 3600 ))h old)"
exit 0
```

## RTO and RPO Targets

| Metric | Target | Notes |
|--------|--------|-------|
| RTO (Recovery Time Objective) | 30 minutes | Time from incident to full recovery |
| RPO (Recovery Point Objective) | 24 hours | Max data loss (daily backup schedule) |

## Related Documentation

- [Database Backup & Restore Guide](./database-backup-restore.md) - Detailed backup strategy
- [Rollback Procedure](./rollback-procedure.md) - Application rollback scenarios
- [Deployment Guide](./deployment.md) - Full VPS deployment procedure
