# Revision System

<cite>
**Referenced Files in This Document**
- [main.jsx](file://src/main.jsx)
- [state.js](file://api/state.js)
- [README.md](file://README.md)
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

## Introduction
This document explains the spaced repetition revision system used by the DSA Tracker. It covers the scheduling algorithm with fixed intervals, how due problems are calculated, the revision completion workflow, queue management for upcoming and due items, activity tracking integration, and the update function that advances revision counts, next revision dates, and status progression. It also describes the visual design of due vs upcoming sections, the review button behavior, and how revisions fit into the overall learning workflow.

## Project Structure
The revision system is implemented as part of a single-page React application. The core logic lives in the main application file, while cloud persistence is handled by a serverless API route. Problem data is bundled locally and loaded at runtime.

```mermaid
graph TB
UI["React UI<br/>src/main.jsx"] --> LocalState["Local state (localStorage)<br/>progress, notes, solutions, activity, settings"]
UI --> CloudAPI["Cloud sync API<br/>api/state.js"]
UI --> Data["Problem dataset<br/>public/data/problems.json"]
CloudAPI --> DB["Neon Postgres JSONB store"]
```

**Diagram sources**
- [main.jsx:47-115](file://src/main.jsx#L47-L115)
- [state.js:23-50](file://api/state.js#L23-L50)

**Section sources**
- [main.jsx:47-115](file://src/main.jsx#L47-L115)
- [state.js:23-50](file://api/state.js#L23-L50)
- [README.md:5-17](file://README.md#L5-L17)

## Core Components
- Spaced repetition schedule: Fixed intervals of 1, 3, 7, 14, and 30 days define when the next revision should occur after each review.
- Due calculation: A problem is due if it has a scheduled next revision date that is on or before the current time.
- Upcoming list: Problems with future next revision dates are shown as upcoming, sorted by soonest first and limited to a small number for quick scanning.
- Completion workflow: Marking a problem as reviewed increments the revision count, updates last revised timestamp, schedules the next revision using the appropriate interval, and promotes status from Attempted to Solved when applicable. Activity is recorded for the current day.
- Update function: Centralized patching of progress fields including status, attempts, confidence, revision count, last revised, and next revision date.

**Section sources**
- [main.jsx:12-12](file://src/main.jsx#L12-L12)
- [main.jsx:247-248](file://src/main.jsx#L247-L248)
- [main.jsx:442-455](file://src/main.jsx#L442-L455)
- [main.jsx:476-480](file://src/main.jsx#L476-L480)

## Architecture Overview
The revision system integrates three layers:
- UI layer: Renders due and upcoming lists, provides “Reviewed” actions, and exposes per-problem scheduling controls.
- State layer: Maintains local state for progress, notes, solutions, activity, and settings; computes derived values like stats and filtered lists.
- Persistence layer: Optionally syncs state to a cloud database via an authenticated API endpoint.

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "Revision UI<br/>src/main.jsx"
participant Store as "Local State"
participant Sync as "Cloud API<br/>api/state.js"
participant DB as "Database"
User->>UI : Open Revision page
UI->>Store : Read enriched problems
UI-->>User : Show "Due now" and "Upcoming"
User->>UI : Click "Reviewed" on a problem
UI->>Store : Update revisionCount, lastRevised, nextRevision, status
UI->>Store : Increment today's activity
UI->>Sync : Debounced save of {progress, notes, solutions, activity, settings}
Sync->>DB : Upsert JSONB state
DB-->>Sync : Ack saved
Sync-->>UI : Sync status updated
```

**Diagram sources**
- [main.jsx:247-248](file://src/main.jsx#L247-L248)
- [main.jsx:100-113](file://src/main.jsx#L100-L113)
- [state.js:23-50](file://api/state.js#L23-L50)

## Detailed Component Analysis

### Spaced Repetition Algorithm
- Intervals: The system uses a fixed array of day intervals: 1, 3, 7, 14, 30.
- Next revision computation: After a review, the next revision date is computed by adding the current interval based on the current revision count. If the count exceeds the number of intervals, the last interval is used.
- Status promotion: When marking a problem as reviewed, if its status was Attempted, it advances to Solved.

```mermaid
flowchart TD
Start(["Review completed"]) --> GetCount["Get current revisionCount"]
GetCount --> PickStep["Pick step = intervals[min(revisionCount, length-1)]"]
PickStep --> UpdateFields["Update fields:<br/>revisionCount + 1,<br/>lastRevised = now,<br/>nextRevision = now + step"]
UpdateFields --> CheckStatus{"Was status Attempted?"}
CheckStatus --> |Yes| Promote["Set status to Solved"]
CheckStatus --> |No| KeepStatus["Keep existing status"]
Promote --> RecordActivity["Increment today's activity"]
KeepStatus --> RecordActivity
RecordActivity --> End(["Done"])
```

**Diagram sources**
- [main.jsx:12-12](file://src/main.jsx#L12-L12)
- [main.jsx:247-248](file://src/main.jsx#L247-L248)

**Section sources**
- [main.jsx:12-12](file://src/main.jsx#L12-L12)
- [main.jsx:247-248](file://src/main.jsx#L247-L248)

### Due Calculation Logic
- A problem is considered due if it has a next revision date and that date is less than or equal to the current time.
- Due list sorting: Problems are sorted by next revision date ascending so the most overdue appear first.

```mermaid
flowchart TD
A["For each problem"] --> B{"Has nextRevision?"}
B --> |No| Skip["Skip"]
B --> |Yes| C{"nextRevision <= now?"}
C --> |Yes| Due["Add to due list"]
C --> |No| Future["Add to upcoming list"]
Due --> Sort["Sort due by nextRevision asc"]
Future --> Slice["Limit upcoming to top N"]
Sort --> End(["Render queues"])
Slice --> End
```

**Diagram sources**
- [main.jsx:247-248](file://src/main.jsx#L247-L248)

**Section sources**
- [main.jsx:247-248](file://src/main.jsx#L247-L248)

### Revision Queue Management
- Due now: Displays all problems whose next revision is due or overdue, sorted by earliest due date. Each row shows title, topic, and the upcoming revision number.
- Upcoming: Displays the next ten scheduled revisions, sorted by soonest first, showing the scheduled date and days until due.

```mermaid
classDiagram
class RevisionComponent {
+problems : Problem[]
+open(p) void
+update(id, patch) void
+recordActivity() void
-due : Problem[]
-upcoming : Problem[]
}
class Problem {
+id : string
+title : string
+topic : string
+status : string
+revisionCount : number
+lastRevised : string
+nextRevision : string
}
RevisionComponent --> Problem : "filters & sorts"
```

**Diagram sources**
- [main.jsx:247-248](file://src/main.jsx#L247-L248)

**Section sources**
- [main.jsx:247-248](file://src/main.jsx#L247-L248)

### Update Function and Status Progression
- The central update function patches a problem’s progress entry with provided fields.
- When marking a problem as reviewed:
  - Increments revisionCount.
  - Sets lastRevised to the current timestamp.
  - Computes nextRevision using the current interval.
  - Promotes status from Attempted to Solved if applicable.
  - Records activity for the current day.
- Manual scheduling: Users can reschedule a revision from the problem view, which updates nextRevision, lastRevised, and revisionCount accordingly.

```mermaid
sequenceDiagram
participant UI as "Problem/Revision UI"
participant Store as "Progress Store"
participant Activity as "Activity Store"
UI->>Store : update(problemId, { status?, nextRevision, lastRevised, revisionCount, attempts, favorite, confidence })
Store-->>UI : New state reflected
UI->>Activity : recordActivity()
Activity-->>UI : Today's count incremented
```

**Diagram sources**
- [main.jsx:140-141](file://src/main.jsx#L140-L141)
- [main.jsx:247-248](file://src/main.jsx#L247-L248)
- [main.jsx:442-455](file://src/main.jsx#L442-L455)
- [main.jsx:476-480](file://src/main.jsx#L476-L480)

**Section sources**
- [main.jsx:140-141](file://src/main.jsx#L140-L141)
- [main.jsx:247-248](file://src/main.jsx#L247-L248)
- [main.jsx:442-455](file://src/main.jsx#L442-L455)
- [main.jsx:476-480](file://src/main.jsx#L476-L480)

### Visual Design: Due vs Upcoming Sections
- Due section:
  - Header indicates the number of revisions due.
  - Each item includes a status indicator, title, topic, and the next revision number.
  - A “Reviewed” action button advances the revision and records activity.
- Upcoming section:
  - Shows the next scheduled revisions with their dates and days remaining.
  - Clicking an item opens the problem detail view.

```mermaid
flowchart LR
Due["Due now panel"] --> Row["Row: Title, Topic, Revision #"]
Row --> Action["Action: Reviewed"]
Action --> Update["Update state & schedule"]
Upcoming["Upcoming panel"] --> Item["Item: Title, Date, Days left"]
Item --> Open["Open problem detail"]
```

**Diagram sources**
- [main.jsx:247-248](file://src/main.jsx#L247-L248)

**Section sources**
- [main.jsx:247-248](file://src/main.jsx#L247-L248)

### Integration with Overall Learning Workflow
- Dashboard highlights due revisions and suggests continuing the roadmap.
- Analytics surfaces due counts and activity trends to guide focus.
- Problem detail view supports scheduling revisions manually and displays the “Revision ladder” to visualize progress through intervals.

```mermaid
graph TB
Dashboard["Dashboard"] --> DuePanel["Due panel"]
Roadmap["Roadmap"] --> ProblemDetail["Problem detail"]
ProblemDetail --> Schedule["Schedule revision"]
RevisionPage["Revision page"] --> DueList["Due list"]
DueList --> Review["Mark Reviewed"]
Review --> Analytics["Analytics"]
Analytics --> Dashboard
```

**Diagram sources**
- [main.jsx:175-185](file://src/main.jsx#L175-L185)
- [main.jsx:247-248](file://src/main.jsx#L247-L248)
- [main.jsx:476-480](file://src/main.jsx#L476-L480)
- [main.jsx:578-582](file://src/main.jsx#L578-L582)

**Section sources**
- [main.jsx:175-185](file://src/main.jsx#L175-L185)
- [main.jsx:247-248](file://src/main.jsx#L247-L248)
- [main.jsx:476-480](file://src/main.jsx#L476-L480)
- [main.jsx:578-582](file://src/main.jsx#L578-L582)

## Dependency Analysis
- UI depends on:
  - Local state hooks for progress, notes, solutions, activity, and settings.
  - Derived computations for stats, filtering, and grouping.
  - Cloud sync API for optional persistence.
- Cloud API depends on:
  - Session validation.
  - Database connection and schema creation.
  - Sanitization of incoming state.

```mermaid
graph TB
App["App component<br/>src/main.jsx"] --> Hooks["useLocalState hooks"]
App --> Stats["Derived stats & filters"]
App --> Cloud["/api/state<br/>api/state.js"]
Cloud --> DB["Neon Postgres"]
```

**Diagram sources**
- [main.jsx:29-33](file://src/main.jsx#L29-L33)
- [main.jsx:116-126](file://src/main.jsx#L116-L126)
- [state.js:23-50](file://api/state.js#L23-L50)

**Section sources**
- [main.jsx:29-33](file://src/main.jsx#L29-L33)
- [main.jsx:116-126](file://src/main.jsx#L116-L126)
- [state.js:23-50](file://api/state.js#L23-L50)

## Performance Considerations
- Filtering and sorting are performed on in-memory arrays derived from enriched problems; this is efficient for typical problem set sizes.
- Debounced cloud saves reduce network overhead during frequent edits.
- Upcoming list is capped to a small number to keep rendering lightweight.
- Local-first storage avoids unnecessary remote calls when offline.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- No revisions due: Ensure problems have been marked Attempted or higher and that a next revision date has been scheduled.
- Revisions not advancing: Confirm that the “Reviewed” action is triggered and that the update function applies changes to progress and activity.
- Cloud sync issues: Verify authentication and environment configuration; check sync status indicators and error messages.

**Section sources**
- [main.jsx:247-248](file://src/main.jsx#L247-L248)
- [main.jsx:100-113](file://src/main.jsx#L100-L113)
- [state.js:23-50](file://api/state.js#L23-L50)

## Conclusion
The revision system implements a simple yet effective spaced repetition schedule using fixed intervals. It clearly separates due and upcoming items, streamlines the review workflow, and integrates tightly with activity tracking and analytics. The centralized update function ensures consistent state transitions, while optional cloud sync preserves progress across devices. Together, these features support a focused, sustainable learning loop aligned with mastery goals.