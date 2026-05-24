# LibraryPro Infra Sizing for 10k Libraries / 1M Students

## Assumptions

- `10,000` active libraries
- `1,000,000` student accounts
- `100,000-250,000` DAU during peak seasons
- `5,000-20,000` concurrent active web sessions
- public marketplace search is the hottest anonymous read path
- QR attendance and student dashboard are the hottest authenticated paths

## Target deployment shape

### Edge
- CDN in front of Next.js assets and public pages
- WAF / bot filtering for public marketplace
- TLS termination at load balancer or edge

### Web tier
- `3-6` Next.js instances minimum
- autoscale on:
  - CPU `> 60%`
  - memory `> 70%`
  - request queue growth

### API tier
- `6-12` API instances minimum
- start around:
  - `2 vCPU`
  - `4-8 GB RAM`
  - per instance
- autoscale on:
  - CPU
  - request latency
  - open connection pressure

### PostgreSQL
- `1` primary
- `2` read replicas
- starting shape:
  - primary: `8-16 vCPU`, `32-64 GB RAM`, fast NVMe/SSD
  - replicas: `8 vCPU`, `32 GB RAM`
- use PgBouncer or equivalent pooling if app connection fanout rises

### Redis
- `1` primary + replica/sentinel or managed HA Redis
- starting shape:
  - `4-8 GB RAM`
- used for:
  - leaderboard cache
  - public profile cache
  - offers cache
  - rate limit state
  - optional lightweight job coordination

### Object storage
- S3/R2/GCS style bucket
- stores:
  - logos
  - gallery images
  - exported reports
  - public site media

### Background workers
- separate worker pool for:
  - owner email reports
  - follow-up reminders
  - search index refresh
  - report generation
  - notification relays

## Database strategy

### Primary OLTP tables
- users
- libraries
- student_assignments
- payments
- checkins
- student_focus_sessions
- revision_schedules

### Search optimization
- marketplace should read from `marketplace_search_index`
- refresh strategy:
  - immediate refresh after profile publish/update on low volume
  - scheduled refresh every `1-5 min` at scale
- for true geo scale:
  - move latitude/longitude lookup to PostGIS geography index

### Partitioning candidates
- checkins by month
- payments by month or quarter
- focus sessions by month
- revision logs by month

## App sizing guidance by workload

### Anonymous marketplace-heavy period
- prioritize:
  - CDN
  - Redis
  - read replicas
  - search materialized view freshness

### Authenticated study-heavy period
- prioritize:
  - API autoscaling
  - DB write throughput
  - session + notification stability

### Reporting-heavy period
- move exports and PDF/XLSX work off request path where possible
- use workers and object storage for generated files

## Expected bottlenecks

1. marketplace geo search
2. month-end owner reports/exports
3. morning attendance bursts
4. large tenant owner student/payment lists
5. notification fanout

## Recommended hard limits

- public search pagination max: `50`
- owner/student pagination default: `50`, max `200`
- report export generation offload if row count exceeds `50k`
- background jobs must be idempotent

## Observability must-haves

- request latency dashboards by route family
- DB slow query logs
- replica lag alerts
- Redis memory + eviction alerts
- worker queue lag alerts
- scheduled job success/failure alerts

## Release gates for 10k/1M rollout

- distributed load test passes
- materialized search refresh stable under peak writes
- no DB connection exhaustion at 2x steady-state
- no critical P1/P2 errors in Sentry during soak
- report/export workers stay within SLA

## Near-term recommended infra stack

- Next.js app on autoscaled containers
- Express API on autoscaled containers
- managed PostgreSQL with replicas
- managed Redis
- object storage + CDN
- cron/scheduler for reminders and reports
- centralized logs + metrics + traces

## Practical rollout plan

### Stage A
- `1,000` libraries
- `100,000` students
- validate real-world traffic mix

### Stage B
- `5,000` libraries
- `500,000` students
- enable read replicas and heavier cache policy

### Stage C
- `10,000` libraries
- `1,000,000` students
- only after distributed load, soak, and failover drills are green
