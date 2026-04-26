# LibraryPro

LibraryPro is a multi-tenant SaaS for digital libraries with:

- central marketplace on the main domain
- owner-managed public library websites on subdomains
- owner, student, and superadmin workspaces
- QR-based entry and attendance register
- manual student billing plus platform subscription billing
- realtime in-app notifications
- PWA foundation with offline QR and payment action queue

## Monorepo

- `apps/api` - Express + TypeScript API
- `apps/web` - Next.js App Router frontend
- `docs` - architecture, API, and schema docs

## Local setup

1. Install dependencies
   - `npm install`
2. Configure env
   - copy values from `.env.example`
   - optional production sample: `.env.production.example`
3. Run database migration
   - `npm run migrate -w @librarypro/api`
   - migration runner now records applied versions in `schema_migrations`
   - legacy baseline comes from `docs/schema.sql`
   - incremental SQL migrations can be added under `apps/api/migrations`
4. Seed demo data
   - `npm run seed -w @librarypro/api`
5. Start API
   - `npm run dev -w @librarypro/api`
6. Start web app
   - `npm run dev -w @librarypro/web`

## Local URLs

- Web: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Marketplace: [http://127.0.0.1:3000/marketplace](http://127.0.0.1:3000/marketplace)
- API health: [http://127.0.0.1:4000/health](http://127.0.0.1:4000/health)
- API readiness: [http://127.0.0.1:4000/ready](http://127.0.0.1:4000/ready)

## Demo logins

- Owner: `owner@librarypro.demo / owner123`
- Student: `student@librarypro.demo / student123`
- Admin: `admin@librarypro.demo / admin123`

## Quality gates

- API tests: `npm run test -w @librarypro/api`
- Full build: `npm run build`
- CI shortcut: `npm run ci`
- Local API/Web smoke: `npm run e2e:smoke`
- Performance smoke: `npm run perf:smoke`

## Production notes

- `RAZORPAY_KEY_ID` and `RAZORPAY_WEBHOOK_SECRET` are required for live subscription billing
- `REDIS_URL` enables horizontal Socket.IO fanout
- `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, and `DB_POOL_CONNECTION_TIMEOUT_MS` tune database concurrency
- `API_COMPRESSION_ENABLED=true` keeps API payload cost lower for public traffic
- `UPLOADS_PROVIDER=supabase` plus Supabase credentials enables cloud asset storage
- `SENTRY_DSN` enables external error sink configuration
- `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_ENDPOINT` reserve telemetry envs for downstream exporters
- `/ready` checks database and Redis readiness for deployment probes

## Current production hardening state

- real JWT login with DB-backed session validation
- tenant-aware marketplace and public library pages
- real owner CRUD flows for seats, students, payments, notifications, settings, expenses
- owner subscription renewal intent + Razorpay checkout handoff
- webhook persistence for platform payments and subscriptions
- QR check-in and checkout backed by database
- offline queue for QR actions and student payment actions
- service worker, manifest, and offline fallback page
- Render deployment descriptor via `render.yaml`
