---
kind: build_system
name: Vite-based SPA Build with Node Data-Prep Scripts
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - scripts/prepare-data.mjs
    - scripts/extract-tuf-links.mjs
    - scripts/java-to-csharp.mjs
    - data/problems.raw.json
    - data/problems.json
    - data/topics.json
    - data/patterns.json
    - public/data/problems.json
    - public/data/topics.json
    - public/data/patterns.json
    - index.html
---

## Build System Overview

This repository is a **Vite + React single-page application** whose build system is defined entirely in `package.json`. There are no Makefiles, Dockerfiles, or CI pipelines present.

### Entry points and scripts

- `vite` (dev server) — `npm run dev`
- `vite build` — production bundle output to `dist/` — `npm run build`
- `vite preview` — local preview of the built assets — `npm run preview`
- `node scripts/prepare-data.mjs` — transforms raw problem data into curated JSON consumed by both the API (`data/`) and the frontend (`public/data/`) — `npm run prepare-data`
- `node scripts/extract-tuf-links.mjs` — extracts TakeUForward editorial links — `npm run extract-tuf-links`

The project has no `vite.config.*` file; all Vite configuration is implicit (React plugin via `@vitejs/plugin-react`, default HTML entry at `index.html`).

### Artifact layout

| Artifact | Produced by | Location |
|---|---|---|
| Frontend SPA bundle | `vite build` | `dist/` |
| Curated problems catalog | `scripts/prepare-data.mjs` | `data/problems.json` and `public/data/problems.json` |
| Topic taxonomy | `scripts/prepare-data.mjs` | `data/topics.json` and `public/data/topics.json` |
| Pattern-to-topic mapping | `scripts/prepare-data.mjs` | `data/patterns.json` and `public/data/patterns.json` |
| Raw source dataset | maintained manually | `data/problems.raw.json` |

### Data preparation pipeline

`scripts/prepare-data.mjs` is the central build-time transformation:
1. Reads `data/problems.raw.json` and validates it contains ≥ 100 entries.
2. Filters out theory/intro problems matched by title/topic heuristics (e.g. `learn the basics`, `cpp basics`, `theory with`, `pattern \d+`, `hard$`).
3. Normalizes topic names via regex shortening (e.g. `binary search trees` → `BST`, `dynamic programming` → `Dynamic Programming`).
4. Infers TakeUForward A2Z sub-patterns per problem using a large table of regex rules keyed by topic.
5. Writes each generated artifact to **both** `data/*` (API consumption) and `public/data/*` (static frontend consumption), creating parent directories recursively.
6. Emits a summary of unmatched patterns and per-topic pattern counts to stdout.

`scripts/java-to-csharp.mjs` transpiles Java DSA snippets to C# (code-generation helper).
`scripts/extract-tuf-links.mjs` pulls editorial URLs from the TakeUForward site.

### Runtime / deployment model

- The SPA is built to `dist/` and served as static files.
- The `api/` directory exposes serverless-style endpoints (`auth.js`, `state.js`, `_session.js`) that persist user state to Neon PostgreSQL via `@neondatabase/serverless`; these are not part of the Vite build and are deployed separately as serverless functions.
- No containerization, cross-compilation, or CI configuration exists in this repository.

### Conventions observed

- All build and data tasks are invoked through `npm run <script>`; there are no shell wrappers.
- Generated artifacts are committed alongside sources (the `data/*.json` outputs live next to their raw inputs), so downstream consumers read stable JSON rather than invoking the prep script at runtime.
- Each generated dataset is duplicated under `data/` and `public/data/` to serve both the API layer and the static frontend bundle.
- Versioning is pinned at `"version": "1.0.0"` in `package.json` with no automated bumping.