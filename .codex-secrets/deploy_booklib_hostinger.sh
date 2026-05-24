#!/usr/bin/env bash
set -euo pipefail

APP_USER="booklib"
APP_DIR="/opt/booklib/app"
UPLOADS_DIR="/var/lib/booklib/uploads"
BACKUP_DIR="/var/backups/booklib"
REPO_URL="https://github.com/revise4rank/librarypro.git"

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --shell /bin/bash "${APP_USER}"
fi

mkdir -p /opt/booklib "${UPLOADS_DIR}" "${BACKUP_DIR}"
chown -R "${APP_USER}:${APP_USER}" /opt/booklib /var/lib/booklib /var/backups/booklib

if [ -d "${APP_DIR}/.git" ]; then
  runuser -u "${APP_USER}" -- git -C "${APP_DIR}" fetch origin main
  runuser -u "${APP_USER}" -- git -C "${APP_DIR}" reset --hard origin/main
else
  rm -rf "${APP_DIR}"
  runuser -u "${APP_USER}" -- git clone --branch main --depth 1 "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"
runuser -u "${APP_USER}" -- npm ci

DB_PASS="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 48)"
TENANT_SECRET="$(openssl rand -hex 48)"
RAZORPAY_WEBHOOK_SECRET="$(openssl rand -hex 32)"

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='booklib'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE USER booklib"
fi
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "ALTER USER booklib WITH PASSWORD '${DB_PASS}'"
if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='booklib'" | grep -q 1; then
  runuser -u postgres -- createdb -O booklib booklib
fi
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d booklib -c "ALTER DATABASE booklib OWNER TO booklib"

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
DATABASE_URL=postgresql://booklib:${DB_PASS}@127.0.0.1:5432/booklib
DB_POOL_MAX=30
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
REDIS_URL=
UPLOADS_PROVIDER=local
UPLOADS_DIR=${UPLOADS_DIR}
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=booklib-assets
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=${RAZORPAY_WEBHOOK_SECRET}
SENTRY_DSN=
OTEL_SERVICE_NAME=booklib-api
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
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}" /var/lib/booklib /var/backups/booklib
chmod 600 "${APP_DIR}/.env" "${APP_DIR}/apps/web/.env.production"

runuser -u "${APP_USER}" -- bash -lc "cd '${APP_DIR}' && set -a && . ./.env && set +a && npm run migrate -w @booklib/api && npm run seed -w @booklib/api && npm run build"

cat > /etc/systemd/system/booklib-api.service <<SERVICE
[Unit]
Description=BookLib API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=booklib
Group=booklib
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -w @booklib/api
Restart=always
RestartSec=5
KillSignal=SIGTERM
SyslogIdentifier=booklib-api

[Install]
WantedBy=multi-user.target
SERVICE

cat > /etc/systemd/system/booklib-web.service <<SERVICE
[Unit]
Description=BookLib Web
After=network.target booklib-api.service
Wants=booklib-api.service

[Service]
Type=simple
User=booklib
Group=booklib
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=/usr/bin/npm run start -w @booklib/web -- -p 3000 -H 127.0.0.1
Restart=always
RestartSec=5
KillSignal=SIGTERM
SyslogIdentifier=booklib-web

[Install]
WantedBy=multi-user.target
SERVICE

cat > /usr/local/bin/booklib-backup.sh <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail

APP_ENV="/opt/booklib/app/.env"
BACKUP_DIR="/var/backups/booklib"
UPLOADS_DIR="/var/lib/booklib/uploads"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

set -a
. "${APP_ENV}"
set +a

mkdir -p "${BACKUP_DIR}"
pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_DIR}/booklib-db-${STAMP}.sql.gz"
if [ -d "${UPLOADS_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/booklib-uploads-${STAMP}.tar.gz" -C "${UPLOADS_DIR}" .
fi
find "${BACKUP_DIR}" -type f -mtime +14 -name "booklib-*.gz" -delete
BACKUP

chmod 700 /usr/local/bin/booklib-backup.sh
cat > /etc/cron.d/booklib-backup <<CRON
15 2 * * * root /usr/local/bin/booklib-backup.sh >/var/log/booklib-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/booklib-backup
rm -f /etc/cron.d/librarypro-backup /usr/local/bin/librarypro-backup.sh

systemctl stop librarypro-api librarypro-web >/dev/null 2>&1 || true
systemctl disable librarypro-api librarypro-web >/dev/null 2>&1 || true
systemctl daemon-reload
systemctl enable --now booklib-api booklib-web
sleep 5
systemctl is-active booklib-api booklib-web
curl -fsS http://127.0.0.1:4000/ready
/usr/local/bin/booklib-backup.sh
