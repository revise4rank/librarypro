# Production Environment Wiring

## Redis

Use Upstash Redis by setting:

```env
REDIS_URL=rediss://default:<password>@<region>.upstash.io:6379
```

Behavior:
- if `REDIS_URL` is present, Socket.IO uses the Redis adapter
- if `REDIS_URL` is empty, realtime falls back to single-instance in-memory mode

## Supabase Storage

Use:

```env
UPLOADS_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_BUCKET=booklib-assets
```

Object path convention:

```text
libraries/<library_id>/public-profile/<timestamp>-<safe-filename>
```

Example:

```text
libraries/0c4f.../public-profile/1711909220000-study-hall.jpg
```

## Bucket Recommendation

Bucket:
- `booklib-assets`

Public bucket is simplest for public microsite/gallery images.

If you want public URLs to work directly:
- create a public bucket
- keep only public website/media assets in this bucket

## Suggested Supabase Policy

If bucket is public, public reads are handled by bucket visibility.

For authenticated uploads via service role only:
- no extra client-side insert policy is required because uploads are performed server-side with the service role key

## Domains

Suggested production split:

```text
Frontend: app.booklib.in
API: api.booklib.in
Tenant microsites: <subdomain>.booklib.in
Marketplace: booklib.in
```

## WebSocket URL

Set:

```env
NEXT_PUBLIC_WS_URL=wss://api.booklib.in
```

The frontend socket client automatically uses this when present.
