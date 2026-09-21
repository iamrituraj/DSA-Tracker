---
kind: dependency_management
name: npm-based Dependency Management with Lockfile and Latest Tags
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
---

## System/Approach

This repository uses **npm** as its package manager for a Node.js / Vite + React single-page application. Dependencies are declared in `package.json` and resolved from the public npm registry (`https://registry.npmjs.org`). A `package-lock.json` (lockfileVersion 3) is committed to pin every transitive dependency, ensuring reproducible installs across environments.

There is no vendoring of third-party packages — `node_modules/` is present but empty in this snapshot, indicating dependencies are installed on demand by `npm install`. No private registries, `.npmrc`, proxy configuration, or scoped private packages were found anywhere in the repo.

## Key Files

- `package.json` — declares the project name (`dsa-tracker`), version (`1.0.0`), marks it as `private: true`, defines scripts (`dev`, `build`, `preview`, `prepare-data`, `extract-tuf-links`), and lists runtime dependencies only (no `devDependencies` block).
- `package-lock.json` — lockfile that pins exact versions and integrity hashes for all direct and transitive dependencies; sourced entirely from `registry.npmjs.org`.
- `scripts/*.mjs` — Node ESM scripts (`prepare-data.mjs`, `extract-tuf-links.mjs`, `java-to-csharp.mjs`) executed via `node` using only built-in modules; they do not import any third-party packages.
- `api/_session.js`, `api/auth.js`, `api/state.js` — serverless API handlers that depend only on `@neondatabase/serverless` (a Neon PostgreSQL client); no other external imports.

## Architecture and Conventions

- **Single dependency surface**: The entire app depends on six top-level packages: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `lucide-react`, and `@neondatabase/serverless`. There are no build-tool plugins beyond Vite's React plugin, no linting/formatting toolchain, and no testing framework declared.
- **Latest-tag usage**: Most dependencies are pinned to the literal string `latest` (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `lucide-react`). Only `@neondatabase/serverless` uses a caret range (`^1.1.0`). This means `npm install` will resolve to whatever the latest published version is at install time, while `package-lock.json` captures the exact resolved versions for reproducibility.
- **No devDependencies**: Linting, formatting, testing, and type-checking tools are not managed through npm; if used, they must be installed globally or via another mechanism not reflected in the manifest.
- **Node engine requirement**: `@neondatabase/serverless` requires `node >= 19.0.0`; several transitive deps (e.g., `@rolldown/binding-darwin-arm64`, `vite`) require `node ^20.19.0 || >=22.12.0`. The project does not declare an `engines` field in `package.json`, so enforcement relies on the individual packages' own requirements.
- **Scripts as entry points**: All tooling is invoked via npm scripts rather than CLI flags, centralizing how the project is built (`vite build`), developed (`vite`), previewed (`vite preview`), and data-prepped (`node scripts/prepare-data.mjs`, `node scripts/extract-tuf-links.mjs`).

## Conventions and Constraints

- **Lockfile is authoritative**: `package-lock.json` is committed and should be kept in sync with `package.json`; it records exact tarball URLs, SHA integrity hashes, and platform-specific optional dependencies (e.g., `fsevents` for macOS, native `lightningcss` binaries). Any change to `package.json` should be followed by `npm install` to regenerate the lockfile.
- **Public npm registry only**: All `resolved` entries point to `https://registry.npmjs.org`; there is no evidence of a private registry, mirror, or scoped package authentication.
- **No peerDependency conflicts declared**: The project does not explicitly manage peer dependencies; compatibility between `react`, `react-dom`, `vite`, and `@vitejs/plugin-react` is left to npm's resolution and the packages' own constraints.
- **No dependency update policy documented**: There is no automated bot (Dependabot, Renovate) configuration visible in the repo root, nor any documentation file describing update cadence. Given the heavy use of `latest`, updates are effectively manual — triggered by running `npm update` and committing the resulting `package-lock.json` changes.