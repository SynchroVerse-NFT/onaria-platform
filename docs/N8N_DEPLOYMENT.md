# n8n Deployment Guide

This guide provides step-by-step instructions for deploying n8n as a self-hosted workflow automation platform integrated with Onaria Platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Platform Integration](#platform-integration)
- [Backup and Restore](#backup-and-restore)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

n8n is an open-source workflow automation tool that enables you to connect different services and automate processes. This deployment includes:

- **n8n Core**: Main workflow automation service
- **PostgreSQL**: Database for workflow storage and execution history
- **Redis**: Queue management for background job processing
- **Nginx (optional)**: Reverse proxy for SSL termination
- **Certbot (optional)**: Automatic SSL certificate management

### Architecture

```
┌─────────────────┐
│   User / API    │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Nginx  │  (SSL Termination)
    └────┬────┘
         │
    ┌────▼────┐
    │   n8n   │  (Workflow Engine)
    └─┬────┬──┘
      │    │
  ┌───▼┐ ┌▼────┐
  │ PG │ │Redis│
  └────┘ └─────┘
```

## Prerequisites

Before starting, ensure you have:

1. **Server Requirements**:
   - Linux server (Ubuntu 20.04+ recommended)
   - 2GB RAM minimum (4GB recommended)
   - 20GB disk space
   - Docker and Docker Compose installed

2. **Domain Setup**:
   - Domain name pointing to your server (e.g., `n8n.yourdomain.com`)
   - DNS A record configured

3. **Port Access**:
   - Port 80 (HTTP) - for Let's Encrypt verification
   - Port 443 (HTTPS) - for secure access
   - Port 5678 - n8n direct access (optional, can be blocked)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/onaria-platform.git
cd onaria-platform
```

### 2. Configure Environment Variables

Copy the template and edit the configuration:

```bash
cp .env.n8n.template .env.n8n
nano .env.n8n
```

**Generate secure credentials:**

```bash
# Generate encryption key (32 characters minimum)
openssl rand -hex 32

# Generate secure passwords
openssl rand -base64 24
```

**Edit `.env.n8n` with your values:**

```env
# Authentication
N8N_BASIC_AUTH_USER=admin
N8N_PASSWORD=your-secure-password-here

# Encryption (REQUIRED)
N8N_ENCRYPTION_KEY=generated-encryption-key-here

# Database
POSTGRES_PASSWORD=your-postgres-password-here
REDIS_PASSWORD=your-redis-password-here

# Domain Configuration
N8N_DOMAIN=n8n.yourdomain.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.yourdomain.com

# SMTP (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Start n8n

**Without SSL (for testing):**

```bash
docker-compose -f docker-compose.n8n.yml up -d
```

**With Nginx SSL proxy:**

```bash
docker-compose -f docker-compose.n8n.yml --profile with-nginx up -d
```

### 4. Verify Installation

Check that all services are running:

```bash
docker-compose -f docker-compose.n8n.yml ps
```

Expected output:
```
NAME              STATUS    PORTS
n8n               Up        0.0.0.0:5678->5678/tcp
n8n-postgres      Up        5432/tcp
n8n-redis         Up        6379/tcp
```

### 5. Access n8n

Open your browser and navigate to:
- **Development**: `http://your-server-ip:5678`
- **Production**: `https://n8n.yourdomain.com`

Login with credentials from `.env.n8n`:
- Username: `admin` (or your custom value)
- Password: Your `N8N_PASSWORD` value

## Configuration

### Nginx Configuration

Create `nginx/nginx.conf` for SSL termination:

```nginx
events {
    worker_connections 1024;
}

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=n8n_limit:10m rate=10r/s;

    # Upstream n8n
    upstream n8n {
        server n8n:5678;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name n8n.yourdomain.com;

        # Let's Encrypt verification
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name n8n.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/letsencrypt/live/n8n.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/n8n.yourdomain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # File upload size
        client_max_body_size 50M;

        # Proxy settings
        location / {
            proxy_pass http://n8n;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Port $server_port;

            # Timeouts
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;

            # Rate limiting
            limit_req zone=n8n_limit burst=20 nodelay;
        }
    }
}
```

## SSL/TLS Setup

### Option 1: Let's Encrypt with Certbot (Recommended)

**First-time setup:**

```bash
# Create nginx directory
mkdir -p nginx/ssl

# Start nginx with profile
docker-compose -f docker-compose.n8n.yml --profile with-nginx up -d

# Request certificate
docker-compose -f docker-compose.n8n.yml exec certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@yourdomain.com \
  --agree-tos \
  --no-eff-email \
  -d n8n.yourdomain.com

# Reload nginx
docker-compose -f docker-compose.n8n.yml exec nginx nginx -s reload
```

**Certificate renewal is automatic** via the certbot container.

### Option 2: Self-Signed Certificate (Development)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=n8n.yourdomain.com"
```

### Option 3: External Reverse Proxy

If using Cloudflare, Traefik, or another reverse proxy:

1. Set `N8N_PROTOCOL=https` in `.env.n8n`
2. Configure your reverse proxy to forward to n8n:5678
3. Enable WebSocket support
4. Set appropriate headers (X-Forwarded-*)

## Platform Integration

### 1. Generate API Key

After logging into n8n:

1. Navigate to **Settings** (gear icon)
2. Go to **API** section
3. Click **Create API Key**
4. Copy the generated key
5. Add to your `.env.n8n`:

```env
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Update Cloudflare Worker Configuration

Edit `wrangler.jsonc` to add n8n environment variables:

```jsonc
{
  "vars": {
    "N8N_API_URL": "https://n8n.yourdomain.com",
    "N8N_API_KEY": "n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "N8N_WEBHOOK_BASE_URL": "https://n8n.yourdomain.com/webhook"
  }
}
```

### 3. Seed Workflow Templates

Populate the database with pre-built workflow templates:

```bash
# From the platform directory
npm run seed:workflows
```

This imports the 5 pre-built templates into your database.

### 4. Test Integration

Use the platform API to test n8n connectivity:

```bash
curl -X GET https://yourdomain.com/api/workflows/health \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

Expected response:
```json
{
  "status": "healthy",
  "n8nVersion": "1.x.x",
  "connected": true
}
```

## Backup and Restore

### Automated Backups

A backup script is provided at `scripts/backup-n8n.sh`:

```bash
# Run manual backup
./scripts/backup-n8n.sh

# Schedule automatic daily backups (cron)
crontab -e

# Add this line for daily backups at 2 AM:
0 2 * * * /path/to/onaria-platform/scripts/backup-n8n.sh
```

Backups are stored in `./backups/n8n/` with 30-day retention.

### Manual Backup

**Backup PostgreSQL database:**

```bash
docker-compose -f docker-compose.n8n.yml exec postgres \
  pg_dump -U n8n n8n > backup-$(date +%Y%m%d).sql
```

**Backup n8n data volume:**

```bash
docker run --rm -v onaria-platform_n8n_data:/data \
  -v $(pwd):/backup alpine tar czf /backup/n8n-data-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore from Backup

**Restore PostgreSQL database:**

```bash
# Stop n8n
docker-compose -f docker-compose.n8n.yml stop n8n

# Restore database
cat backup-20250110.sql | docker-compose -f docker-compose.n8n.yml exec -T postgres \
  psql -U n8n n8n

# Restart n8n
docker-compose -f docker-compose.n8n.yml start n8n
```

**Restore n8n data volume:**

```bash
docker run --rm -v onaria-platform_n8n_data:/data \
  -v $(pwd):/backup alpine tar xzf /backup/n8n-data-20250110.tar.gz -C /data
```

## Monitoring

### Health Check

n8n provides a health endpoint:

```bash
curl http://localhost:5678/healthz
```

### View Logs

**All services:**

```bash
docker-compose -f docker-compose.n8n.yml logs -f
```

**n8n only:**

```bash
docker-compose -f docker-compose.n8n.yml logs -f n8n
```

**PostgreSQL:**

```bash
docker-compose -f docker-compose.n8n.yml logs -f postgres
```

### Metrics

n8n exposes Prometheus metrics at `/metrics`:

```bash
curl http://localhost:5678/metrics
```

Configure your monitoring system (Prometheus, Grafana) to scrape this endpoint.

### Resource Usage

Check container resource consumption:

```bash
docker stats n8n n8n-postgres n8n-redis
```

## Troubleshooting

### n8n Won't Start

**Check logs:**

```bash
docker-compose -f docker-compose.n8n.yml logs n8n
```

**Common issues:**

1. **Missing encryption key**: Ensure `N8N_ENCRYPTION_KEY` is set
2. **Database connection**: Check PostgreSQL is running and credentials are correct
3. **Port conflict**: Port 5678 might be in use by another service

### Database Connection Errors

**Test PostgreSQL connection:**

```bash
docker-compose -f docker-compose.n8n.yml exec postgres \
  psql -U n8n -d n8n -c "SELECT version();"
```

**Reset database (CAUTION - deletes all data):**

```bash
docker-compose -f docker-compose.n8n.yml down -v
docker-compose -f docker-compose.n8n.yml up -d
```

### Webhooks Not Working

**Checklist:**

1. Verify `WEBHOOK_URL` matches your domain
2. Ensure n8n is accessible from the internet
3. Check webhook node configuration in workflow
4. Test webhook manually:

```bash
curl -X POST https://n8n.yourdomain.com/webhook/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### SSL Certificate Issues

**Check certificate status:**

```bash
docker-compose -f docker-compose.n8n.yml exec certbot certbot certificates
```

**Force certificate renewal:**

```bash
docker-compose -f docker-compose.n8n.yml exec certbot \
  certbot renew --force-renewal
```

### Performance Issues

**Increase resources:**

Edit `docker-compose.n8n.yml`:

```yaml
services:
  n8n:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

**Clear execution history:**

In n8n UI: Settings > Executions > Clear execution history

### Can't Access n8n UI

**Check firewall:**

```bash
# Allow port 5678
sudo ufw allow 5678/tcp

# Or port 443 for HTTPS
sudo ufw allow 443/tcp
```

**Verify n8n is listening:**

```bash
docker-compose -f docker-compose.n8n.yml exec n8n netstat -tlnp | grep 5678
```

## Security Best Practices

1. **Change default credentials** immediately after first login
2. **Use strong passwords** (20+ characters)
3. **Enable 2FA** in n8n user settings
4. **Restrict network access** using firewall rules
5. **Keep n8n updated** regularly:

```bash
docker-compose -f docker-compose.n8n.yml pull
docker-compose -f docker-compose.n8n.yml up -d
```

6. **Use HTTPS only** in production
7. **Rotate encryption keys** periodically
8. **Monitor logs** for suspicious activity
9. **Limit API access** to trusted IPs
10. **Regular backups** (automated daily)

## Upgrading n8n

To upgrade to the latest version:

```bash
# Backup first!
./scripts/backup-n8n.sh

# Pull latest image
docker-compose -f docker-compose.n8n.yml pull n8n

# Restart with new image
docker-compose -f docker-compose.n8n.yml up -d n8n

# Check logs for migration messages
docker-compose -f docker-compose.n8n.yml logs -f n8n
```

## Production Deployment Checklist

- [ ] Domain configured and DNS propagated
- [ ] SSL certificate installed and valid
- [ ] Strong passwords set for all services
- [ ] API key generated and added to platform
- [ ] Automated backups configured
- [ ] Monitoring set up (logs, metrics)
- [ ] Firewall rules configured
- [ ] Workflow templates seeded
- [ ] Test workflows executed successfully
- [ ] Platform integration tested
- [ ] Documentation reviewed by team

## Support and Resources

- **n8n Documentation**: https://docs.n8n.io
- **n8n Community**: https://community.n8n.io
- **Onaria Platform Docs**: `/docs/WORKFLOW_TEMPLATES.md`
- **Issue Tracker**: https://github.com/yourusername/onaria-platform/issues

## Next Steps

After deploying n8n:

1. Review [Workflow Templates Documentation](./WORKFLOW_TEMPLATES.md)
2. Create your first workflow from a template
3. Configure OAuth integrations (Google, GitHub, etc.)
4. Set up webhook endpoints in platform
5. Monitor execution logs and performance

---

For questions or issues, please open a GitHub issue or contact support.
