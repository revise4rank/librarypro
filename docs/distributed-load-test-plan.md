# LibraryPro Distributed Load-Test Plan

## Goal

Validate staged readiness for:
- `10,000` libraries
- `1,000,000` students
- mixed public marketplace traffic + authenticated owner/student traffic

This plan is for `staging` and later `production-like prelaunch`, not a single developer laptop.

## Traffic model

### Public traffic
- `GET /v1/public/libraries/search`
- `GET /v1/public/libraries/:slugOrSubdomain`
- `GET /v1/offers`
- `GET /marketplace`

### Student traffic
- `GET /v1/student/dashboard`
- `GET /v1/student/focus`
- `GET /v1/student/revisions`
- `GET /v1/student/feed`
- `GET /v1/student/notifications`
- `GET /v1/student/payments`
- `POST /v1/student/focus/sessions`
- `PATCH /v1/student/syllabus/topics/:topicId/progress`

### Owner traffic
- `GET /v1/owner/dashboard`
- `GET /v1/owner/students`
- `GET /v1/owner/checkins`
- `GET /v1/owner/payments`
- `GET /v1/owner/reports`
- `POST /v1/owner/notifications`

## Dataset requirements

Seed staging with:
- `10,000` libraries
- `1,000,000` students
- `100` students average per library
- `1,500,000+` payments
- `5,000,000+` checkins
- `3,000,000+` focus sessions
- `2,000,000+` revision rows
- `100,000+` public marketplace searches per day equivalent cache churn

## Execution phases

### Phase 1: Baseline warmup
- Duration: `15 min`
- Purpose: fill CDN, app caches, Redis, DB shared buffers
- Traffic: `10%` of target steady state

### Phase 2: Steady-state load
- Duration: `60 min`
- Purpose: validate p95/p99 latency and error budgets
- Traffic mix:
  - `45%` public marketplace/profile
  - `30%` student reads
  - `15%` owner reads
  - `10%` writes

### Phase 3: Peak burst
- Duration: `15 min`
- Purpose: validate exam-season spikes and morning check-in bursts
- Traffic: `2x` steady state

### Phase 4: Soak test
- Duration: `6-12 hours`
- Purpose: detect leaks, queue growth, lock contention, replica lag, memory drift

### Phase 5: Failure drills
- kill one app instance
- restart Redis
- simulate DB failover
- disable one read replica
- verify degraded but non-catastrophic behavior

## Suggested load generator layout

- `6-10` distributed workers
- each worker generates `5k-15k` RPS depending on endpoint mix
- orchestrate from isolated load-test VPC/subnet
- use fixed test accounts and rotating auth pools

Recommended tools:
- `k6` for scripted scenarios
- `autocannon` only for focused endpoint micro-benchmarks
- cloud-hosted workers or Kubernetes jobs for distributed execution

## SLO pass/fail targets

### Public routes
- p95 `< 250ms`
- p99 `< 600ms`
- error rate `< 0.5%`

### Authenticated reads
- p95 `< 350ms`
- p99 `< 800ms`
- error rate `< 0.5%`

### Writes
- p95 `< 500ms`
- p99 `< 1200ms`
- error rate `< 1%`

### Realtime
- socket reconnect `< 5s`
- event fanout lag `< 2s`

## Metrics to collect

- app:
  - request rate
  - p50/p95/p99
  - 4xx/5xx rates
  - CPU
  - memory
  - event loop lag
- database:
  - connections
  - slow queries
  - lock waits
  - buffer hit ratio
  - replication lag
- Redis:
  - hit ratio
  - memory
  - evictions
  - command latency
- queue/jobs:
  - lag
  - retries
  - failure rate

## Special focus scenarios

### Marketplace spike
- many concurrent searches by city/area/q/radius
- validate materialized search table refresh cadence

### Morning attendance spike
- concurrent QR fetch + check-in bursts
- watch DB row contention and notification fanout

### Month-end collections
- owner payments/reports/export spikes
- validate export worker isolation

## Pre-test checklist

- CDN enabled
- Redis enabled
- read replicas enabled
- materialized search index refreshed
- realistic secrets and feature flags configured
- monitoring dashboards ready
- Sentry / OTLP configured

## Exit criteria

LibraryPro is scale-ready for rollout only if:
- all steady-state SLOs pass
- burst error budget stays inside limits
- no runaway DB connection exhaustion
- no sustained replica lag crisis
- no Redis eviction storm
- no export/report worker backlog collapse
