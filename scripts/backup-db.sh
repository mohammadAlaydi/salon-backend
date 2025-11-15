#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR=${BACKUP_DIR:-"./backups"}

mkdir -p "$BACKUP_DIR"

FILENAME="$BACKUP_DIR/salon-db-$TIMESTAMP.sql.gz"

echo "Creating backup at $FILENAME"
docker exec salon-postgres pg_dump -U salon_user salon_db | gzip > "$FILENAME"

echo "Backup complete."


