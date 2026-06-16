# Database Backup & Restore Guide

## Quick Start

### Create a backup
```bash
./scripts/backup.sh
```

### Restore from backup
```bash
./scripts/restore.sh backups/socialbeam_2026-06-15T120000Z.sql.gz
```

## Backup Strategy

### Schedule
The backup script should be scheduled via cron:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/social-beam/scripts/backup.sh >> /var/log/socialbeam-backup.log 2>&1
```

### Retention
- **Local backups**: 30 days (configurable via `RETENTION_DAYS`)
- **S3 backups**: Configure lifecycle policy in AWS S3 console

### Storage
- **Local**: `./backups/` directory (configurable via `BACKUP_DIR`)
- **Remote**: S3 bucket (optional, requires `S3_BUCKET` env var)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BACKUP_DIR` | No | Local backup directory (default: `./backups`) |
| `RETENTION_DAYS` | No | Delete local backups older than N days (default: 30) |
| `S3_BUCKET` | No | S3 bucket name for remote backup |
| `S3_PREFIX` | No | S3 key prefix (default: `backups/`) |
| `AWS_ACCESS_KEY_ID` | If S3 | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | If S3 | AWS credentials |
| `AWS_DEFAULT_REGION` | If S3 | AWS region |

## Restore Procedure

### 1. List available backups
```bash
ls -lh backups/
```

### 2. Stop the application
```bash
docker compose -f docker-compose.prod.yml stop app
```

### 3. Restore the database
```bash
./scripts/restore.sh backups/socialbeam_2026-06-15T120000Z.sql.gz
```

The script will:
- Prompt for confirmation
- Terminate existing database connections
- Restore the database in a single transaction
- Exit with error code if restore fails

### 4. Restart the application
```bash
docker compose -f docker-compose.prod.yml start app
```

### 5. Verify the restore
```bash
docker compose -f docker-compose.prod.yml exec app psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

## Restore from S3

```bash
./scripts/restore.sh s3://my-bucket/backups/socialbeam_2026-06-15T120000Z.sql.gz
```

Requires AWS credentials in environment or `~/.aws/credentials`.

## Disaster Recovery

### Point-in-Time Recovery (PITR)
If you need to restore to a specific point in time:
1. Restore the most recent backup before that time
2. Apply WAL logs up to the desired timestamp (requires WAL archiving setup)

### WAL Archiving (Advanced)
For continuous backup, enable WAL archiving in `postgresql.conf`:
```
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://my-bucket/wal-archive/%f'
```

Then use `pg_basebackup` for full backups and restore with recovery target time.

## Testing Backups

Regularly test restore procedures:

```bash
# Create a test database
createdb socialbeam_test

# Restore backup to test database
DATABASE_URL="postgresql://user:pass@localhost:5432/socialbeam_test" \
  ./scripts/restore.sh backups/latest.sql.gz

# Verify data integrity
psql socialbeam_test -c "SELECT COUNT(*) FROM users;"

# Clean up
dropdb socialbeam_test
```

## Troubleshooting

### "pg_dump: command not found"
Install PostgreSQL client:
```bash
# Ubuntu/Debian
apt-get install postgresql-client

# Alpine
apk add postgresql-client

# macOS
brew install postgresql
```

### "aws: command not found"
Install AWS CLI:
```bash
# Ubuntu/Debian
apt-get install awscli

# macOS
brew install awscli
```

### Restore fails with "database is being accessed by other users"
The script automatically terminates connections. If it still fails:
```bash
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'socialbeam';"
```

### S3 upload fails
- Verify AWS credentials: `aws sts get-caller-identity`
- Check bucket permissions: `aws s3 ls s3://my-bucket`
- Ensure bucket exists in correct region

## Backup Monitoring

Monitor backup success via cron logs:
```bash
tail -f /var/log/socialbeam-backup.log
```

Set up alerts for:
- Backup failures (non-zero exit code)
- Backup size anomalies (sudden drop = possible issue)
- Missing backups (cron not running)
