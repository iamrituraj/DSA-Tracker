# DSA Tracker

A local-first React/Vite tracker for the Striver A2Z DSA Sheet.

## Dataset

The app refreshes the current A2Z dataset during `npm run dev` and `npm run build`. The build script downloads a structured 474-problem dataset and writes it to `public/data/problems.json`, so Vercel gets the complete roadmap automatically.

The app stores your progress, notes, revisions, favorites and activity in browser localStorage. No login or backend is required.

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

Push the repository to GitHub and import it into Vercel. Use the default Vite settings. The `prebuild` script refreshes the A2Z dataset before the production build.

## Backup

Use Settings → Export to save your personal progress before clearing browser data or moving devices.
