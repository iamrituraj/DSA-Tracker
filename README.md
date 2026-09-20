# DSA Tracker

A local-first React/Vite tracker for the Striver A2Z DSA Sheet.

## Dataset

Problem data ships with the repo in `public/data/problems.json`. There are **no remote fetch steps** — `npm run dev` and `npm run build` work fully offline.

Basic theory / language-intro items are excluded. The curated sheet focuses on practice problems across sorting, arrays, graphs, DP, and the rest of A2Z.

To rebuild the curated list from `data/problems.raw.json` (still offline):

```bash
npm run prepare-data
```

Progress, notes, revisions, favorites, and activity stay in browser localStorage. No login or backend is required.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

Push the repository to GitHub and import it into Vercel. Use the default Vite settings. No network is required during the build for problem data.

## Backup

Use Settings → Export to save your personal progress before clearing browser data or moving devices.
