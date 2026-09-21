# Architecture Overview

<cite>
**Referenced Files in This Document**
- [src/main.jsx](file://src/main.jsx)
- [api/auth.js](file://api/auth.js)
- [api/_session.js](file://api/_session.js)
- [api/state.js](file://api/state.js)
- [package.json](file://package.json)
- [README.md](file://README.md)
- [data/problems.json](file://data/problems.json)
- [public/data/tuf-links.json](file://public/data/tuf-links.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Security Model](#security-model)
9. [Scalability and Reliability](#scalability-and-reliability)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Conclusion](#conclusion)

## Introduction
DSA Tracker is a local-first React application that helps users practice, track, revise, and master problems from the Striver A2Z DSA sheet. It runs entirely offline by default using bundled problem data and browser storage for progress, notes, solutions, activity, and settings. Optional cloud synchronization persists state to a Neon PostgreSQL database via serverless functions when the user connects with an app password. The system integrates with TakeUForward links to provide external references for problems.

## Project Structure
The project is organized into:
- Frontend: React + Vite application under src/ and public/, with all UI logic in a single main component file.
- Backend: Serverless API routes under api/ handling authentication and cloud sync.
- Data: Curated problem sets and mappings under data/ and public/data/.
- Scripts: Utilities to prepare datasets and extract TakeUForward links.

```mermaid
graph TB
subgraph "Browser"
UI["React App<br/>src/main.jsx"]
LS["Local Storage<br/>progress, notes, solutions, activity, settings"]
end
subgraph "Serverless Functions"
AUTH["/api/auth<br/>auth.js"]
STATE["/api/state<br/>state.js"]
SESSION["_session.js"]
end
subgraph "External Services"
NEON["Neon PostgreSQL"]
TUF["TakeUForward Links<br/>public/data/tuf-links.json"]
end
UI --> LS
UI --> AUTH
UI --> STATE
AUTH --> SESSION
STATE --> NEON
UI --> TUF
```

**Diagram sources**
- [src/main.jsx:47-173](file://src/main.jsx#L47-L173)
- [api/auth.js:8-23](file://api/auth.js#L8-L23)
- [api/_session.js:29-51](file://api/_session.js#L29-L51)
- [api/state.js:23-50](file://api/state.js#L23-L50)
- [public/data/tuf-links.json:1-20](file://public/data/tuf-links.json#L1-L20)

**Section sources**
- [src/main.jsx:1-173](file://src/main.jsx#L1-L173)
- [package.json:1-21](file://package.json#L1-L21)
- [README.md:1-59](file://README.md#L1-L59)

## Core Components
- Frontend entrypoint and UI: The entire React application is implemented in a single file with multiple components (App, Dashboard, Roadmap, Revision, Patterns, Analytics, Problem, SettingsPage). It manages local state via localStorage and optional cloud sync.
- Authentication endpoint: Validates a single app password and issues an HTTP-only session cookie.
- Session utilities: Signs and verifies cookies using HMAC with a secret, enforces expiration, and supports clearing sessions.
- State persistence endpoint: Reads/writes a JSONB document representing user state to Neon PostgreSQL after sanitization and session validation.

Key responsibilities:
- Local-first state: All user data is persisted in the browser first; cloud sync is opt-in and asynchronous.
- Cloud sync: Periodically saves the current local state to the server if authenticated; loads initial state on sign-in.
- External integrations: Loads TakeUForward links and LeetCode URLs for problem context.

**Section sources**
- [src/main.jsx:29-114](file://src/main.jsx#L29-L114)
- [api/auth.js:8-23](file://api/auth.js#L8-L23)
- [api/_session.js:1-54](file://api/_session.js#L1-L54)
- [api/state.js:1-50](file://api/state.js#L1-L50)

## Architecture Overview
The system follows a local-first architecture with optional cloud synchronization:
- The React UI reads and writes to localStorage for immediate responsiveness.
- On sign-in, the client authenticates with the server, receives an HTTP-only session cookie, and loads any existing cloud state to merge with local data.
- Changes are debounced and periodically saved to the server while maintaining local copies.
- The server validates requests using session cookies and persists data to Neon PostgreSQL.

```mermaid
sequenceDiagram
participant U as "User Browser"
participant R as "React App<br/>src/main.jsx"
participant A as "Auth API<br/>api/auth.js"
participant S as "Session Utils<br/>api/_session.js"
participant ST as "State API<br/>api/state.js"
participant DB as "Neon PostgreSQL"
U->>R : Open app
R->>R : Load local state from localStorage
R->>A : GET /api/auth (check session)
A->>S : hasSession(req)
S-->>A : true/false
A-->>R : {authenticated}
alt Authenticated
R->>ST : GET /api/state
ST->>DB : SELECT state
DB-->>ST : state
ST-->>R : {state}
R->>R : Merge cloud state into local state
else Not Authenticated
R->>R : Stay local-only
end
Note over R : User edits progress/notes/solutions/activity/settings
R->>R : Debounce save
R->>ST : POST /api/state {state}
ST->>DB : INSERT/UPSERT state
DB-->>ST : ok
ST-->>R : {saved}
```

**Diagram sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)
- [api/auth.js:8-23](file://api/auth.js#L8-L23)
- [api/_session.js:41-51](file://api/_session.js#L41-L51)
- [api/state.js:23-50](file://api/state.js#L23-L50)

## Detailed Component Analysis

### Frontend Application (src/main.jsx)
- Single-file React application with multiple functional components:
  - App: Root component managing global state, routing between pages, and orchestrating cloud sync.
  - Dashboard: Summarizes stats, due revisions, next problems, and weak areas.
  - Roadmap: Groups problems by topic and pattern with filters and sorting.
  - Revision: Displays due and upcoming revisions based on spaced repetition schedule.
  - Patterns: Visualizes completion per pattern with external solution links.
  - Analytics: Aggregates status, confidence, difficulty, and activity metrics.
  - Problem: Per-problem editing of notes, solutions, metadata, and revision scheduling.
  - SettingsPage: Handles export/import/reset and cloud sync connection/disconnection.

Data flow highlights:
- Local state hooks persist to localStorage automatically.
- Cloud state is loaded on startup if authenticated; changes are debounced and saved to /api/state.
- External resources (problems, solutions, TakeUForward links) are fetched from static JSON files.

```mermaid
flowchart TD
Start(["App Mount"]) --> LoadLocal["Load local state from localStorage"]
LoadLocal --> CheckAuth["GET /api/auth"]
CheckAuth --> |Authenticated| LoadCloud["GET /api/state"]
CheckAuth --> |Not Authenticated| UseLocal["Use local-only mode"]
LoadCloud --> MergeState["Merge cloud state into local state"]
MergeState --> RenderUI["Render UI"]
UseLocal --> RenderUI
RenderUI --> UserAction{"User edits?"}
UserAction --> |Yes| UpdateLocal["Update local state"]
UpdateLocal --> DebounceSave["Debounce save to /api/state"]
DebounceSave --> SaveCloud["POST /api/state"]
SaveCloud --> UpdateUI["Update sync status"]
UserAction --> |No| Idle["Idle"]
```

**Diagram sources**
- [src/main.jsx:47-114](file://src/main.jsx#L47-L114)
- [src/main.jsx:156-173](file://src/main.jsx#L156-L173)

**Section sources**
- [src/main.jsx:47-173](file://src/main.jsx#L47-L173)
- [src/main.jsx:175-609](file://src/main.jsx#L175-L609)

### Authentication Endpoint (api/auth.js)
- Supports GET to check session status, DELETE to clear session, and POST to authenticate with an app password.
- Uses constant-time comparison to prevent timing attacks.
- Issues an HTTP-only session cookie upon successful authentication.

```mermaid
sequenceDiagram
participant C as "Client"
participant A as "Auth API"
participant S as "Session Utils"
C->>A : POST /api/auth {password}
A->>A : Read body and validate method
A->>A : Compare configured password with request password
alt Password matches
A->>S : issueSession(res)
S-->>A : Cookie set
A-->>C : {authenticated : true}
else Password mismatch
A-->>C : {error : "Incorrect password"}
end
```

**Diagram sources**
- [api/auth.js:8-23](file://api/auth.js#L8-L23)
- [api/_session.js:29-34](file://api/_session.js#L29-L34)

**Section sources**
- [api/auth.js:1-24](file://api/auth.js#L1-L24)

### Session Management (api/_session.js)
- Creates signed cookies using HMAC-SHA256 with a server-side secret.
- Parses cookies, verifies signatures, and checks expiration.
- Supports issuing and clearing sessions with appropriate flags (HttpOnly, SameSite, Secure in production).

```mermaid
classDiagram
class SessionUtils {
+issueSession(res) void
+clearSession(res) void
+hasSession(req) bool
-secret() string
-sign(value) string
-parseCookies(header) object
-safeEqual(left, right) bool
}
```

**Diagram sources**
- [api/_session.js:1-54](file://api/_session.js#L1-L54)

**Section sources**
- [api/_session.js:1-54](file://api/_session.js#L1-L54)

### State Persistence Endpoint (api/state.js)
- Requires a valid session; otherwise returns 401.
- Sanitizes incoming state to ensure only expected fields are persisted.
- Uses Neon serverless driver to create or read a single-row JSONB record representing the user’s tracker state.
- Upserts state on POST to maintain last-write-wins semantics.

```mermaid
sequenceDiagram
participant C as "Client"
participant ST as "State API"
participant S as "Session Utils"
participant DB as "Neon PostgreSQL"
C->>ST : GET /api/state
ST->>S : hasSession(req)
S-->>ST : true/false
alt Authenticated
ST->>DB : SELECT state WHERE id = 1
DB-->>ST : state
ST-->>C : {state, updatedAt}
else Not Authenticated
ST-->>C : {error : "Sign in required"}
end
C->>ST : POST /api/state {state}
ST->>S : hasSession(req)
ST->>ST : sanitize(state)
ST->>DB : INSERT/UPSERT state
DB-->>ST : ok
ST-->>C : {saved : true}
```

**Diagram sources**
- [api/state.js:23-50](file://api/state.js#L23-L50)
- [api/_session.js:41-51](file://api/_session.js#L41-L51)

**Section sources**
- [api/state.js:1-51](file://api/state.js#L1-L51)

### Data Models and Integrations
- Problems dataset: Bundled JSON array with identifiers, titles, topics, patterns, difficulties, and optional URLs.
- TakeUForward links: Mapping from problem IDs to external resource URLs used within the UI.
- Database schema: Single-row JSONB table storing progress, notes, solutions, activity, and settings.

```mermaid
erDiagram
DSA_TRACKER_STATE {
smallint id PK
jsonb state
timestamptz updated_at
}
```

**Diagram sources**
- [api/state.js:28-44](file://api/state.js#L28-L44)

**Section sources**
- [data/problems.json:1-200](file://data/problems.json#L1-L200)
- [public/data/tuf-links.json:1-200](file://public/data/tuf-links.json#L1-L200)
- [api/state.js:28-44](file://api/state.js#L28-L44)

## Dependency Analysis
- Frontend dependencies: React, ReactDOM, Vite, Lucide icons.
- Backend dependencies: Neon serverless driver for PostgreSQL.
- Integration points:
  - Static JSON assets for problems and TakeUForward links.
  - Environment variables for secrets and database URL.

```mermaid
graph LR
FE["Frontend<br/>src/main.jsx"] --> DEPS["Dependencies<br/>react, react-dom, vite, lucide-react"]
BE["Backend<br/>api/*"] --> NPM["@neondatabase/serverless"]
FE --> DATA["Static Data<br/>data/problems.json, public/data/tuf-links.json"]
BE --> ENV["Environment<br/>DATABASE_URL, APP_ACCESS_PASSWORD, SESSION_SECRET"]
```

**Diagram sources**
- [package.json:12-19](file://package.json#L12-L19)
- [api/state.js:1-2](file://api/state.js#L1-L2)
- [src/main.jsx:7-10](file://src/main.jsx#L7-L10)

**Section sources**
- [package.json:1-21](file://package.json#L1-L21)
- [api/state.js:1-5](file://api/state.js#L1-L5)
- [src/main.jsx:7-10](file://src/main.jsx#L7-L10)

## Performance Considerations
- Local-first design ensures fast UI interactions without network latency.
- Debounced cloud saves reduce unnecessary network calls and server load.
- Single-row JSONB storage simplifies reads/writes and avoids complex queries.
- Static data bundling eliminates runtime fetch overhead for problem lists.

[No sources needed since this section provides general guidance]

## Security Model
- Password-based authentication: A single app password is validated server-side using constant-time comparison to mitigate timing attacks.
- Session cookies: Signed with HMAC using a server-side secret; HttpOnly and SameSite=Lax; Secure flag enabled in production environments.
- Input sanitization: Incoming state is sanitized to allow only known fields before persistence.
- Secrets management: DATABASE_URL, APP_ACCESS_PASSWORD, and SESSION_SECRET are environment variables not exposed to the client.

```mermaid
flowchart TD
Login["User submits password"] --> Validate["Server compares with configured password"]
Validate --> |Match| IssueCookie["Issue signed HTTP-only session cookie"]
Validate --> |Mismatch| Deny["Return 401 Unauthorized"]
IssueCookie --> AccessAPI["Subsequent requests include cookie"]
AccessAPI --> Verify["Server verifies signature and expiry"]
Verify --> |Valid| Allow["Allow access to protected endpoints"]
Verify --> |Invalid| Deny
```

**Diagram sources**
- [api/auth.js:16-22](file://api/auth.js#L16-L22)
- [api/_session.js:29-51](file://api/_session.js#L29-L51)

**Section sources**
- [api/auth.js:1-24](file://api/auth.js#L1-L24)
- [api/_session.js:1-54](file://api/_session.js#L1-L54)
- [api/state.js:12-21](file://api/state.js#L12-L21)

## Scalability and Reliability
- Stateless serverless functions scale horizontally with demand.
- Single-user design reduces contention; last-write-wins behavior handles concurrent edits gracefully.
- Neon PostgreSQL provides managed scaling and reliability for the persistent state store.
- Local-first approach minimizes dependency on backend availability for core functionality.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Cloud sync unavailable: Ensure DATABASE_URL is configured and accessible; verify session cookie presence.
- Authentication failures: Confirm APP_ACCESS_PASSWORD matches the value entered in Settings; check for correct environment configuration.
- Session expired: Re-authenticate via Settings to refresh the session cookie.
- Data loss risk: Export backups regularly; local storage is device/browser specific.

**Section sources**
- [README.md:35-59](file://README.md#L35-L59)
- [api/state.js:23-50](file://api/state.js#L23-L50)
- [api/auth.js:8-23](file://api/auth.js#L8-L23)

## Conclusion
DSA Tracker combines a responsive local-first React interface with optional cloud synchronization backed by Neon PostgreSQL. Its architecture emphasizes security through signed session cookies and input sanitization, simplicity via a single-row JSONB store, and extensibility through static data and external link integrations. The system is designed for a single user, prioritizing privacy and ease of use while providing robust tracking, revision scheduling, and analytics.

[No sources needed since this section summarizes without analyzing specific files]