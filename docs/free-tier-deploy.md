# Free-Tier Deploy Guide

This is the fastest low-cost way to put `LibraryPro` online for real infra testing.

## Recommended stack

- Web: Vercel Hobby
- API: Render Free Web Service
- Database: Render Free Postgres for quick testing, or Supabase Free if you want longer-lived data
- Redis: Upstash Free Redis
- File uploads: Supabase Storage Free

## Why this stack

- The Next.js web app fits Vercel Hobby well.
- The Express API runs fine on Render's free Node web service.
- Upstash is the easiest free Redis for leaderboard/cache testing.
- Supabase is already supported in app envs for uploads and can also be used for Postgres if preferred.

## 1. Deploy API on Render

This repo now includes [render.yaml](C:\Users\vikki\Downloads\library\render.yaml).

### Steps

1. Push this repo to GitHub.
2. In Render, create a new Blueprint deploy from the repo.
3. Render will detect `render.yaml` and create:
   - `librarypro-api`
   - `librarypro-db`
4. After first deploy, fill the unsynced env vars in the Render dashboard.

### Required API envs

Use [.env.production.example](C:\Users\vikki\Downloads\library\.env.production.example) as the source of truth.

Minimum for infra testing:

- `BASE_DOMAIN`
- `WEB_APP_URL`
- `JWT_SECRET`
- `INTERNAL_TENANT_HEADER_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `UPLOADS_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`

Optional for later:

- Razorpay vars
- SMTP vars
- Sentry/OTEL vars
- Notification webhook vars

### After deploy

Run once from local machine against the deployed database:

```powershell
$env:DATABASE_URL="your_render_or_supabase_database_url"
npm run migrate -w @librarypro/api
npm run seed -w @librarypro/api
```

## 2. Deploy Web on Vercel

Create a Vercel project pointing to:

- Root Directory: `apps/web`

### Build settings

- Framework preset: `Next.js`
- Install command: `npm install`
- Build command: `npm run build -w @librarypro/web`

### Required Vercel envs

- `NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com`
- `NEXT_PUBLIC_BASE_DOMAIN=your-project.vercel.app`
- `NEXT_PUBLIC_WS_URL=wss://your-render-api.onrender.com`

If you later attach a real custom domain, change `NEXT_PUBLIC_BASE_DOMAIN` and `BASE_DOMAIN` together.

## 3. Upstash Redis

Create one free Redis database in Upstash and copy:

- `REDIS_URL`

Use that in Render API envs.

## 4. Supabase Storage

Create a free Supabase project.

Create bucket:

- `librarypro-assets`

Set API envs:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET=librarypro-assets`

## 5. Verify after deploy

### API

Open:

- `/health`
- `/ready`

### Web

Open:

- `/owner/login`
- `/student/login?library=focuslibrary`
- `/superadmin/login`
- `/marketplace`

### Demo credentials

Seeded demo users:

- Owner: `owner@librarypro.demo / owner123`
- Student: `student@librarypro.demo / student123`
- Super Admin: `admin@librarypro.demo / admin123`

## 6. Free-tier limitations

For infra testing this is acceptable, but keep these in mind:

- Free services may sleep after inactivity.
- Cold starts will make first request slower.
- Free Postgres can have storage/retention limits.
- This is for testing, not serious production launch.

## Best test path

1. Deploy API on Render.
2. Set Redis and Supabase envs.
3. Run migrations and seed.
4. Deploy web on Vercel.
5. Test owner, student, and marketplace flows.
6. Run remote smoke manually on deployed URLs.
