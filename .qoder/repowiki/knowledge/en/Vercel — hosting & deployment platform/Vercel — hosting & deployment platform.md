---
kind: external_dependency
name: Vercel — hosting & deployment platform
slug: vercel
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
source_files:
    - api/_session.js
    - README.md
---

The project is deployed as a Vite application with Vercel Functions under the root `api/` directory. Environment variables (`DATABASE_URL`, `APP_ACCESS_PASSWORD`, `SESSION_SECRET`) are managed in Vercel Project Settings. The session cookie's `Secure` flag is gated on `process.env.VERCEL`, which is set by Vercel's runtime to indicate HTTPS hosting; this is used to decide whether to mark the session cookie secure.

- Role: hosts the frontend build and the three serverless functions (`auth`, `state`, `_session`).
- Client constraint: local development requires `vercel dev` to expose functions; plain `npm run dev` serves only the static frontend.
- Verify exact behavior against official Vercel docs.