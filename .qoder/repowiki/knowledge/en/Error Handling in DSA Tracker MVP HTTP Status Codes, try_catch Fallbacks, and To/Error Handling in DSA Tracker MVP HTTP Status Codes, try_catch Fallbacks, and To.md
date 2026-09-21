---
kind: error_handling
name: 'Error Handling in DSA Tracker MVP: HTTP Status Codes, try/catch Fallbacks, and Toast Feedback'
category: error_handling
scope:
    - '**'
source_files:
    - api/_session.js
    - api/auth.js
    - api/state.js
    - src/main.jsx
---

## Approach

The DSA Tracker MVP uses a lightweight, pragmatic error-handling strategy split across two layers: the serverless API endpoints (Node.js) and the React frontend (`src/main.jsx`). There is no centralized error class hierarchy, middleware, or logging framework — errors are handled inline with `try`/`catch`, explicit HTTP status codes, and user-facing toast notifications.

## Server-side (API)

- **Configuration errors**: Missing environment variables cause immediate `throw new Error(...)`. In `_session.js`, `secret()` throws when `SESSION_SECRET` is absent, which crashes the request handler at startup time. This is appropriate for a serverless function that cannot run without its secrets.
- **Authentication / authorization errors**: `api/auth.js` returns `401 { error: "Incorrect password" }` on bad credentials and `405 { error: "Method not allowed" }` for unsupported HTTP methods. `api/state.js` returns `401 { error: "Sign in required" }` when `hasSession(req)` fails.
- **Database / persistence errors**: `api/state.js` wraps all Neon SQL operations in a single `try`/`catch` block. On failure it logs via `console.error("Unable to persist tracker state", error)` and responds with `500 { error: "Unable to save cloud data" }`. The catch is broad — any thrown error from `neon(...)` or JSON serialization is mapped to the same generic message.
- **Session parsing safety**: `_session.js`'s `hasSession()` wraps cookie parsing, signature verification, and expiry checks in a `try`/`catch` that silently returns `false` on any malformed input. This treats corrupted session cookies as unauthenticated rather than crashing the endpoint.
- **No structured error types**: All API responses use plain `{ error: string }` bodies; there is no shared error object shape beyond this convention.

## Client-side (React, `src/main.jsx`)

- **Network errors**: Every `fetch` call checks `response.ok`; when false it either throws a descriptive `Error` (e.g. `"Could not load cloud data"`, `"save failed"`) or falls back to a default message derived from `(await response.json()).error`. These errors bubble up to `.catch` handlers that set UI state (`syncStatus = "unavailable" | "error"`, `authError`, or a toast).
- **Local storage fallbacks**: The `useLocalState` hook wraps `localStorage.getItem` + `JSON.parse` in a `try`/`catch` that silently falls back to the initial value, treating corrupt local storage as empty rather than breaking the app.
- **Imported backup handling**: The file import path parses the uploaded JSON inside a `try`/`catch`; parse failures display `"Invalid backup file."` via toast.
- **User-visible feedback**: Errors are surfaced through three mechanisms:
  - A transient `toast` message (auto-dismissed after 2500ms) used for non-critical failures like missing seed data or sync errors.
  - An `authError` state variable rendered inline in the Settings page form for sign-in failures.
  - A `syncStatus` string (`"checking" | "signed-out" | "syncing" | "synced" | "error" | "unavailable"`) that drives the sidebar/cloud-sync banner.
- **Silent degradation**: Several `useEffect` chains fetch static JSON seeds (`problems.json`, `solutions.json`, `tuf-links.json`) and swallow failures by setting an empty default, so the UI still renders even if the CDN/data layer is down.

## Conventions Observed

1. **HTTP error responses are uniform**: API endpoints return `{ error: string }` bodies paired with appropriate status codes (`401`, `405`, `500`).
2. **Environment misconfiguration is fatal on the server**: Missing `SESSION_SECRET` or `DATABASE_URL` results in a thrown error or `500` response respectively — the server does not attempt graceful recovery.
3. **Client-side network failures degrade gracefully**: Failed fetches do not crash the SPA; they update `syncStatus` or show a toast.
4. **Malformed client data is treated as empty**: Corrupt `localStorage` entries and invalid backup files are caught and ignored, preserving app stability.
5. **No global error boundary**: There is no React ErrorBoundary or top-level `window.onerror` handler; errors are handled per-operation.
6. **No custom error classes or error codes**: Errors are represented as plain strings or JavaScript `Error` objects; there is no domain-specific error taxonomy.