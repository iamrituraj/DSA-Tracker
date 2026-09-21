# Cloud Synchronization

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [api/auth.js](file://api/auth.js)
- [api/_session.js](file://api/_session.js)
- [api/state.js](file://api/state.js)
- [api/solutions.js](file://api/solutions.js)
- [src/main.jsx](file://src/main.jsx)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for the new cloud-based solution library system with api/solutions.js endpoint
- Enhanced frontend synchronization section to document automatic merging strategies and libApproaches tracking
- Updated state persistence section to include libApproaches field in the synchronized state schema
- Added detailed explanation of solution library sync workflow with conflict resolution
- Updated troubleshooting guide with solution library-specific issues and resolution steps
- Enhanced architecture diagrams to reflect the new solution library component

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

The system is intentionally simple: a single shared app password authenticates one user across devices, and all state is persisted to a Neon Postgres database via serverless functions. **Updated**: The system now includes a comprehensive cloud-based solution library that automatically synchronizes problem approaches between local and cloud instances using intelligent merging strategies based on approach count comparison.

## Project Structure
The cloud sync feature spans server-side API routes and client-side orchestration:
- Serverless API routes under api/ handle authentication, state persistence, and solution library management
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
SOLUTIONS["/api/solutions<br/>api/solutions.js"]
SESSION["Session helpers<br/>api/_session.js"]
end
subgraph "Database"
NEON["Neon Postgres<br/>DATABASE_URL"]
STATE_DB["dsa_tracker_state"]
SOLUTIONS_DB["dsa_solutions"]
end
FE --> AUTH
FE --> STATE
FE --> SOLUTIONS
AUTH --> SESSION
STATE --> SESSION
SOLUTIONS --> SESSION
STATE --> NEON
SOLUTIONS --> NEON
STATE --> STATE_DB
SOLUTIONS --> SOLUTIONS_DB
```

**Diagram sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)
- [api/auth.js:1-24](file://api/auth.js#L1-L24)
- [api/state.js:1-51](file://api/state.js#L1-L51)
- [api/solutions.js:1-68](file://api/solutions.js#L1-L68)
- [api/_session.js:1-54](file://api/_session.js#L1-L54)

**Section sources**
- [README.md:35-54](file://README.md#L35-L54)
- [package.json:12-18](file://package.json#L12-L18)

## Core Components
- Authentication endpoint: validates a single app password and issues an HTTP-only session cookie
- Session utilities: sign/verify cookies, safe comparison, expiration handling
- State endpoint: reads/writes JSONB state to Neon with sanitization and last-write-wins semantics
- Solution library endpoint: manages cloud-based problem approaches with validation and size limits
- Frontend sync engine: loads cloud state on connect, debounced saves after edits, and handles auth flow
- **Updated**: Automatic solution library synchronization with intelligent merging strategies based on approach count comparison

Key responsibilities:
- Enforce one-user-per-account by sharing a single app password
- Protect sessions with signed cookies and short-lived expiry
- Persist only whitelisted fields to prevent schema drift or injection
- Provide offline-first UX with local storage and background sync
- **Updated**: Manage solution library synchronization with automatic conflict resolution when local and cloud versions differ

**Section sources**
- [api/auth.js:1-24](file://api/auth.js#L1-L24)
- [api/_session.js:1-54](file://api/_session.js#L1-L54)
- [api/state.js:1-51](file://api/state.js#L1-L51)
- [api/solutions.js:1-68](file://api/solutions.js#L1-L68)
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)

## Architecture Overview
The sync architecture follows an offline-first model with enhanced solution library management:
- Local state is always authoritative on the device
- On connect, the server's latest state is loaded into the browser
- After edits, changes are saved with a debounce to reduce network calls
- Conflicts are resolved server-side using last-write-wins on a single-row record
- **Updated**: Solution library synchronization uses intelligent merging where the side with more approaches wins, ensuring optimal content convergence

```mermaid
sequenceDiagram
participant U as "User Browser"
participant A as "/api/auth"
participant S as "/api/state"
participant SL as "/api/solutions"
participant DB as "Neon Postgres"
U->>A : POST {password}
A-->>U : Set-Cookie (HttpOnly, signed)
U->>S : GET (with cookie)
S-->>DB : SELECT state FROM dsa_tracker_state WHERE id=1
DB-->>S : {state, updated_at}
S-->>U : {state, updatedAt}
Note over U : Load built-in solutions
U->>SL : GET (check cloud solutions)
SL-->>U : {solutions, updatedAt}
Note over U : Merge local & cloud solutions
U->>SL : POST {solutions} (if needed)
SL-->>DB : INSERT ... ON CONFLICT UPDATE SET solutions = EXCLUDED.solutions
DB-->>SL : OK
U->>S : POST {state} (debounced)
S-->>DB : INSERT ... ON CONFLICT UPDATE SET state = EXCLUDED.state
DB-->>S : OK
S-->>U : {saved : true}
```

**Diagram sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)
- [api/auth.js:8-23](file://api/auth.js#L8-L23)
- [api/state.js:23-49](file://api/state.js#L23-L49)
- [api/solutions.js:40-67](file://api/solutions.js#L40-L67)

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
- **Updated**: Sanitization now includes filters, collapse properties, and libApproaches tracking for solution library synchronization

```mermaid
flowchart TD
Req(["POST /api/state"]) --> Sanitize["Sanitize input to allowed fields"]
Sanitize --> ValidateFilters["Validate filters structure"]
ValidateFilters --> ValidateCollapse["Validate collapse structure"]
ValidateCollapse --> ValidateLibApproaches["Validate libApproaches count"]
ValidateLibApproaches --> Upsert["INSERT ... ON CONFLICT DO UPDATE SET state = EXCLUDED.state"]
Upsert --> Done(["{saved: true}"])
```

**Diagram sources**
- [api/state.js:12-45](file://api/state.js#L12-L45)

**Section sources**
- [api/state.js:1-51](file://api/state.js#L1-L51)

### Solution Library Management
- The solution library endpoint provides cloud-based storage for problem approaches
- Input validation ensures only properly structured solution entries are accepted
- Size limits prevent excessive data transmission (3MB maximum)
- Automatic table creation ensures database schema availability
- **Updated**: Intelligent merging strategy where the side with more approaches wins during synchronization

```mermaid
flowchart TD
Req(["POST /api/solutions"]) --> ValidateSession["Check session validity"]
ValidateSession --> ReadBody["Read and parse request body"]
ReadBody --> SanitizeLibrary["Sanitize solution library"]
SanitizeLibrary --> ValidateSize["Check payload size < 3MB"]
ValidateSize --> EnsureTable["Ensure dsa_solutions table exists"]
EnsureTable --> Upsert["INSERT ... ON CONFLICT DO UPDATE SET solutions = EXCLUDED.solutions"]
Upsert --> Response(["{saved: true, count: N}"])
```

**Diagram sources**
- [api/solutions.js:40-67](file://api/solutions.js#L40-L67)

**Section sources**
- [api/solutions.js:1-68](file://api/solutions.js#L1-L68)

### Frontend Sync Orchestration
- On first load, the app checks authentication status and loads cloud state if authenticated
- User can connect by entering the app password; successful login triggers a cloud state load
- Edits trigger a debounced save to minimize network overhead
- Sync status reflects checking, syncing, synced, error, or signed-out states
- **Updated**: Automatic solution library synchronization with intelligent merging based on approach count comparison

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant AUTH as "/api/auth"
participant STATE as "/api/state"
participant SOLUTIONS as "/api/solutions"
FE->>AUTH : GET (check session)
alt authenticated
FE->>STATE : GET
STATE-->>FE : {state}
FE-->>FE : hydrate local state (including filters & collapse)
FE->>SOLUTIONS : GET (load cloud solutions)
SOLUTIONS-->>FE : {solutions, updatedAt}
FE-->>FE : merge libraries (more approaches wins)
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

### Filter and Collapse State Management
- **Filters**: Store user preferences for topic, status, difficulty, pattern, confidence, favorites, and sort order
- **Collapse**: Track UI state for collapsed topics and patterns to maintain user interface preferences
- Both properties are sanitized before saving to ensure data integrity and prevent schema drift
- LoadCloudState properly restores these properties with validation to handle malformed data gracefully

```mermaid
flowchart TD
LoadState["Load Cloud State"] --> RestoreFilters["Restore Filters with Validation"]
LoadState --> RestoreCollapse["Restore Collapse with Validation"]
RestoreFilters --> ValidFilters{"Valid filters?"}
RestoreCollapse --> ValidCollapse{"Valid collapse?"}
ValidFilters --> |Yes| ApplyFilters["Apply to roadmapFilters"]
ValidFilters --> |No| UseDefaults["Use default filters"]
ValidCollapse --> |Yes| ApplyCollapse["Apply to collapse state"]
ValidCollapse --> |No| UseDefaultsCollapse["Use default collapse"]
ApplyFilters --> HydrateUI["Hydrate UI"]
UseDefaults --> HydrateUI
ApplyCollapse --> HydrateUI
UseDefaultsCollapse --> HydrateUI
```

**Diagram sources**
- [src/main.jsx:156-170](file://src/main.jsx#L156-L170)

**Section sources**
- [src/main.jsx:80-101](file://src/main.jsx#L80-L101)
- [src/main.jsx:156-170](file://src/main.jsx#L156-L170)

### Solution Library Synchronization
- **Automatic Detection**: The frontend detects when built-in solutions differ from cloud versions
- **Intelligent Merging**: Uses a merge strategy where the side with more approaches wins for each problem
- **Count Tracking**: Maintains libApproaches counter to track total solution approaches across all problems
- **Conflict Resolution**: When local has more approaches, pushes to cloud; when cloud has more, pulls to local
- **Validation**: Ensures solution entries follow proper structure with validated approach arrays

```mermaid
flowchart TD
DetectChange["Built-in solutions changed"] --> CompareCounts["Compare local vs cloud approach counts"]
CompareCounts --> LocalMore{"Local has more approaches?"}
LocalMore --> |Yes| PushToCloud["POST solutions to cloud"]
LocalMore --> |No| PullFromCloud["GET solutions from cloud"]
PushToCloud --> MergeLocally["Merge locally (local wins)"]
PullFromCloud --> MergeRemotely["Merge remotely (cloud wins)"]
MergeLocally --> UpdateCounter["Update libApproaches count"]
MergeRemotely --> UpdateCounter
UpdateCounter --> SyncComplete["Sync complete"]
```

**Diagram sources**
- [src/main.jsx:205-237](file://src/main.jsx#L205-L237)

**Section sources**
- [src/main.jsx:205-237](file://src/main.jsx#L205-L237)

### Offline-First Behavior
- All user data is kept in localStorage on the device
- Cloud sync augments local data but does not replace it unless explicitly connected
- Export/import provides portable backups independent of cloud connectivity
- **Updated**: Backup and restore functionality now includes filters, collapse state, and solution library information

**Section sources**
- [src/main.jsx:29-33](file://src/main.jsx#L29-L33)
- [src/main.jsx:144-146](file://src/main.jsx#L144-L146)
- [src/main.jsx:257-258](file://src/main.jsx#L257-L258)

## Dependency Analysis
- Frontend depends on Vercel Functions endpoints for auth, state, and solution library management
- Serverless functions depend on Neon serverless driver for database operations
- Session security depends on a strong SESSION_SECRET and proper environment configuration
- Deployment relies on Vercel's automatic function discovery from the api/ directory

```mermaid
graph LR
FE["src/main.jsx"] --> AUTH["api/auth.js"]
FE --> STATE["api/state.js"]
FE --> SOLUTIONS["api/solutions.js"]
AUTH --> SESS["api/_session.js"]
STATE --> SESS
SOLUTIONS --> SESS
STATE --> NEON["@neondatabase/serverless"]
SOLUTIONS --> NEON
```

**Diagram sources**
- [src/main.jsx:64-113](file://src/main.jsx#L64-L113)
- [api/auth.js:1-24](file://api/auth.js#L1-L24)
- [api/state.js:1-51](file://api/state.js#L1-L51)
- [api/solutions.js:1-68](file://api/solutions.js#L1-L68)
- [package.json:12-18](file://package.json#L12-L18)

**Section sources**
- [package.json:12-18](file://package.json#L12-L18)

## Performance Considerations
- Debounced saves reduce unnecessary writes and network calls during rapid edits
- Single-row JSONB storage simplifies locking and avoids complex conflict resolution logic
- Sanitization minimizes payload size and reduces risk of storing extraneous data
- Stateless session verification keeps server CPU usage low
- **Updated**: Solution library synchronization uses intelligent merging to minimize data transfer and processing overhead
- **Updated**: libApproaches counter enables efficient change detection without full library comparisons

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

- **Updated**: Solution library sync fails
  - Check browser console for validation errors in sanitizeLibrary function
  - Verify solution entries have proper structure with 'approaches' arrays
  - Ensure payload size is under 3MB limit
  - Confirm dsa_solutions table was created successfully in Neon database

- **Updated**: Filter or collapse state not syncing
  - Check browser console for validation errors in sanitizeFilters or sanitizeCollapse functions
  - Verify that filter values match expected enum values (topic, status, difficulty, etc.)
  - Ensure collapse state structure contains valid topic and pattern keys

Backup and recovery:
- Export your data regularly from Settings to maintain a local backup
- Import a previously exported file to restore progress, notes, solutions, activity, settings, filters, collapse state, and solution library data
- If you reset local data while connected, re-connect to reload the latest cloud state

**Section sources**
- [README.md:35-54](file://README.md#L35-L54)
- [src/main.jsx:586-605](file://src/main.jsx#L586-L605)
- [src/main.jsx:80-101](file://src/main.jsx#L80-L101)

## Conclusion
The cloud synchronization feature provides a simple, secure, and reliable way to keep your DSA Tracker data consistent across devices. It uses a one-user-per-account model with password-based authentication, signed HTTP-only sessions, and last-write-wins conflict resolution backed by Neon Postgres. The offline-first design ensures usability without internet access, while periodic sync keeps everything in harmony. **Enhanced**: The system now includes a comprehensive cloud-based solution library with automatic synchronization and intelligent merging strategies, ensuring complete user experience consistency across devices while maintaining optimal performance through efficient conflict resolution.

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
- **Updated**: Solution library validation prevents malicious data injection through UI preferences
- **Updated**: Payload size limits protect against excessive data transmission

**Section sources**
- [api/auth.js:16-22](file://api/auth.js#L16-L22)
- [api/_session.js:6-14](file://api/_session.js#L6-L14)
- [api/state.js:12-21](file://api/state.js#L12-L21)
- [api/solutions.js:9-22](file://api/solutions.js#L9-L22)

### State Schema Reference
The synchronized state object includes:
- `progress`: Problem completion status and revision tracking
- `notes`: Learning notes for each problem
- `solutions`: Personal solution approaches and implementations
- `activity`: Daily activity counts for streak tracking
- `settings`: User preferences like daily goals and theme
- `filters`: Roadmap filtering preferences (topic, status, difficulty, pattern, confidence, favorites, sort)
- `collapse`: UI state for collapsed topics and patterns
- **Updated**: `libApproaches`: Total count of solution approaches across all problems for synchronization tracking

**Section sources**
- [api/state.js:4-22](file://api/state.js#L4-L22)
- [src/main.jsx:155](file://src/main.jsx#L155)

### Solution Library Schema Reference
The solution library stores problem approaches with the following structure:
- Keys: Problem IDs matching the format `a2z-XXXXX`
- Values: Objects containing `approaches` arrays
- Approaches: Arrays of approach objects with title, level, time/space complexity, explanation, and code
- Validation: Maximum 5000 entries per request, 24 approaches per problem, 3MB payload limit
- Storage: Separate `dsa_solutions` table with JSONB column for optimized querying

**Section sources**
- [api/solutions.js:9-22](file://api/solutions.js#L9-L22)
- [api/solutions.js:24-38](file://api/solutions.js#L24-L38)