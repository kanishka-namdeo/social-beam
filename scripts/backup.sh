#!/usr/bin/env bash
set -euo pipefail

# Social Beam — Database Backup Script
# Supports local backups with gzip compression and optional S3 upload.
#
# Usage:
#   ./scripts/backup.sh                        # Local backup only
#   S3_BUCKET=my-bucket ./scripts/backup.sh    # Local + S3 upload
#
# Environment variables:
#   DATABASE_URL            — PostgreSQL connection string (required)
#   BACKUP_DIR              — Local backup directory (default: ./backups)
#   RETENTION_DAYS          — Delete local backups older than N days (default: 30)
#   S3_BUCKET               — S3 bucket name for remote backup (optional)
#   S3_PREFIX               — S3 key prefix (default: backups/)
#   AWS_ACCESS_KEY_ID       — AWS credentials (required if S3_BUCKET set)
#   AWS_SECRET_ACCESS_KEY
#   AWS_DEFAULT_REGION

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment
if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a
  source "$PROJECT_DIR/.env.production"
  set +a
fi

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is not set}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
BACKUP_FILENAME="socialbeam_${TIMESTAMP}.sql.gz"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILENAME"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup..."

if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date -Iseconds)] Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"
else
  echo "[$(date -Iseconds)] ERROR: Backup failed!" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Upload to S3 if configured
if [ -n "${S3_BUCKET:-}" ]; then
  S3_PREFIX="${S3_PREFIX:-backups/}"
  S3_KEY="s3://${S3_BUCKET}/${S3_PREFIX}${BACKUP_FILENAME}"

  echo "[$(date -Iseconds)] Uploading to $S3_KEY..."
  if aws s3 cp "$BACKUP_FILE" "$S3_KEY" --storage-class STANDARD_IA; then
    echo "[$(date -Iseconds)] S3 upload complete."
  else
    echo "[$(date -Iseconds)] WARNING: S3 upload failed — local backup preserved." >&2
  fi
fi

# Retention: remove local backups older than RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -name "socialbeam_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date -Iseconds)] Cleaned up $DELETED backup(s) older than $RETENTION_DAYS days"
fi

echo "[$(date -Iseconds)] Done."
