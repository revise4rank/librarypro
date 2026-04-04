# LibraryPro Architecture

## 1. Architecture Diagram

```text
                                      +----------------------+
                                      |   Super Admin Panel  |
                                      |  admin.librarypro    |
                                      +----------+-----------+
                                                 |
+---------------------+                +---------v----------+              +----------------------+
| Public Marketplace  |                |   Next.js Web App  |              | Student PWA          |
| www.librarypro.com  +--------------->+  Owner / Student   +<------------>+ tenant subdomain     |
| Search + discovery  |                |  SSR + API client  |              | offline check-in     |
+----------+----------+                +---------+----------+              +----------+-----------+
           |                                     |                                    |
           |                           HTTPS + JWT/CSRF                               |
           |                                     |                                    |
           |                         +-----------v------------------------------------v----------+
           |                         |                API Gateway / Express App                    |
           |                         |  tenant resolution | auth | RBAC | rate limit | validation |
           |                         +----------+-------------------+------------------------------+
           |                                    |                   |
           |                                    |                   |
           |                         +----------v----+      +------v------------------+
           |                         | Auth Service  |      | Library Domain Services |
           |                         | JWT, refresh  |      | seats, students, QR,    |
           |                         | session store |      | payments, notifications  |
           |                         +----------+----+      +------------+-------------+
           |                                    |                        |
           |                                    |                        |
           |                         +----------v------------------------v------+
           |                         | Realtime / Event Service                 |
           |                         | Redis pub-sub, websocket fanout, queues  |
           |                         +----------+------------------------+------+
           |                                    |                        |
           |                                    |                        |
           |                         +----------v----+      +-----------v------------+
           |                         | Payment/Billing|      | Analytics Aggregator   |
           |                         | Razorpay APIs  |      | materialized rollups   |
           |                         | webhook ingest |      | daily/monthly metrics  |
           |                         +----------+----+      +-----------+------------+
           |                                    |                        |
           |                                    +------------+-----------+
           |                                                 |
           |                                      +----------v-----------+
           +------------------------------------->+ PostgreSQL (shared   |
                                                  | multi-tenant schema) |
                                                  +----------+-----------+
                                                             |
                                                  +----------v-----------+
                                                  | Upstash Redis        |
                                                  | cache, locks, pubsub |
                                                  +----------------------+
```

## 2. RBAC and Access Boundaries

### Roles

- `SUPER_ADMIN`
  - Global visibility across all tenants.
  - Can manage plans, libraries, platform subscriptions, support actions, and platform analytics.
  - Cannot impersonate a tenant silently; impersonation must create an audit record.
- `LIBRARY_OWNER`
  - Scoped strictly to one or more `library_id` values in `user_library_roles`.
  - Can manage library settings, seat layouts, students, manual payments, expenses, notifications, QR settings, and tenant analytics.
  - Cannot access platform billing data for other tenants or super-admin APIs.
- `STUDENT`
  - Scoped to a single `library_id`.
  - Can access seat assignment, plan validity, notifications, WiFi/notice board, and self service check-in state.
  - Cannot modify tenant configuration or read other students' data beyond what is explicitly shared.

### Enforcement Model

- Authentication gives us identity (`sub`, `role`, `libraryIds`, `sessionId`).
- Tenant middleware resolves target tenant from subdomain/header/path and injects `req.tenant`.
- RBAC middleware checks role.
- Repository layer always queries by `library_id` unless route is explicitly platform-wide.
- Audit logs capture admin actions, billing actions, seat reassignments, and QR scans.

## 3. Multi-Tenancy Strategy

### Option A: Shared Database, Shared Schema, `library_id` on tenant tables

Pros:
- Faster to launch and cheaper to operate.
- Easy cross-tenant analytics for platform MRR, churn, active libraries.
- Simpler migrations and reporting.
- Fits early/mid-stage SaaS scale well if tenant scoping is rigorously enforced.

Cons:
- Stronger need for guardrails to prevent tenant data leaks.
- Noisy-neighbor risk without careful indexing and workload separation.
- Tenant export/deletion workflows require more care.

### Option B: Schema per Tenant

Pros:
- Stronger logical isolation.
- Easier per-tenant backup/restore.
- Useful when enterprise tenants demand isolation.

Cons:
- Operational complexity increases fast with hundreds/thousands of libraries.
- Harder global migrations, analytics, and pooled connection management.
- More brittle for marketplace search across libraries.

### Chosen Approach

Use **shared PostgreSQL database + shared schema + required `library_id`** for all tenant-owned rows.

Guardrails:
- Composite unique constraints include `library_id`.
- Repository methods require `library_id` parameter.
- Optional PostgreSQL RLS can be added later for high-assurance isolation.
- Redis cache keys namespaced by `library:{id}:...`.
- Background jobs always include tenant context.

### Scaling Strategy

- Start with one write-primary Postgres and read replicas.
- Split heavy analytics into rollup tables/materialized views.
- Move websocket fanout and sync jobs to separate workers.
- Introduce queue-backed async notification and billing retries.
- Partition `checkins`, `notifications`, and event tables by month once volume grows.

## 4. Service Breakdown

### API Server

- Node.js + Express + TypeScript.
- Handles tenant resolution, auth, RBAC, validation, CRUD, analytics endpoints, and API composition.
- Stays stateless; sessions/token revocation live in Redis/Postgres.

### Auth Service

- Email/mobile login with password or OTP extension later.
- Issues access and refresh JWTs.
- Tracks session version, token revocation, and password reset flows.
- Supports subdomain-aware cookie strategy for tenant portals.

### Payment Service

- Student manual payments recorded by owner.
- SaaS billing integrated with Razorpay for platform subscriptions.
- Webhook processor verifies signatures, stores idempotency keys, and updates subscription state.
- Retry queue for failed webhook-side effects and reconciliation job.

### Realtime Service

- Websocket gateway or Socket.IO namespace per tenant.
- Redis pub/sub propagates seat state changes, notifications, and sync acknowledgements.
- Seat updates publish `seat.updated`, `student.assignment.updated`, `checkin.created`.

## 5. Subdomain Multi-Tenancy

### DNS

- `*.librarypro.com` CNAME to Vercel.
- `admin.librarypro.com` for super admin.
- `www.librarypro.com` for the public marketplace.
- `api.librarypro.com` for the backend.

### Next.js Tenant Detection

- Parse the `Host` header in edge middleware.
- Rewrite `tenant.librarypro.com/*` to an internal tenant app path while injecting `x-tenant-slug`.
- Keep `admin` and `www` on separate route groups.

### Backend Resolution

- Resolve tenant from trusted `x-tenant-slug` or `Host`.
- Lookup `libraries.slug`, cache in Redis, and reject unknown/suspended tenants.
- Never trust client-supplied `library_id` directly.

### Security Implications

- Allowlist the base domain to avoid host-header poisoning.
- Keep super-admin auth cookies isolated from tenant cookies.
- Resolve tenant at runtime on every request even if the JWT carries library claims.

## 6. Marketplace and Seat Layout

- Public discovery uses `libraries.city`, `area`, and optional geo-radius filters.
- Marketplace listing cards expose:
  - available seats
  - starting price
  - active offers
  - future ratings support
- RedBus-style layout:
  - `library_floors` + `seats`
  - green `AVAILABLE`
  - red `OCCUPIED`
  - yellow `RESERVED`
  - gray `DISABLED`
- Realtime seat updates flow through Redis pub/sub into websocket fanout.

## 7. QR Entry System

- One active QR secret per library with rotatable `qr_key_id`.
- Printed QR encodes a signed payload containing:
  - `libraryId`
  - `qrKeyId`
  - `nonce`
  - `signature`
- Scan validation checks:
  - tenant QR authenticity
  - active student assignment
  - plan validity window
  - payment eligibility
  - duplicate open check-ins

## 8. Offline-First PWA

- QR scans are stored in IndexedDB with a client-generated `event_id`.
- On reconnect, the sync worker posts unsynced events to `/v1/checkins/scan`.
- Conflict resolution:
  - dedupe by `(library_id, client_event_id)`
  - accept late syncs when device time is within tolerated drift
  - flag suspicious drift for review

## 9. Digital Register

- `checkins` acts as the source of truth for the register.
- Filters:
  - date range
  - student
  - seat
- Search stays fast via `(library_id, checked_in_at desc)` and `(library_id, student_user_id, checked_in_at desc)` indexes.

## 10. Billing Model

### Student Payments

- Recorded manually by owners in `payments`.
- States: `PENDING`, `PAID`, `DUE`, `FAILED`, `REFUNDED`.

### SaaS Billing

- Platform plans:
  - `STARTER_499`
  - `GROWTH_999`
- `subscriptions` stores lifecycle state.
- `platform_payments` stores Razorpay transaction history.
- Webhook verification uses HMAC SHA256 and an idempotent `webhook_events` table.
- Failed renewals transition to `PAST_DUE`, then `EXPIRED` after grace.

## 11. Analytics Engine

- Use transactional tables for writes and `analytics_daily_library_metrics` for dashboards.
- Owner metrics:
  - daily revenue
  - monthly revenue
  - expenses
  - profit
- Heavy aggregates should be generated asynchronously by workers to keep dashboard APIs fast.

## 12. Notifications, WiFi, and Notice Board

- Notifications stored in `notifications`.
- Outbox/event worker pushes to websocket channels scoped by tenant.
- WiFi credentials and notice messages live in `library_settings`.

## 13. Performance and Scaling

- Redis caches:
  - tenant slug resolution
  - marketplace results
  - analytics summaries
  - QR metadata
- Scale strategy:
  - stateless API nodes
  - separate realtime deployment with Redis adapter
  - worker processes for webhook retries, notifications, rollups
  - read replicas for analytics-heavy traffic

## 14. Security

- JWT access tokens with short TTL and rotated refresh tokens.
- Role- and tenant-aware middleware.
- Rate limiting per IP and per tenant.
- `zod` validation for all request bodies.
- Signed webhook verification for Razorpay.
- Audit trails for admin and billing actions.

## 15. Deployment

### Frontend

- Deploy `apps/web` to Vercel.
- Configure wildcard domain for `*.librarypro.com`.

### Backend

- Deploy `apps/api` to Render or AWS ECS/Fargate.
- Separate services:
  - API
  - realtime
  - worker

### Data Layer

- Supabase for PostgreSQL.
- Upstash Redis for cache, locks, and pub/sub.

### CI/CD

- GitHub Actions pipeline:
  - install
  - lint
  - typecheck
  - test
  - build
  - migration validation
  - deploy
