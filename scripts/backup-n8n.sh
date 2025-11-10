#!/bin/bash

################################################################################
# n8n Backup Script
#
# This script creates backups of:
# - PostgreSQL database
# - n8n data volume (workflows, credentials, settings)
# - Configuration files
#
# Backups are stored in ./backups/n8n/ with 30-day retention
#
# Usage:
#   ./scripts/backup-n8n.sh
#
# Cron Example (daily at 2 AM):
#   0 2 * * * /path/to/onaria-platform/scripts/backup-n8n.sh >> /var/log/n8n-backup.log 2>&1
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups/n8n"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.n8n.yml"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose is not installed or not in PATH"
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "docker-compose.n8n.yml not found at $COMPOSE_FILE"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log_info "Starting n8n backup - $TIMESTAMP"
log_info "Backup directory: $BACKUP_DIR"

################################################################################
# Backup PostgreSQL Database
################################################################################

log_info "Backing up PostgreSQL database..."

POSTGRES_CONTAINER="n8n-postgres"
DB_BACKUP_FILE="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    log_error "PostgreSQL container is not running"
    exit 1
fi

# Get database credentials from .env.n8n
if [ -f "${PROJECT_DIR}/.env.n8n" ]; then
    source "${PROJECT_DIR}/.env.n8n"
else
    log_error ".env.n8n file not found"
    exit 1
fi

# Backup database
if docker exec "$POSTGRES_CONTAINER" pg_dump -U "${POSTGRES_USER:-n8n}" "${POSTGRES_DB:-n8n}" > "$DB_BACKUP_FILE"; then
    log_info "Database backup created: $DB_BACKUP_FILE"

    # Compress database backup
    gzip "$DB_BACKUP_FILE"
    log_info "Database backup compressed: ${DB_BACKUP_FILE}.gz"
else
    log_error "Failed to backup PostgreSQL database"
    exit 1
fi

################################################################################
# Backup n8n Data Volume
################################################################################

log_info "Backing up n8n data volume..."

VOLUME_BACKUP_FILE="${BACKUP_DIR}/n8n_data_${TIMESTAMP}.tar.gz"

# Backup n8n data volume
if docker run --rm \
    -v "$(basename $PROJECT_DIR)_n8n_data:/data" \
    -v "${BACKUP_DIR}:/backup" \
    alpine:latest \
    tar czf "/backup/n8n_data_${TIMESTAMP}.tar.gz" -C /data .; then
    log_info "n8n data volume backup created: $VOLUME_BACKUP_FILE"
else
    log_error "Failed to backup n8n data volume"
    exit 1
fi

################################################################################
# Backup Redis Data (Optional)
################################################################################

log_info "Backing up Redis data..."

REDIS_BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.tar.gz"

if docker run --rm \
    -v "$(basename $PROJECT_DIR)_redis_data:/data" \
    -v "${BACKUP_DIR}:/backup" \
    alpine:latest \
    tar czf "/backup/redis_${TIMESTAMP}.tar.gz" -C /data .; then
    log_info "Redis data backup created: $REDIS_BACKUP_FILE"
else
    log_warn "Failed to backup Redis data (non-critical)"
fi

################################################################################
# Backup Configuration Files
################################################################################

log_info "Backing up configuration files..."

CONFIG_BACKUP_FILE="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"

# Backup .env.n8n and docker-compose.n8n.yml
tar czf "$CONFIG_BACKUP_FILE" \
    -C "$PROJECT_DIR" \
    .env.n8n \
    docker-compose.n8n.yml \
    nginx/nginx.conf 2>/dev/null || true

if [ -f "$CONFIG_BACKUP_FILE" ]; then
    log_info "Configuration files backup created: $CONFIG_BACKUP_FILE"
else
    log_warn "Failed to backup configuration files"
fi

################################################################################
# Create Backup Manifest
################################################################################

log_info "Creating backup manifest..."

MANIFEST_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.manifest"

cat > "$MANIFEST_FILE" << EOF
n8n Backup Manifest
===================
Timestamp: $TIMESTAMP
Date: $(date)

Files:
- postgres_${TIMESTAMP}.sql.gz
- n8n_data_${TIMESTAMP}.tar.gz
- redis_${TIMESTAMP}.tar.gz
- config_${TIMESTAMP}.tar.gz

Database: ${POSTGRES_DB:-n8n}
User: ${POSTGRES_USER:-n8n}

Restore Instructions:
---------------------
1. Stop n8n: docker-compose -f docker-compose.n8n.yml stop n8n
2. Restore database:
   gunzip -c postgres_${TIMESTAMP}.sql.gz | \\
   docker exec -i n8n-postgres psql -U ${POSTGRES_USER:-n8n} ${POSTGRES_DB:-n8n}
3. Restore data volume:
   docker run --rm \\
     -v onaria-platform_n8n_data:/data \\
     -v \$(pwd):/backup \\
     alpine tar xzf /backup/n8n_data_${TIMESTAMP}.tar.gz -C /data
4. Start n8n: docker-compose -f docker-compose.n8n.yml start n8n

EOF

log_info "Backup manifest created: $MANIFEST_FILE"

################################################################################
# Cleanup Old Backups
################################################################################

log_info "Cleaning up backups older than $RETENTION_DAYS days..."

# Find and delete old backup files
OLD_BACKUPS=$(find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
        rm -f "$file"
        log_info "Deleted old backup: $(basename "$file")"
    done
else
    log_info "No old backups to delete"
fi

################################################################################
# Calculate Backup Size
################################################################################

BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
CURRENT_BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz" \
                            "${BACKUP_DIR}/n8n_data_${TIMESTAMP}.tar.gz" \
                            2>/dev/null | awk '{sum+=$1} END {print sum"K"}' || echo "N/A")

################################################################################
# Backup Summary
################################################################################

log_info "========================================"
log_info "Backup completed successfully!"
log_info "========================================"
log_info "Timestamp: $TIMESTAMP"
log_info "Current backup size: $CURRENT_BACKUP_SIZE"
log_info "Total backup directory size: $BACKUP_SIZE"
log_info "Backup location: $BACKUP_DIR"
log_info "Retention period: $RETENTION_DAYS days"
log_info "========================================"

# Optional: Send notification (webhook, email, etc.)
if [ -n "${BACKUP_WEBHOOK_URL:-}" ]; then
    log_info "Sending backup notification..."
    curl -X POST "$BACKUP_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"status\":\"success\",\"timestamp\":\"$TIMESTAMP\",\"size\":\"$CURRENT_BACKUP_SIZE\"}" \
        >/dev/null 2>&1 || log_warn "Failed to send notification"
fi

exit 0
