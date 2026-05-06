# BookLib Folder Structure

```text
booklib/
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ config/
│  │  │  ├─ controllers/
│  │  │  ├─ middleware/
│  │  │  ├─ repositories/
│  │  │  ├─ routes/
│  │  │  ├─ services/
│  │  │  ├─ lib/
│  │  │  ├─ jobs/
│  │  │  └─ types/
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ (marketplace)/
│     │  │  ├─ (tenant)/
│     │  │  └─ (admin)/
│     │  ├─ components/
│     │  ├─ features/
│     │  ├─ lib/
│     │  └─ hooks/
├─ packages/
│  ├─ ui/
│  ├─ config/
│  └─ types/
├─ docs/
│  ├─ architecture.md
│  ├─ schema.sql
│  ├─ api-routes.md
│  └─ folder-structure.md
├─ .env.example
└─ package.json
```

## Backend Notes

- `controllers`: transport layer only, no business rules.
- `services`: business logic such as QR validation, billing lifecycle, seat assignment.
- `repositories`: all SQL/data access, always library-scoped for tenant resources.
- `middleware`: auth, tenant, RBAC, rate limit, subscription gating.
- `jobs`: async workers for rollups, reminders, and webhook retries.

## Frontend Notes

- `(marketplace)`: public SEO-first listing pages.
- `(tenant)`: owner + student experiences resolved from subdomain.
- `(admin)`: super-admin console.
- `features`: vertical slices like seat-layout, billing, notifications, analytics.
