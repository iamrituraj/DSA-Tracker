---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### DSA Tracker
- Definition：A local-first React/Vite tracker for the Striver A2Z DSA Sheet that stores progress, notes, revisions, favorites, activity, saved solutions, and settings in browser storage until Cloud sync is connected. It groups problems by TakeUForward A2Z topics and official subcategory patterns (Graphs → BFS/DFS, Topo Sort, Shortest Path, MST).
- Aliases：DSA Tracker MVP、Striver A2Z Tracker

### Cloud sync
- Definition：Optional one-user synchronization of the local tracker state to a Neon Postgres database via a password-protected HTTP-only session cookie. On first device connect, existing browser data becomes the initial cloud record; on another device, connecting loads and continues using that cloud record. The design is last-write-wins with no conflict resolution.
- Aliases：cloud sync、sync

### TakeUForward A2Z topics
- Definition：The topic taxonomy used to group problems in the tracker, sourced from the TakeUForward A2Z DSA sheet. Problems are organized under these topics (e.g., Graphs → BFS/DFS, Topo Sort, Shortest Path, MST) rather than arbitrary categories.
- Aliases：A2Z topics、TakeUForward topics

### subcategory patterns
- Definition：Official problem subcategories within each A2Z topic (e.g., under Graphs: BFS/DFS, Topo Sort, Shortest Path, MST) used by the tracker to infer and display the pattern associated with each problem.
- Aliases：patterns、sub-patterns

### Revision ladder
- Definition：The fixed spaced-repetition schedule applied to problems: intervals of 1, 3, 7, 14, and 30 days after marking a problem solved, used to surface due revisions in the Revision tab.
- Aliases：revision intervals、spaced repetition
