# VPS Deployment Guide

Complete guide for deploying Social Beam to a production VPS.

## Prerequisites

- Ubuntu 22.04+ VPS (minimum 4 CPU, 8GB RAM, 50GB SSD)
- Root or sudo access
- Domain name with DNS access

## 1. Server Provisioning

### 1.1 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw fail2ban git curl
```

### 1.2 SSH Hardening

```bash
# Disable password authentication
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Set up SSH key authentication
mkdir -p ~/.ssh && chmod 700 ~/.ssh
# Add your public key to ~/.ssh/authorized_keys
```

### 1.3 Configure Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Let's Encrypt)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 2. DNS Configuration

Create DNS records at your registrar:

| Type | Name | Value |
|------|------|-------|
| A | yourdomain.com | <VPS_IP> |
| A | www.yourdomain.com | <VPS_IP> |

Propagation can take 24-48 hours. Verify with:

```bash
dig +short yourdomain.com
```

## 3. Docker & Docker Compose Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

## 4. Application Setup

### 4.1 Clone Repository

```bash
cd /opt
sudo git clone https://github.com/your-org/social-beam.git
sudo chown -R $USER:$USER /opt/social-beam
cd /opt/social-beam
```

### 4.2 Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env.production

# Generate required secrets
openssl rand -hex 32  # AUTH_SECRET
openssl rand -hex 32  # TOKEN_ENCRYPTION_KEY
openssl rand -hex 32  # MCP_JWT_SECRET
openssl rand -hex 32  # CRON_SECRET
```

Edit `.env.production` with all required values. See `.env.example` for the full list of required variables.

### 4.3 Update Domain in Nginx Config

Edit `nginx/nginx.conf` and replace all instances of `your-domain.com` with your actual domain.

### 4.4 Update Docker Compose Domain References

Edit `docker-compose.prod.yml` and update the certbot command on line 5 with your actual domain.

## 5. Database Migration

### 5.1 Initial Schema Setup

```bash
cd /opt/social-beam

# Install dependencies
pnpm install --frozen-lockfile

# Run migrations
pnpm db:migrate
```

### 5.2 Creating a New Migration

When the Prisma schema changes, create a new migration:

```bash
# Generate a migration from schema changes
pnpm dlx prisma migrate dev --name describe_the_change

# In production, deploy with:
pnpm db:migrate   # runs prisma migrate deploy (non-interactive)
```

### 5.3 Migration Baseline (First-Time Setup Only)

If the database already has the schema applied manually but no migration history exists, establish a baseline:

```bash
# Generate a baseline migration script from the current schema
pnpm dlx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql

# Mark it as already applied so Prisma doesn't try to re-run it
pnpm dlx prisma migrate resolve --applied 0_init
```

**WARNING**: Only run this on databases that already match the schema. Running on an empty database will skip schema creation.

### 5.4 Rolling Back a Migration

```bash
# Undo the last migration (development only)
pnpm dlx prisma migrate reset

# In production, restore from backup instead of rolling back migrations
```

### 5.5 Optional: Seed Database (Development Only)

```bash
pnpm db:seed
```

**Never run `db:seed` in production** — it creates test data.

## 6. SSL Certificate Generation

```bash
cd /opt/social-beam

# Start services without SSL first
sudo docker compose -f docker-compose.prod.yml up -d postgres redis app

# Wait for app to be healthy
docker compose -f docker-compose.prod.yml ps

# Generate SSL certificate
sudo docker compose -f docker-compose.prod.yml exec certbot \
  certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com

# Reload nginx to pick up certificates
sudo docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### 6.1 Automatic Certificate Renewal

The certbot service is configured to auto-renew certificates every 12 hours. Verify with:

```bash
sudo docker compose -f docker-compose.prod.yml logs certbot | grep "renew"
```

## 7. Start Full Production Stack

```bash
sudo docker compose -f docker-compose.prod.yml up -d

# Verify all services are healthy
sudo docker compose -f docker-compose.prod.yml ps

# Check logs for errors
sudo docker compose -f docker-compose.prod.yml logs app
```

## 8. Backup Automation

### 8.1 Install Systemd Timer

```bash
sudo cp /opt/social-beam/deploy/systemd/socialbeam-backup.timer /etc/systemd/system/
sudo cp /opt/social-beam/deploy/systemd/socialbeam-backup.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable socialbeam-backup.timer
sudo systemctl start socialbeam-backup.timer

# Verify timer is active
systemctl list-timers socialbeam-backup.timer
```

### 8.2 Manual Backup Test

```bash
sudo /opt/social-beam/scripts/backup.sh
```

### 8.3 S3 Backup (Optional)

Add these to `.env.production` for S3 upload:

```bash
S3_BUCKET=your-backup-bucket
S3_PREFIX=backups/socialbeam/
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_DEFAULT_REGION=your-region
```

## 9. Smoke Test Checklist

Verify all critical paths:

- [ ] `curl https://yourdomain.com/api/health/live` returns 200
- [ ] `curl https://yourdomain.com/api/health/ready` returns 200
- [ ] Homepage loads (<3s) at `https://yourdomain.com`
- [ ] SSL certificate valid (check browser lock icon)
- [ ] HSTS header present: `curl -I https://yourdomain.com | grep Strict-Transport`
- [ ] Login flow works end-to-end
- [ ] Dashboard widgets render after login
- [ ] Rate limiting active: send 10 rapid requests to `/api/auth/login`

## 10. Deployment Verification

### 10.1 Container Health

```bash
docker compose -f docker-compose.prod.yml ps
```

All services should show `healthy` status.

### 10.2 Application Logs

```bash
# Check for startup errors
docker compose -f docker-compose.prod.yml logs app --tail=100

# Monitor real-time logs
docker compose -f docker-compose.prod.yml logs app -f
```

### 10.3 Database Connection

```bash
docker compose -f docker-compose.prod.yml exec app \
  node -e "require('./server.js')" || echo "App failed to start"
```

## 11. Rollback Procedure

### 11.1 Image-Based Rollback

Docker images are tagged during builds. To rollback:

```bash
# List available images
docker images socialbeam-app

# Stop current stack
docker compose -f docker-compose.prod.yml down

# Restart with previous image tag
docker compose -f docker-compose.prod.yml up -d

# Run any pending migrations
pnpm db:migrate
```

### 11.2 Database Rollback

If a schema migration caused issues:

```bash
# Restore from latest backup
cd /opt/social-beam/backups
ls -lt socialbeam_*.sql.gz  # Find latest backup

# Restore to database
gunzip -c socialbeam_<timestamp>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U socialbeam -d socialbeam
```

### 5.6 Encrypt Existing OAuth Tokens (One-Time Migration)

If the database contains plaintext OAuth tokens (pre-encryption deployment), run this script once:

```bash
# Dry run to see what would be encrypted
pnpm dlx tsx scripts/encrypt-existing-tokens.ts --dry-run

# Perform the actual encryption
pnpm dlx tsx scripts/encrypt-existing-tokens.ts
```

The script detects already-encrypted tokens (via decryption attempt) and skips them, making it safe to run multiple times.

## 12. Monitoring & Maintenance

### 12.1 Uptime Monitoring

Configure external uptime monitoring to detect outages before users do.

#### Health Check Endpoints

| Endpoint | Frequency | Purpose |
|----------|-----------|---------|
| `/api/health/live` | Every 30s | Basic liveness check — returns 200 if process is running |
| `/api/health/ready` | Every 30s | Readiness check — returns 200 only if DB and Redis are connected |
| `/` (homepage) | Every 5min | Full page load test |

#### Recommended Services

| Service | Tier | Notes |
|---------|------|-------|
| **UptimeRobot** | Free (50 monitors) | Simple HTTP checks, email/SMS alerts |
| **Better Stack** | Free (10 monitors) | Status pages, incident management |
| **Healthchecks.io** | Free (20 checks) | Cron job monitoring — ping when jobs complete |
| **Pingdom** | Paid ($10/mo) | Full-page transaction monitoring |
| **Self-hosted: Uptime Kuma** | Free | Docker-deployable, beautiful UI, supports multiple protocols |

#### Configuration Example (Uptime Kuma)

```bash
# Deploy Uptime Kuma alongside Social Beam
docker run -d \
  --name uptime-kuma \
  -p 3001:3001 \
  -v uptime-kuma-data:/app/data \
  louislam/uptime-kuma:1

# Configure monitors:
# 1. Health check: HTTP GET https://yourdomain.com/api/health/live (every 30s)
# 2. Readiness: HTTP GET https://yourdomain.com/api/health/ready (every 30s)
# 3. Homepage: HTTP GET https://yourdomain.com (every 5min)
# 4. Login flow: HTTP POST https://yourdomain.com/api/auth/login (weekly synthetic test)
```

#### Alert Channels

Configure notifications through:
- Email (primary)
- Slack/Discord webhook (team channel)
- SMS (critical — for on-call)

### 12.2 Log Aggregation

Production Docker Compose includes **Loki + Promtail** for centralized log collection.

- **Loki** (`:3100`) — Log aggregation store with 7-day retention
- **Promtail** — Ships Docker container logs to Loki with structured parsing

#### Viewing Logs with Grafana

For a full query interface, add Grafana to your stack:

```bash
docker run -d \
  --name grafana \
  -p 3002:3000 \
  -v grafana-data:/var/lib/grafana \
  grafana/grafana:latest

# Add Loki as a data source at http://loki:3100
```

#### Log Query Examples

```logql
# All errors from the app container in the last hour
{container="socialbeam-app"} | json | level="error"

# Request latency > 1s
{container="socialbeam-app"} | json | duration > 1000

# OAuth-related logs
{container="socialbeam-app"} |= "oauth"
```

#### Fallback: Docker Log Rotation

If running without Loki, Docker log rotation is configured in `daemon.json` (see section 12.5 below).

### 12.3 Log Rotation

```bash
# Configure Docker log rotation
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
```

### 12.4 Disk Space Monitoring

```bash
# Check disk usage
df -h

# Docker system prune (removes unused images/containers)
docker system prune -af --volumes
```

### 12.5 Service Restart on Failure

Docker restart policies (`unless-stopped`) handle automatic recovery. Verify with:

```bash
docker inspect socialbeam-app | grep -A5 RestartPolicy
```

## Quick Reference

| Task | Command |
|------|---------|
| Start all services | `docker compose -f docker-compose.prod.yml up -d` |
| Stop all services | `docker compose -f docker-compose.prod.yml down` |
| View logs | `docker compose -f docker-compose.prod.yml logs -f` |
| Run migration | `pnpm db:migrate` |
| Manual backup | `sudo /opt/social-beam/scripts/backup.sh` |
| Restart single service | `docker compose -f docker-compose.prod.yml restart app` |
| Check health | `docker compose -f docker-compose.prod.yml ps` |
| SSL renewal status | `docker compose -f docker-compose.prod.yml logs certbot` |
