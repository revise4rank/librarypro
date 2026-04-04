# API Migrations

- `migrate.ts` first applies the legacy baseline from `docs/schema.sql` as `0001_legacy_schema`.
- Add new incremental SQL files here using ordered names such as `0002_add_index.sql`.
- Each file is recorded in `schema_migrations` after a successful transaction.
