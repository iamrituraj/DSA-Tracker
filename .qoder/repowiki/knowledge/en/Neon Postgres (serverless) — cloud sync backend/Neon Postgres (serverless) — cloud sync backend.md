---
kind: external_dependency
name: Neon Postgres (serverless) — cloud sync backend
slug: neon-postgres
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
source_files:
    - api/state.js
    - README.md
---

The app's optional cloud sync layer persists a single-row JSONB state (`dsa_tracker_state`) to a Neon Postgres database via the `@neondatabase/serverless` client. The database is provisioned through Vercel's Storage Marketplace integration and accessed through the `DATABASE_URL` environment variable; the table schema is created on every request with `CREATE TABLE IF NOT EXISTS`. The serverless driver connects directly from Vercel Functions without a connection pool, so each function invocation opens its own connection.

- Role: last-write-wins multi-device sync for one user (progress, notes, solutions, activity, settings).
- Client constraint: Neon serverless connections are per-invocation; memoizing the `CREATE TABLE` promise at module scope avoids an extra round-trip per save.
- Verify exact API/params against official Neon docs.