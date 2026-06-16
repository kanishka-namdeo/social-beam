# Database Backup and Recovery

This document describes the database backup strategy, procedures, and recovery process for Social Beam.

## Overview

Social Beam uses automated PostgreSQL backups with S3 storage to ensure data durability and enable point-in-time recovery. Backups are compressed, encrypted in transit, and retained according to the configured retention policy.

## Backup Strategy

### Backup Schedule

- **Frequency**: Daily automated backups via cron
- **Time**: 2:00 AM UTC (configurable in `scripts/crontab.txt`)
- **Type**: Full database dump using `pg_dump`
- **Compression**: gzip (typically 80-90% size reduction)
- **Storage**: S3-compatible object storage (AWS S3, Wasabi, Backblaze B2, etc.)
- **Retention**: 7 days by default (configurable via `BACKUP_RETENTION_DAYS`)

### Backup Contents

Each backup includes:
- All database schemas and tables
- All user data, posts, analytics, and configurations
- Database constraints, indexes, and sequences
- Custom types and functions

**Not included**:
- Database transaction logs (WAL)
- Binary large objects (if any stored outside standard columns)

## Environment Variables

The backup scripts require the following environment variables:

### Required Variables

```bash
# Database Connection
DB_HOST=localhost              # PostgreSQL host
DB_PORT=5432                   # PostgreSQL port
DB_NAME=socialbeam             # Database name
DB_USER=socialbeam             # Database user
DB_PASSWORD=your_password      # Database password

# S3 Storage
S3_BUCKET=your-backup-bucket   # S3 bucket name
S3_REGION=us-east-1            # S3 region
S3_ACCESS_KEY_ID=your_key      # S3 access key
S3_SECRET_ACCESS_KEY=your_secret  # S3 secret key
```

### Optional Variables

```bash
# Backup Configuration
BACKUP_RETENTION_DAYS=7        # Days to retain backups (0 to disable cleanup)
S3_BACKUP_PREFIX=backups/database  # S3 key prefix for backups
BACKUP_DIR=/tmp/socialbeam-backups  # Local temporary directory
```

## Manual Backup

### Create a Backup

Run the backup script manually:

```bash
# Set required environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=socialbeam
export DB_USER=socialbeam
export DB_PASSWORD=your_password
export S3_BUCKET=your-backup-bucket
export S3_REGION=us-east-1
export S3_ACCESS_KEY_ID=your_key
export S3_SECRET_ACCESS_KEY=your_secret

# Run backup
./scripts/backup-db.sh
```

The script will:
1. Validate environment variables
2. Run `pg_dump` to create a full database dump
3. Compress the dump with gzip
4. Upload to S3 with timestamp-based filename
5. Clean up old backups beyond retention period
6. Remove local temporary files

**Expected output**:
```
[INFO] === Social Beam Database Backup ===
[INFO] Timestamp: 20240115_120000
[INFO] Backup directory: /tmp/socialbeam-backups
[INFO] Starting database backup...
[INFO] Database: socialbeam@localhost:5432
[INFO] Compressing backup...
[INFO] Backup created: socialbeam_20240115_120000.sql.gz (15M)
[INFO] Uploading to S3...
[INFO] Upload complete: s3://your-backup-bucket/backups/database/socialbeam_20240115_120000.sql.gz
[INFO] Cleaning up backups older than 7 days...
[INFO] Local backup file cleaned up
[INFO] === Backup completed successfully ===
```

## Manual Restore

### List Available Backups

```bash
# Set required environment variables (same as backup)
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=socialbeam
export DB_USER=socialbeam
export DB_PASSWORD=your_password
export S3_BUCKET=your-backup-bucket
export S3_REGION=us-east-1
export S3_ACCESS_KEY_ID=your_key
export S3_SECRET_ACCESS_KEY=your_secret

# List backups
./scripts/restore-db.sh --list
```

**Expected output**:
```
[INFO] Available backups in s3://your-backup-bucket/backups/database/:

  socialbeam_20240115_120000.sql.gz  (2024-01-15 12:00:00, 15728640 bytes)
  socialbeam_20240114_020000.sql.gz  (2024-01-14 02:00:00, 15204352 bytes)
  socialbeam_20240113_020000.sql.gz  (2024-01-13 02:00:00, 14680064 bytes)
  ...
```

### Restore Latest Backup

```bash
# Restore latest backup (will prompt for confirmation)
./scripts/restore-db.sh
```

### Restore Specific Backup

```bash
# Restore specific backup by filename
./scripts/restore-db.sh socialbeam_20240115_120000.sql.gz
```

### Restore Without Confirmation

```bash
# Skip confirmation prompt (use with caution)
./scripts/restore-db.sh --force socialbeam_20240115_120000.sql.gz
```

**Restore process**:
1. Downloads backup from S3
2. Prompts for confirmation (unless `--force` is used)
3. Terminates existing database connections
4. Drops and recreates the database
5. Restores all data from backup
6. Cleans up temporary files

**Warning**: Restore operations are **destructive** and will overwrite all existing data in the target database.

## Automated Backups

Backups are scheduled via system cron. See `docs/cron-scheduler.md` for details.

**Cron schedule** (default):
```
0 2 * * * /app/scripts/backup-db.sh >> /var/log/socialbeam/backup.log 2>&1
```

This runs daily at 2:00 AM UTC.

## Recovery Procedures

### Scenario 1: Accidental Data Deletion

**Time to recover**: 5-10 minutes

1. Identify the time of deletion
2. Choose a backup from before the deletion:
   ```bash
   ./scripts/restore-db.sh --list
   ```
3. Restore to a **temporary database** first:
   ```bash
   export DB_NAME=socialbeam_restore
   ./scripts/restore-db.sh socialbeam_20240115_120000.sql.gz
   ```
4. Extract the needed data:
   ```bash
   psql -d socialbeam_restore -c "SELECT * FROM posts WHERE created_at < '2024-01-15 12:00:00';"
   ```
5. Re-insert into production database
6. Drop temporary database:
   ```bash
   psql -c "DROP DATABASE socialbeam_restore;"
   ```

### Scenario 2: Complete Database Corruption

**Time to recover**: 10-15 minutes

1. Stop the application:
   ```bash
   pm2 stop social-beam
   ```
2. Restore latest backup:
   ```bash
   ./scripts/restore-db.sh --force
   ```
3. Run migrations (if needed):
   ```bash
   pnpm prisma migrate deploy
   ```
4. Restart the application:
   ```bash
   pm2 start social-beam
   ```
5. Verify application health:
   ```bash
   curl http://localhost:3000/api/health/ready
   ```

### Scenario 3: Point-in-Time Recovery

**Note**: Current backup strategy does not support true point-in-time recovery (PITR) as WAL archiving is not enabled. You can only restore to the time of the last backup.

For PITR requirements:
1. Enable WAL archiving (requires PostgreSQL configuration)
2. Use tools like `pgBackRest` or `Barman`
3. Consider managed PostgreSQL with built-in PITR

## Backup Verification

### Verify Backup Integrity

Download and test a backup without restoring:

```bash
# Download backup
aws s3 cp s3://your-backup-bucket/backups/database/socialbeam_20240115_120000.sql.gz /tmp/

# Decompress
gunzip /tmp/socialbeam_20240115_120000.sql.gz

# Verify it's a valid PostgreSQL dump
pg_restore --list /tmp/socialbeam_20240115_120000.sql | head -20
```

### Monitor Backup Success

Check backup logs:

```bash
# View recent backup logs
tail -100 /var/log/socialbeam/backup.log

# Check for errors
grep -i "error\|failed" /var/log/socialbeam/backup.log | tail -20
```

### Verify S3 Storage

List backups in S3:

```bash
aws s3 ls s3://your-backup-bucket/backups/database/ --human-readable
```

## Security Considerations

### Encryption

- **In transit**: All S3 uploads use HTTPS
- **At rest**: Enable S3 bucket encryption:
  ```bash
  aws s3api put-bucket-encryption \
    --bucket your-backup-bucket \
    --server-side-encryption-configuration '{
      "Rules": [
        {
          "ApplyServerSideEncryptionByDefault": {
            "SSEAlgorithm": "AES256"
          }
        }
      ]
    }'
  ```

### Access Control

- Use IAM roles/policies to restrict S3 access
- Limit database credentials to backup user with minimal privileges
- Rotate S3 credentials regularly
- Enable S3 bucket versioning for additional protection

### Backup User Permissions

Create a dedicated backup user with minimal permissions:

```sql
-- Create backup user
CREATE USER socialbeam_backup WITH PASSWORD 'secure_password';

-- Grant connect privilege
GRANT CONNECT ON DATABASE socialbeam TO socialbeam_backup;

-- Grant usage on all schemas
GRANT USAGE ON SCHEMA public TO socialbeam_backup;

-- Grant SELECT on all tables (for pg_dump)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO socialbeam_backup;

-- Grant SELECT on all sequences
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO socialbeam_backup;

-- Auto-grant on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO socialbeam_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO socialbeam_backup;
```

## Troubleshooting

### Backup Fails: "pg_dump: command not found"

**Solution**: Install PostgreSQL client tools:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# RHEL/CentOS
sudo yum install postgresql

# Alpine (Docker)
apk add postgresql-client
```

### Backup Fails: "could not connect to server"

**Solutions**:
1. Verify database is running: `pg_isready -h localhost -p 5432`
2. Check connection parameters in environment variables
3. Verify firewall allows connections
4. Check `pg_hba.conf` allows the backup user

### Restore Fails: "database is being accessed by other users"

**Solution**: The script automatically terminates connections, but you can manually force it:

```bash
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='socialbeam' AND pid <> pg_backend_pid();"
```

### S3 Upload Fails: "Access Denied"

**Solutions**:
1. Verify S3 credentials are correct
2. Check IAM policy allows `s3:PutObject` and `s3:ListBucket`
3. Verify bucket exists and region is correct
4. Check bucket policy doesn't deny access

### Backup Size Seems Too Small

**Possible causes**:
1. Database is empty or has very little data
2. `pg_dump` failed silently (check logs)
3. Compression ratio is unusually high

**Verify**:
```bash
# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('socialbeam'));"

# Compare with backup size
ls -lh /tmp/socialbeam-backups/
```

## Cost Estimation

### S3 Storage Costs (AWS S3 Standard-IA)

Assuming:
- Daily backup size: 15 MB (compressed)
- Retention: 7 days
- Storage per month: 15 MB × 7 = 105 MB

**Monthly cost** (at $0.023/GB):
- 105 MB = 0.105 GB
- Cost: 0.105 × $0.023 = **$0.0024/month**

**Negligible cost** for typical Social Beam deployments.

### Alternative: Wasabi

Wasabi offers hot cloud storage at $6.99/TB/month with no egress fees:
- 105 MB = 0.000105 TB
- Cost: 0.000105 × $6.99 = **$0.0007/month**

Even cheaper, and no retrieval fees.

## Backup Testing

**Recommendation**: Test restore procedure quarterly to ensure:
1. Backups are valid and restorable
2. Team is familiar with recovery process
3. Recovery time meets RTO (Recovery Time Objective)
4. Documentation is accurate and complete

**Test procedure**:
1. Restore latest backup to staging environment
2. Verify application starts successfully
3. Check data integrity (spot-check critical tables)
4. Document any issues and update procedures

## Support

For backup-related issues:
1. Check logs: `/var/log/socialbeam/backup.log`
2. Verify environment variables are set correctly
3. Test database connectivity manually
4. Review this documentation for troubleshooting steps

## Related Documentation

- [Cron Scheduler](./cron-scheduler.md) - Backup scheduling
- [Deployment Guide](./deployment.md) - Production deployment
- [Disaster Recovery](./disaster-recovery.md) - Full DR procedures (TODO)
