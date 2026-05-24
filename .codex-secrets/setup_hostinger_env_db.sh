#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/librarypro/app"
UPLOADS_DIR="/var/lib/librarypro/uploads"
BACKUP_DIR="/var/backups/librarypro"

DB_PASS="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 48)"
TENANT_SECRET="$(openssl rand -hex 48)"
RAZORPAY_WEBHOOK_SECRET="$(openssl rand -hex 32)"

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='librarypro'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE USER librarypro"
fi

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "ALTER USER librarypro WITH PASSWORD '${DB_PASS}'"

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='librarypro'" | grep -q 1; then
  runuser -u postgres -- createdb -O librarypro librarypro
fi

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d librarypro -c "ALTER DATABASE librarypro OWNER TO librarypro"

mkdir -p "${UPLOADS_DIR}" "${BACKUP_DIR}"

cat > "${APP_DIR}/.env" <<ENV
NODE_ENV=production
BASE_DOMAIN=booklib.in
WEB_APP_URL=https://booklib.in
PORT=4000
API_PUBLIC_URL=https://api.booklib.in
API_TRUSTED_PROXY_COUNT=1
API_COMPRESSION_ENABLED=true
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_TTL=15m
INTERNAL_TENANT_HEADER_SECRET=${TENANT_SECRET}
DATABASE_URL=postgresql://librarypro:${DB_PASS}@127.0.0.1:5432/librarypro
DB_POOL_MAX=30
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
REDIS_URL=
UPLOADS_PROVIDER=local
UPLOADS_DIR=${UPLOADS_DIR}
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=librarypro-assets
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=${RAZORPAY_WEBHOOK_SECRET}
SENTRY_DSN=
OTEL_SERVICE_NAME=librarypro-api
OTEL_EXPORTER_OTLP_ENDPOINT=
NOTIFICATION_WEBHOOK_URL=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
REPORT_FROM_EMAIL=reports@booklib.in
NEXT_PUBLIC_API_URL=https://api.booklib.in
NEXT_PUBLIC_BASE_DOMAIN=booklib.in
NEXT_PUBLIC_WS_URL=wss://api.booklib.in
API_PROXY_TARGET=http://127.0.0.1:4000
ENV

cp "${APP_DIR}/.env" "${APP_DIR}/apps/web/.env.production"
chown -R librarypro:librarypro "${APP_DIR}" /var/lib/librarypro /var/backups/librarypro
chmod 600 "${APP_DIR}/.env" "${APP_DIR}/apps/web/.env.production"

systemctl enable --now postgresql
