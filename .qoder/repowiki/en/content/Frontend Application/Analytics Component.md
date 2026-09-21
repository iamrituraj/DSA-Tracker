# Analytics Component

<cite>
**Referenced Files in This Document**
- [main.jsx](file://src/main.jsx)
- [problems.json](file://public/data/problems.json)
- [topics.json](file://public/data/topics.json)
- [README.md](file://README.md)
</cite>

## Update Summary
**Changes Made**
- Updated weak problems display to show all weak problems instead of limiting to 4
- Enhanced dynamic subtitle text to reflect actual weak problem count
- Added documentation for new viewWeak() function for quick navigation to weak problems
- Updated dashboard component behavior and user interaction patterns

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
This document explains the Analytics component that provides performance insights and learning metrics for the DSA Tracker. It covers how completion rates, mastery levels, confidence distribution, and topic-wise analysis are computed; how the 14-day activity chart, yearly heatmap, status breakdown charts, difficulty completion tracking, and weakest/strongest topic identification are rendered; and how data aggregation, chart rendering patterns, and actionable insights guide focused learning. It also documents the analytics note system and recommendations embedded in the interface.

**Updated** Enhanced weak problems display now shows all weak problems without limitation, providing comprehensive visibility into areas needing improvement.

## Project Structure
The Analytics feature is implemented as a single-page React application with all logic in one file. The app loads problem metadata from bundled JSON files and computes analytics on the client side using local state (progress, notes, solutions, activity). Cloud sync is optional and does not change the core analytics logic.

```mermaid
graph TB
UI["Analytics Page<br/>renders stats and charts"] --> Data["Local State<br/>progress, notes, solutions, activity"]
Data --> Agg["Aggregation Logic<br/>status, confidence, topics, difficulty"]
Agg --> Charts["Charts & Panels<br/>14-day activity, yearly heatmap,<br/>status/confidence/difficulty/topic bars"]
Data --> Notes["Notes & Solutions Coverage<br/>counters used in secondary stats"]
Problems["Problems JSON<br/>topic, pattern, difficulty"] --> Agg
Topics["Topics JSON<br/>topic list"] --> UI
```

**Diagram sources**
- [main.jsx:398-547](file://src/main.jsx#L398-L547)
- [main.jsx:549-567](file://src/main.jsx#L549-L567)
- [problems.json:1-200](file://public/data/problems.json#L1-L200)
- [topics.json:1-20](file://public/data/topics.json#L1-L20)

**Section sources**
- [README.md:1-20](file://README.md#L1-L20)
- [main.jsx:135-292](file://src/main.jsx#L135-L292)

## Core Components
- Analytics page: Computes and displays key metrics, charts, and recommendations.
- Activity heatmap: Yearly view of daily activity intensity using GitHub-style contribution graph.
- Dashboard component: Enhanced weak problems display showing all weak problems with dynamic subtitles.
- Supporting helpers: Date utilities, day-key generation, and activity recording.

Key responsibilities:
- Aggregate per-problem status, confidence, topic, and difficulty into summary statistics.
- Build a 14-day activity timeline and a yearly heatmap with color-coded intensity levels.
- Identify weakest and strongest topics to guide focus.
- Surface notes and solutions coverage to encourage high-signal review.
- Provide quick navigation to weak problems via viewWeak() function.

**Updated** The Dashboard component now displays all weak problems without limitation and includes dynamic subtitle text reflecting the actual count of weak problems.

**Section sources**
- [main.jsx:398-547](file://src/main.jsx#L398-L547)
- [main.jsx:549-567](file://src/main.jsx#L549-L567)
- [main.jsx:294-305](file://src/main.jsx#L294-L305)

## Architecture Overview
The Analytics component reads enriched problems (merged with progress), then aggregates across multiple dimensions. It renders:
- Top-level stats: completion percentage, mastered count, attempted count, streak.
- Secondary stats: notes coverage, solutions written, revisions due, total attempts.
- Visualizations: 14-day activity bars, yearly heatmap with GitHub-style contribution graph, status and confidence breakdowns, difficulty completion, topic progress, weakest/strongest topics.
- Enhanced dashboard with unlimited weak problems display and dynamic subtitles.

```mermaid
sequenceDiagram
participant User as "User"
participant App as "App State"
participant Dashboard as "Dashboard Component"
participant Analytics as "Analytics Component"
participant Heatmap as "ActivityHeatmap"
participant Data as "Local Storage / Cloud"
User->>App : Open Dashboard or Analytics page
App->>Data : Read progress, notes, solutions, activity
App-->>Dashboard : Pass enriched problems + weak problems
App-->>Analytics : Pass enriched problems + activity
Dashboard->>Dashboard : Display all weak problems<br/>with dynamic subtitle
Analytics->>Analytics : Compute aggregations<br/>status, confidence, topics, difficulty
Analytics->>Analytics : Build 14-day activity array
Analytics->>Heatmap : Generate yearly heatmap<br/>with h0-h3 intensity levels
Analytics-->>User : Render charts and panels
```

**Diagram sources**
- [main.jsx:135-292](file://src/main.jsx#L135-L292)
- [main.jsx:294-305](file://src/main.jsx#L294-L305)
- [main.jsx:398-547](file://src/main.jsx#L398-L547)
- [main.jsx:549-567](file://src/main.jsx#L549-L567)

## Detailed Component Analysis

### Statistical Calculations
- Completion rate: Percentage of solved or mastered problems out of total problems.
- Mastery level: Count of problems marked Mastered.
- Confidence distribution: Counts per confidence category including Unset.
- Topic-wise analysis: For each topic, counts total, solved, attempted, weak, and derived completion percentage.
- Difficulty completion: For Easy/Medium/Hard, counts total and solved, with percentage.
- Activity streak: Consecutive active days ending at today or yesterday if today has no activity.
- Notes and solutions coverage: Number of problems with any filled note fields; number of problems with at least one approach containing explanation or code; total filled approaches.

These calculations are performed in a single pass over the problems array to minimize overhead.

**Section sources**
- [main.jsx:219-230](file://src/main.jsx#L219-L230)
- [main.jsx:398-424](file://src/main.jsx#L398-L424)

### Dashboard Weak Problems Enhancement
- **Unlimited Display**: All weak problems are now displayed without the previous limit of 4 problems.
- **Dynamic Subtitle**: The subtitle text dynamically reflects the actual count of weak problems (e.g., "3 marked weak — clear these before learning more.").
- **Quick Navigation**: The viewWeak() function provides instant access to a filtered roadmap showing only weak problems.
- **Scrollable Interface**: Weak problems are wrapped in a scrollable container for better UX when there are many weak problems.

```mermaid
flowchart TD
Start(["Dashboard Load"]) --> Filter["Filter problems by confidence === '🔴 Weak'"]
Filter --> Display["Display ALL weak problems<br/>without limit"]
Display --> Subtitle["Generate dynamic subtitle<br/>with actual count"]
Subtitle --> Action["View All button triggers<br/>viewWeak() function"]
Action --> Navigate["Navigate to roadmap with<br/>confidence filter applied"]
```

**Diagram sources**
- [main.jsx:294-305](file://src/main.jsx#L294-L305)
- [main.jsx:260-260](file://src/main.jsx#L260-L260)

**Section sources**
- [main.jsx:294-305](file://src/main.jsx#L294-L305)
- [main.jsx:260-260](file://src/main.jsx#L260-L260)

### 14-Day Activity Chart
- Builds an array of the last 14 days, keyed by date string.
- Each entry includes label (weekday short) and count from activity storage.
- Bar height is normalized against the maximum daily count to fit the chart.

```mermaid
flowchart TD
Start(["Start"]) --> Init["Initialize last14 array"]
Init --> Loop{"For i = 13 down to 0"}
Loop --> |Yes| DayCalc["Compute date for today - i"]
DayCalc --> Key["Create day key"]
Key --> Fetch["Read activity[key] or 0"]
Fetch --> Push["Push {key, label, count}"]
Push --> Loop
Loop --> |No| MaxAct["Compute max(count)"]
MaxAct --> Render["Render bars with height proportional to max"]
Render --> End(["End"])
```

**Diagram sources**
- [main.jsx:428-434](file://src/main.jsx#L428-L434)
- [main.jsx:491-501](file://src/main.jsx#L491-L501)

**Section sources**
- [main.jsx:428-434](file://src/main.jsx#L428-L434)
- [main.jsx:491-501](file://src/main.jsx#L491-L501)

### Yearly Activity Heatmap
- Generates a 365+ day grid starting from the most recent Sunday back to roughly a year ago.
- Each cell represents one day's activity; color intensity encodes count ranges using h0-h3 classes.
- Hover tooltips show day and activity count with proper pluralization.
- Uses GitHub-style contribution graph layout with scrollable container.

**Updated** The heatmap now provides comprehensive year-long activity tracking with four intensity levels:
- h0: No activity (0 activities)
- h1: Low activity (1-2 activities)  
- h2: Medium activity (3-5 activities)
- h3: High activity (6+ activities)

```mermaid
flowchart TD
HStart(["Start"]) --> GenDays["Generate daily keys for ~365 days"]
GenDays --> MapCounts["Map activity[key] to cells"]
MapCounts --> Level["Assign level class:<br/>h0 (0), h1 (1-2),<br/>h2 (3-5), h3 (6+)"]
Level --> RenderHeatmap["Render heatmap grid<br/>with hover tooltips"]
RenderHeatmap --> HEnd(["End"])
```

**Diagram sources**
- [main.jsx:549-567](file://src/main.jsx#L549-L567)

**Section sources**
- [main.jsx:549-567](file://src/main.jsx#L549-L567)

### Status Breakdown Charts
- Counts per status: Not Started, Attempted, Solved, Mastered.
- Horizontal bars show proportion relative to total problems.

**Section sources**
- [main.jsx:399-407](file://src/main.jsx#L399-L407)
- [main.jsx:504-509](file://src/main.jsx#L504-L509)

### Confidence Distribution
- Counts per confidence category: Weak, Learning, Strong, Interview Ready, plus Unset.
- Only categories with non-zero counts are displayed.

**Section sources**
- [main.jsx:400-407](file://src/main.jsx#L400-L407)
- [main.jsx:510-515](file://src/main.jsx#L510-L515)

### Difficulty Completion Tracking
- Tracks totals and solved counts per difficulty level (Easy, Medium, Hard).
- Displays completed/total and bar width based on percentage.

**Section sources**
- [main.jsx:402-416](file://src/main.jsx#L402-L416)
- [main.jsx:518-523](file://src/main.jsx#L518-L523)

### Weakest and Strongest Topic Identification
- Topic rows include total, solved, attempted, weak, and computed completion percentage.
- Weakest topics: lowest completion percentages among topics with at least one problem.
- Strongest topics: highest completion percentages.

```mermaid
flowchart TD
A["Aggregate per topic:<br/>t, s, a, weak"] --> B["Compute pct = s/t * 100"]
B --> C["Sort by pct ascending for weakest"]
B --> D["Sort by pct descending for strongest"]
C --> E["Display top 5 weakest"]
D --> F["Display top 5 strongest"]
```

**Diagram sources**
- [main.jsx:425-427](file://src/main.jsx#L425-L427)
- [main.jsx:524-543](file://src/main.jsx#L524-L543)

**Section sources**
- [main.jsx:425-427](file://src/main.jsx#L425-L427)
- [main.jsx:524-543](file://src/main.jsx#L524-L543)

### Data Aggregation Logic
- Single-pass aggregation over problems to compute:
  - Status counts
  - Confidence counts
  - Per-topic metrics (total, solved, attempted, weak)
  - Per-difficulty metrics (total, solved)
  - Notes coverage (any field filled)
  - Solutions coverage (approaches with explanation or code)
- Derived values:
  - Topic completion percentage
  - Weakest/strongest topic lists
  - 14-day activity series
  - Streak calculation
  - Yearly heatmap data generation

Complexity: O(N) where N is the number of problems; constant-time operations per problem.

**Updated** Enhanced to include yearly heatmap data generation alongside existing aggregation logic.

**Section sources**
- [main.jsx:398-424](file://src/main.jsx#L398-L424)
- [main.jsx:219-230](file://src/main.jsx#L219-L230)

### Chart Rendering Patterns
- All charts use simple HTML/CSS-based bars and grids without external chart libraries.
- Bars are styled via inline width/height percentages computed from aggregated data.
- Heatmap uses CSS classes mapped from activity counts to indicate intensity (h0-h3).
- Yearly heatmap implements GitHub-style contribution graph layout with responsive scrolling.
- Dashboard weak problems section uses scrollable container for unlimited problem display.

**Updated** Added comprehensive coverage of the new heatmap rendering pattern with color-coded intensity levels and enhanced dashboard weak problems display.

**Section sources**
- [main.jsx:491-543](file://src/main.jsx#L491-L543)
- [main.jsx:549-567](file://src/main.jsx#L549-L567)
- [main.jsx:294-305](file://src/main.jsx#L294-L305)

### Actionable Insights and Recommendations
- Focus next panel highlights weakest topics with completion percentage and weak problem counts.
- Strongest topics panel includes an analytics note recommending pairing weakest topics with revision due items and filling notes/solutions to keep review high-signal.
- Secondary stats surface notes coverage and solutions written to encourage deeper learning artifacts.
- Yearly heatmap helps users visualize consistency patterns and identify periods of low activity.
- **Enhanced**: Dashboard weak problems section now provides comprehensive visibility into all weak problems with dynamic context through subtitle text.

**Updated** Added guidance on using the enhanced weak problems display and yearly heatmap for comprehensive learning strategy.

**Section sources**
- [main.jsx:524-543](file://src/main.jsx#L524-L543)
- [main.jsx:294-305](file://src/main.jsx#L294-L305)

### Analytics Note System
- Notes coverage metric counts problems with any filled note field.
- The analytics note in the strongest topics panel provides guidance to integrate weakest topics with scheduled revisions and ensure notes/solutions are complete.
- Notes are stored per problem and persist locally or via cloud sync when enabled.

**Section sources**
- [main.jsx:417-423](file://src/main.jsx#L417-L423)
- [main.jsx:543-543](file://src/main.jsx#L543-L543)

### Quick Navigation Features
- **viewWeak() Function**: Provides instant navigation to roadmap filtered by weak problems only.
- **Dynamic Filtering**: Automatically sets filters to show only weak confidence problems.
- **Seamless Integration**: Works seamlessly with existing roadmap filtering and sorting capabilities.

**Updated** Added documentation for the new viewWeak() function that enhances user workflow for addressing weak areas.

**Section sources**
- [main.jsx:260-260](file://src/main.jsx#L260-L260)
- [main.jsx:282-282](file://src/main.jsx#L282-L282)

## Dependency Analysis
- Inputs:
  - Problems dataset: topic, pattern, difficulty, url, videoUrl.
  - Local state: progress (status, confidence, attempts, revision schedule), notes, solutions, activity.
  - Topics list: used for navigation and grouping elsewhere; analytics primarily uses problem topics.
- Outputs:
  - Aggregated metrics and visualizations rendered in the Analytics page.
  - Yearly heatmap with GitHub-style contribution graph visualization.
  - Enhanced dashboard with unlimited weak problems display.
  - No direct dependency on external charting libraries; pure DOM/CSS rendering.

**Updated** Added output specification for the yearly heatmap visualization and enhanced dashboard weak problems display.

```mermaid
graph LR
P["problems.json"] --> A["Analytics Aggregation"]
L["Local State<br/>progress, notes, solutions, activity"] --> A
T["topics.json"] --> UI["UI Context"]
A --> V["Visualizations<br/>bars, heatmap, yearly grid"]
A --> D["Dashboard<br/>weak problems display"]
V --> U["User Interface"]
D --> U
```

**Diagram sources**
- [problems.json:1-200](file://public/data/problems.json#L1-L200)
- [topics.json:1-20](file://public/data/topics.json#L1-L20)
- [main.jsx:398-567](file://src/main.jsx#L398-L567)
- [main.jsx:294-305](file://src/main.jsx#L294-L305)

**Section sources**
- [main.jsx:398-567](file://src/main.jsx#L398-L567)
- [main.jsx:294-305](file://src/main.jsx#L294-L305)

## Performance Considerations
- Aggregation runs once per render cycle using memoized inputs where applicable; complexity is linear in the number of problems.
- Avoids heavy computations by computing derived values (percentages, lists) in a single pass.
- Uses lightweight DOM/CSS charts to reduce runtime overhead compared to third-party chart libraries.
- Activity heatmap generates up to ~365 entries; still efficient for modern browsers.
- Yearly heatmap uses useMemo optimization to prevent unnecessary recalculations when activity data remains unchanged.
- **Enhanced**: Weak problems display now handles unlimited problem counts efficiently through scrollable containers rather than pagination.

**Updated** Added specific performance considerations for the enhanced weak problems display and yearly heatmap components.

## Troubleshooting Guide
- If charts appear empty:
  - Ensure problems are loaded and enriched with progress.
  - Verify activity storage contains keys for dates; missing keys default to zero.
- If streak appears incorrect:
  - Confirm activity keys exist for consecutive days; streak computation starts from today or yesterday depending on presence of activity.
- If notes/solutions coverage seems low:
  - Check that note fields or solution approaches contain trimmed content; empty strings do not count as filled.
- If yearly heatmap shows no data:
  - Verify activity storage contains properly formatted date keys (YYYY-MM-DD format).
  - Check that the heatmap component receives the activity prop correctly from the parent Analytics component.
- **Enhanced**: If weak problems display seems limited:
  - Verify that the weak problems section is displaying all problems with confidence set to "🔴 Weak".
  - Check that the dynamic subtitle text accurately reflects the count of weak problems.
  - Ensure the viewWeak() function is properly navigating to the filtered roadmap.

**Updated** Added troubleshooting guidance specifically for the enhanced weak problems display functionality.

**Section sources**
- [main.jsx:219-230](file://src/main.jsx#L219-L230)
- [main.jsx:417-423](file://src/main.jsx#L417-L423)
- [main.jsx:428-434](file://src/main.jsx#L428-L434)
- [main.jsx:549-567](file://src/main.jsx#L549-L567)
- [main.jsx:294-305](file://src/main.jsx#L294-L305)

## Conclusion
The Analytics component delivers a comprehensive, client-side view of learning progress through robust aggregation and clear visualizations. It computes completion rates, mastery levels, confidence distributions, and topic-wise insights, while highlighting weakest and strongest areas to guide focused study. The 14-day activity chart and new yearly heatmap provide temporal context for activity patterns, and embedded recommendations help users prioritize revisions and improve learning artifacts. 

**Enhanced** The dashboard now provides unlimited weak problems display with dynamic contextual information, making it easier for users to identify and address their areas of weakness comprehensively. The new viewWeak() function streamlines the workflow for focusing on weak areas by providing quick navigation to filtered views.

## Appendices

### Data Models and Fields Used by Analytics
- Problem fields: id, title, topic, pattern, difficulty, url, videoUrl.
- Progress fields: status, confidence, attempts, revisionCount, lastRevised, nextRevision, favorite.
- Notes fields: insight, mistake, approach, complexity, interviewCue.
- Solutions fields: approaches[] with explanation and code per language.
- Activity map: date key -> integer count.
- Heatmap intensity levels: h0 (0 activities), h1 (1-2 activities), h2 (3-5 activities), h3 (6+ activities).

**Updated** Added specifications for enhanced weak problems display functionality and viewWeak() navigation feature.

**Section sources**
- [problems.json:1-200](file://public/data/problems.json#L1-L200)
- [main.jsx:135-292](file://src/main.jsx#L135-L292)
- [main.jsx:398-424](file://src/main.jsx#L398-L424)
- [main.jsx:549-567](file://src/main.jsx#L549-L567)
- [main.jsx:294-305](file://src/main.jsx#L294-L305)
- [main.jsx:260-260](file://src/main.jsx#L260-L260)