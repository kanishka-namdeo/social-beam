# Automated Backup Setup

Enable daily automated database backups on the production VPS using systemd timers.

## Prerequisites

- Social Beam deployed at `/opt/social-beam`
- `.env.production` configured with `DATABASE_URL`
- `scripts/backup.sh` is executable (`chmod +x scripts/backup.sh`)

## Enable the Systemd Timer

### 1. Copy unit files to systemd

```bash
sudo cp /opt/social-beam/deploy/systemd/socialbeam-backup.service /etc/systemd/system/
sudo cp /opt/social-beam/deploy/systemd/socialbeam-backup.timer /etc/systemd/system/
```

### 2. Reload systemd and enable the timer

```bash
sudo systemctl daemon-reload
sudo systemctl enable socialbeam-backup.timer
sudo systemctl start socialbeam-backup.timer
```

### 3. Verify the timer is active

```bash
systemctl list-timers socialbeam-backup.timer
```

Expected output shows the next run time under `NEXT` and `socialbeam-backup.timer` under `UNIT`.

## Manual Trigger

Run a backup immediately without waiting for the timer:

```bash
sudo systemctl start socialbeam-backup.service
```

## Check Backup Logs

```bash
sudo journalctl -u socialbeam-backup.service -n 50
```

## Timer Configuration

The timer is configured with:

- **Schedule**: `OnCalendar=daily` — runs once per day
- **Persistent**: `true` — catches up if the system was off at scheduled time
- **Randomized delay**: Up to 1 hour — prevents thundering herd on shared infrastructure

To change the schedule, edit `/etc/systemd/system/socialbeam-backup.timer` and run:

```bash
sudo systemctl daemon-reload
sudo systemctl restart socialbeam-backup.timer
```

## Environment Variables

The service loads `/opt/social-beam/.env.production` via `EnvironmentFile`. The backup script also respects:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./backups` | Local directory for backup files |
| `RETENTION_DAYS` | `30` | Delete local backups older than N days |
| `S3_BUCKET` | _(unset)_ | S3 bucket for remote backup upload |
| `S3_PREFIX` | `backups/` | S3 key prefix |

## Related

- [Database Backup & Restore](./database-backup-restore.md)
- [Backup Procedure](./backup-procedure.md)
- [Deployment Guide](./deployment.md)
