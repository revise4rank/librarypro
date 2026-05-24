# LibraryPro Production Checklist

## Security

- Set strong `JWT_SECRET`
- Set real `INTERNAL_TENANT_HEADER_SECRET`
- Configure `RAZORPAY_KEY_ID` and `RAZORPAY_WEBHOOK_SECRET`
- Configure `SENTRY_DSN`
- Configure `OTEL_EXPORTER_OTLP_ENDPOINT`
- Configure `NOTIFICATION_WEBHOOK_URL` if external delivery relay is required
- Use HTTPS in production so secure cookies are active
- Review rate limits for login, billing, and upload paths

## Infrastructure

- Provision PostgreSQL and verify `DATABASE_URL`
- Tune `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, and `DB_POOL_CONNECTION_TIMEOUT_MS` for production traffic
- Run `npm run migrate -w @librarypro/api`
- Run `npm run seed -w @librarypro/api` only in demo/staging, not production
- Configure `REDIS_URL` for Socket.IO fanout and readiness checks
- Configure `UPLOADS_PROVIDER=supabase` with Supabase credentials if cloud assets are required
- Keep `API_COMPRESSION_ENABLED=true` for public-heavy traffic

## Frontend

- Set `NEXT_PUBLIC_API_URL`
- Set `NEXT_PUBLIC_BASE_DOMAIN`
- Set `NEXT_PUBLIC_WS_URL` if websocket URL differs from API base
- Verify subdomain routing on real DNS and reverse proxy

## Monitoring

- Confirm Sentry events arrive in project
- Confirm OTLP traces reach the collector
- Verify `/health` and `/ready` in deployment probes
- Verify structured logs are captured centrally
- Add GitHub Actions secrets for daily follow-up reminders:
- `DATABASE_URL`
- `REDIS_URL`
- `NOTIFICATION_WEBHOOK_URL`
- Enable [followup-reminders.yml](C:\Users\vikki\Downloads\library\.github\workflows\followup-reminders.yml) in the target repository
- Add GitHub Actions secrets for owner reports:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `REPORT_FROM_EMAIL`
- Enable [owner-reports.yml](C:\Users\vikki\Downloads\library\.github\workflows\owner-reports.yml) for scheduled owner reports

## Billing

- Verify owner renew flow opens Razorpay Checkout
- Verify webhook endpoint receives production events
- Verify subscription moves through `PENDING`, `ACTIVE`, and expiry states
- Verify blocked owner is redirected to billing on expired subscription

## Product smoke

- Owner login
- Student login
- Superadmin login
- Marketplace search
- Public library site
- Seat creation and allotment
- Student payment mark/pay flow
- QR check-in and check-out
- Owner check-in register
- Notification send and realtime receipt
- Owner website upload and publish
- Run `npm run perf:smoke` against deployed API/web before large rollout
- For 10k libraries / 1M students, run distributed load tests from separate worker nodes, not a single laptop

## Offline/PWA smoke

- Install PWA on mobile/desktop
- Verify QR queue while offline
- Verify student payment queue while offline
- Verify owner expense queue while offline
- Verify owner notification queue while offline
- Reconnect and confirm queued writes sync successfully
