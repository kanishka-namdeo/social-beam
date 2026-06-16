#!/usr/bin/env bash
set -euo pipefail

# Social Beam — Database Restore Script
# Restores from local backup or downloads from S3.
#
# Usage:
#   ./scripts/restore.sh <backup-file.sql.gz>
#   ./scripts/restore.sh s3://bucket/backups/socialbeam_2026-06-15T120000Z.sql.gz
#
# Environment variables:
#   DATABASE_URL      — PostgreSQL connection string (required)
#   S3_BUCKET         — S3 bucket name (required if restoring from S3)
#   AWS_ACCESS_KEY_ID — AWS credentials (required if restoring from S3)
#   AWS_SECRET_ACCESS_KEY
#   AWS_DEFAULT_REGION

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file>"
  echo ""
  echo "Examples:"
  echo "  $0 backups/socialbeam_2026-06-15T120000Z.sql.gz"
  echo "  $0 s3://my-bucket/backups/socialbeam_2026-06-15T120000Z.sql.gz"
  echo ""
  echo "Available local backups:"
  ls -lh "${BACKUP_DIR:-$PROJECT_DIR/backups}"/socialbeam_*.sql.gz 2>/dev/null || echo "  (none found)"
  exit 1
fi

BACKUP_SOURCE="$1"

# Load environment
if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a
  source "$PROJECT_DIR/.env.production"
  set +a
fi

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is not set}"

# Handle S3 download
if [[ "$BACKUP_SOURCE" == s3://* ]]; then
  echo "[$(date -Iseconds)] Downloading from S3: $BACKUP_SOURCE"
  TEMP_DIR=$(mktemp -d)
  BACKUP_FILE="$TEMP_DIR/$(basename "$BACKUP_SOURCE")"
  if aws s3 cp "$BACKUP_SOURCE" "$BACKUP_FILE"; then
    echo "[$(date -Iseconds)] Download complete."
    trap "rm -rf $TEMP_DIR" EXIT
  else
    echo "[$(date -Iseconds)] ERROR: S3 download failed!" >&2
    rm -rf "$TEMP_DIR"
    exit 1
  fi
else
  BACKUP_FILE="$BACKUP_SOURCE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE" >&2
  exit 1
fi

# Extract database host for display
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

echo ""
echo "WARNING: This will overwrite the current database!"
echo "  Backup file: $BACKUP_FILE"
echo "  Target: $DB_HOST/$DB_NAME"
echo ""
read -rp "Type 'RESTORE' to confirm: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Aborted."
  exit 0
fi

echo "[$(date -Iseconds)] Starting restore from $BACKUP_FILE..."

# Terminate existing connections
echo "[$(date -Iseconds)] Terminating existing database connections..."
psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

if gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL" --single-transaction --set ON_ERROR_STOP=1; then
  echo "[$(date -Iseconds)] Restore complete."
else
  echo "[$(date -Iseconds)] ERROR: Restore failed!" >&2
  exit 1
fi
