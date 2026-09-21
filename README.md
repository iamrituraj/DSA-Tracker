# DSA Tracker

A local-first React/Vite tracker for the Striver A2Z DSA Sheet.

## Dataset

Problem data ships with the repo in `public/data/problems.json`. There are **no remote fetch steps** — `npm run dev` and `npm run build` work fully offline.

Basic theory / language-intro items are excluded. The curated sheet focuses on practice problems across sorting, arrays, graphs, DP, and the rest of A2Z.

To rebuild the curated list from `data/problems.raw.json` (still offline):

```bash
npm run prepare-data
```

Problem data stays bundled with the app. Progress, notes, revisions, favorites, activity, saved solutions, and settings are kept locally until Cloud sync is connected.

Problems are grouped by TakeUForward A2Z **topics** and official **subcategory patterns** (e.g. Graphs → BFS/DFS, Topo Sort, Shortest Path, MST).

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

## Deploy to Vercel with Neon cloud sync

Cloud sync is intentionally designed for **one user**. It uses one app password, stored only as a Vercel secret, and an HTTP-only session cookie. Do not share that password.

1. In Vercel, open your project, then **Storage → Browse Marketplace → Neon**. Create or connect a Neon Postgres database. The integration normally injects `DATABASE_URL`; if it does not, add the Neon pooled connection string manually as `DATABASE_URL`.
2. In **Project Settings → Environment Variables**, add these secrets for Production, Preview, and Development:

   ```text
   DATABASE_URL=<the Neon connection string>
   APP_ACCESS_PASSWORD=<a strong password you will enter in Settings on each device>
   SESSION_SECRET=<a random 32+ character value>
   ```

   `DATABASE_URL`, `APP_ACCESS_PASSWORD`, and `SESSION_SECRET` must not start with `VITE_`; they are server-only secrets. For `SESSION_SECRET`, generate a value with `openssl rand -base64 32`.
3. Push this project and deploy it as a Vite project. The root `api/` directory is deployed automatically as Vercel Functions.
4. On your first device, open **Settings → Cloud sync**, enter `APP_ACCESS_PASSWORD`, and connect. Existing browser data becomes the initial Neon record. On another device, connect with the same password to load and continue using that record.

For local testing of the API routes, use `vercel dev` after linking the project; plain `npm run dev` serves the Vite interface but not Vercel Functions.

The tracker saves after changes with a short delay. If you actively edit two devices at once, the last completed save wins.

## Backup

Use Settings → Export to keep an additional backup before clearing browser data or moving devices.
