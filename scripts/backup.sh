#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/livestream_${TIMESTAMP}.sql.gz"

docker compose exec -T mysql mysqldump \
  -u root \
  -p"${MYSQL_ROOT_PASSWORD:-root_pass}" \
  "${MYSQL_DATABASE:-livestream}" | gzip > "$BACKUP_FILE"

echo "Backup written to $BACKUP_FILE"
