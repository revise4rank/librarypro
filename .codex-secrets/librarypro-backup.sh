#!/usr/bin/env bash
set -euo pipefail

APP_ENV="/opt/librarypro/app/.env"
BACKUP_DIR="/var/backups/librarypro"
UPLOADS_DIR="/var/lib/librarypro/uploads"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

set -a
# shellcheck disable=SC1090
. "${APP_ENV}"
set +a

mkdir -p "${BACKUP_DIR}"

pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_DIR}/librarypro-db-${STAMP}.sql.gz"

if [ -d "${UPLOADS_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/librarypro-uploads-${STAMP}.tar.gz" -C "${UPLOADS_DIR}" .
fi

find "${BACKUP_DIR}" -type f -mtime +14 -name "librarypro-*.gz" -delete
