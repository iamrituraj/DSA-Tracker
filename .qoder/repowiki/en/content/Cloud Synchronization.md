# Cloud Synchronization

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [api/auth.js](file://api/auth.js)
- [api/_session.js](file://api/_session.js)
- [api/state.js](file://api/state.js)
- [src/main.jsx](file://src/main.jsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the cloud synchronization feature for the DSA Tracker application. It covers:
- One-user-per-account design with password-based authentication and secure session management
- Vercel deployment setup with Neon database integration and environment variables
- Data synchronization protocol, conflict resolution strategy (last-write-wins), and offline-first behavior
- Security considerations for passwords, sessions, and data storage
- Troubleshooting common sync issues and backup/recovery procedures

The system is intentionally simple: a single shared app password authenticates one user across devices, and all state is persisted to a Neon Postgres database via serverless functions.

## Project Structure
The cloud sync feature spans server-side API routes and client-side orchestration:
- Serverless API routes under api/ handle authentication and state persistence
- The React frontend under src/main.jsx manages local state, sync triggers, and UI flows
- Environment configuration and deployment instructions are documented in README.md
- Dependencies include Neon serverless driver for database access

```mermaid
graph TB
subgraph "Frontend"
FE["React App<br/>src/main.jsx"]
end
subgraph "Vercel Functions"
AUTH["/api/auth<br/>api/auth.js"]
STATE["/api/state<br/>api/state.js"]
SESSION["Session helpers<br/>api/_session.js"]
end
subgraph "Database"
NEON["Neon Postgres<br/>DATABASE_URL"]
end
FE --> AUTH
FE --> STATE
AUTH --> SESSION
STATE --> SESSION
STATE --> NEON
```

**Diagram sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)
- [api/auth.js:1-24](file://api/auth.js#L1-L24)
- [api/state.js:1-51](file://api/state.js#L1-L51)
- [api/_session.js:1-54](file://api/_session.js#L1-L54)

**Section sources**
- [README.md:35-54](file://README.md#L35-L54)
- [package.json:12-18](file://package.json#L12-L18)

## Core Components
- Authentication endpoint: validates a single app password and issues an HTTP-only session cookie
- Session utilities: sign/verify cookies, safe comparison, expiration handling
- State endpoint: reads/writes JSONB state to Neon with sanitization and last-write-wins semantics
- Frontend sync engine: loads cloud state on connect, debounced saves after edits, and handles auth flow

Key responsibilities:
- Enforce one-user-per-account by sharing a single app password
- Protect sessions with signed cookies and short-lived expiry
- Persist only whitelisted fields to prevent schema drift or injection
- Provide offline-first UX with local storage and background sync

**Section sources**
- [api/auth.js:1-24](file://api/auth.js#L1-L24)
- [api/_session.js:1-54](file://api/_session.js#L1-L54)
- [api/state.js:1-51](file://api/state.js#L1-L51)
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)

## Architecture Overview
The sync architecture follows an offline-first model:
- Local state is always authoritative on the device
- On connect, the server’s latest state is loaded into the browser
- After edits, changes are saved with a debounce to reduce network calls
- Conflicts are resolved server-side using last-write-wins on a single-row record

```mermaid
sequenceDiagram
participant U as "User Browser"
participant A as "/api/auth"
participant S as "/api/state"
participant DB as "Neon Postgres"
U->>A : POST {password}
A-->>U : Set-Cookie (HttpOnly, signed)
U->>S : GET (with cookie)
S-->>DB : SELECT state FROM dsa_tracker_state WHERE id=1
DB-->>S : {state, updated_at}
S-->>U : {state, updatedAt}
U->>S : POST {state} (debounced)
S-->>DB : INSERT ... ON CONFLICT UPDATE SET state = EXCLUDED.state
DB-->>S : OK
S-->>U : {saved : true}
```

**Diagram sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)
- [api/auth.js:8-23](file://api/auth.js#L8-L23)
- [api/state.js:23-49](file://api/state.js#L23-L49)

## Detailed Component Analysis

### Authentication Flow
- The client sends a POST to /api/auth with the app password
- The server compares the provided password against the configured secret using constant-time comparison
- On success, it sets an HTTP-only, signed session cookie with expiration
- Subsequent requests include the cookie; unauthenticated requests are rejected

```mermaid
sequenceDiagram
participant C as "Client"
participant Auth as "/api/auth"
participant Sess as "Session Helpers"
C->>Auth : POST {password}
Auth->>Sess : safeEqual(input, APP_ACCESS_PASSWORD)
alt valid
Auth->>Sess : issueSession(res)
Sess-->>Auth : Set-Cookie (signed, HttpOnly)
Auth-->>C : 200 {authenticated : true}
else invalid
Auth-->>C : 401 {error : "Incorrect password"}
end
```

**Diagram sources**
- [api/auth.js:8-23](file://api/auth.js#L8-L23)
- [api/_session.js:23-34](file://api/_session.js#L23-L34)

**Section sources**
- [api/auth.js:1-24](file://api/auth.js#L1-L24)
- [api/_session.js:6-34](file://api/_session.js#L6-L34)

### Session Management
- Cookies are signed using HMAC-SHA256 with a server-side secret
- Expiration is enforced by embedding an exp timestamp in the payload
- Safe comparison prevents timing attacks when validating passwords and signatures
- In production deployments (e.g., Vercel), Secure flag is applied automatically

```mermaid
flowchart TD
Start(["Request"]) --> ParseCookies["Parse Cookie Header"]
ParseCookies --> HasCookie{"Has session cookie?"}
HasCookie --> |No| Deny["Return false"]
HasCookie --> |Yes| VerifySig["Verify signature with SESSION_SECRET"]
VerifySig --> SigValid{"Signature valid?"}
SigValid --> |No| Deny
SigValid --> |Yes| CheckExp["Check exp > now"]
CheckExp --> ExpValid{"Expired?"}
ExpValid --> |Yes| Deny
ExpValid --> |No| Allow["Return true"]
```

**Diagram sources**
- [api/_session.js:16-51](file://api/_session.js#L16-L51)

**Section sources**
- [api/_session.js:1-54](file://api/_session.js#L1-L54)

### State Persistence and Conflict Resolution
- The state endpoint enforces a strict schema by sanitizing inputs to known fields
- Data is stored as JSONB in a single-row table identified by a fixed primary key
- Writes use upsert semantics: insert if missing, otherwise update the existing row
- Conflict resolution is last-write-wins because there is only one row per account

```mermaid
flowchart TD
Req(["POST /api/state"]) --> Sanitize["Sanitize input to allowed fields"]
Sanitize --> Upsert["INSERT ... ON CONFLICT DO UPDATE SET state = EXCLUDED.state"]
Upsert --> Done(["{saved: true}"])
```

**Diagram sources**
- [api/state.js:12-45](file://api/state.js#L12-L45)

**Section sources**
- [api/state.js:1-51](file://api/state.js#L1-L51)

### Frontend Sync Orchestration
- On first load, the app checks authentication status and loads cloud state if authenticated
- User can connect by entering the app password; successful login triggers a cloud state load
- Edits trigger a debounced save to minimize network overhead
- Sync status reflects checking, syncing, synced, error, or signed-out states

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant AUTH as "/api/auth"
participant STATE as "/api/state"
FE->>AUTH : GET (check session)
alt authenticated
FE->>STATE : GET
STATE-->>FE : {state}
FE-->>FE : hydrate local state
else not authenticated
FE-->>FE : show sign-in form
end
Note over FE : On any state change
FE->>STATE : POST {state} (after debounce)
STATE-->>FE : {saved : true}
```

**Diagram sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)

**Section sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)

### Offline-First Behavior
- All user data is kept in localStorage on the device
- Cloud sync augments local data but does not replace it unless explicitly connected
- Export/import provides portable backups independent of cloud connectivity

**Section sources**
- [src/main.jsx:29-33](file://src/main.jsx#L29-L33)
- [src/main.jsx:144-146](file://src/main.jsx#L144-L146)

## Dependency Analysis
- Frontend depends on Vercel Functions endpoints for auth and state
- Serverless functions depend on Neon serverless driver for database operations
- Session security depends on a strong SESSION_SECRET and proper environment configuration
- Deployment relies on Vercel’s automatic function discovery from the api/ directory

```mermaid
graph LR
FE["src/main.jsx"] --> AUTH["api/auth.js"]
FE --> STATE["api/state.js"]
AUTH --> SESS["api/_session.js"]
STATE --> SESS
STATE --> NEON["@neondatabase/serverless"]
```

**Diagram sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)
- [api/auth.js:1-24](file://api/auth.js#L1-L24)
- [api/state.js:1-51](file://api/state.js#L1-L51)
- [package.json:12-18](file://package.json#L12-L18)

**Section sources**
- [package.json:12-18](file://package.json#L12-L18)

## Performance Considerations
- Debounced saves reduce unnecessary writes and network calls during rapid edits
- Single-row JSONB storage simplifies locking and avoids complex conflict resolution logic
- Sanitization minimizes payload size and reduces risk of storing extraneous data
- Stateless session verification keeps server CPU usage low

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common issues and resolutions:
- Cannot connect to cloud sync
  - Ensure DATABASE_URL is set in Vercel environment variables
  - Confirm Neon database is created and accessible
  - Use vercel dev to test API routes locally before deploying

- Incorrect password errors
  - Verify APP_ACCESS_PASSWORD matches what is entered in Settings
  - Remember that the same password must be used across all devices

- Session not persisting
  - Confirm SESSION_SECRET is set and consistent across environments
  - Check that cookies are accepted by the browser and not blocked by extensions

- Sync shows error or unavailable
  - Inspect network tab for failed fetches to /api/state
  - Validate that the request includes the session cookie

Backup and recovery:
- Export your data regularly from Settings to maintain a local backup
- Import a previously exported file to restore progress, notes, solutions, activity, and settings
- If you reset local data while connected, re-connect to reload the latest cloud state

**Section sources**
- [README.md:35-54](file://README.md#L35-L54)
- [src/main.jsx:586-605](file://src/main.jsx#L586-L605)

## Conclusion
The cloud synchronization feature provides a simple, secure, and reliable way to keep your DSA Tracker data consistent across devices. It uses a one-user-per-account model with password-based authentication, signed HTTP-only sessions, and last-write-wins conflict resolution backed by Neon Postgres. The offline-first design ensures usability without internet access, while periodic sync keeps everything in harmony. Follow the setup steps, configure secrets securely, and use export/import for robust backup and recovery.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Setup Checklist for Vercel + Neon
- Create or connect a Neon Postgres database in Vercel Storage
- Add environment variables:
  - DATABASE_URL: Neon pooled connection string
  - APP_ACCESS_PASSWORD: strong password used by all devices
  - SESSION_SECRET: random 32+ character value generated securely
- Deploy the project; Vercel will auto-discover functions under api/
- On first device, open Settings → Cloud sync and enter the app password
- Connect additional devices with the same password to share state

**Section sources**
- [README.md:35-54](file://README.md#L35-L54)

### Security Notes
- Passwords are compared using constant-time equality to mitigate timing attacks
- Sessions are signed with HMAC and stored in HttpOnly cookies
- Only whitelisted fields are persisted to prevent schema drift or injection
- Keep secrets out of client code; they belong in server environment variables

**Section sources**
- [api/auth.js:16-22](file://api/auth.js#L16-L22)
- [api/_session.js:6-14](file://api/_session.js#L6-L14)
- [api/state.js:12-21](file://api/state.js#L12-L21)