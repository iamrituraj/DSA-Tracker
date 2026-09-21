---
kind: frontend_style
name: Plain CSS with CSS Variables and Dark Theme in a Vite + React SPA
category: frontend_style
scope:
    - '**'
source_files:
    - src/styles.css
    - index.html
    - package.json
---

## What system/approach is used

The DSA Tracker MVP uses **plain CSS** (no CSS-in-JS, no SCSS/Sass, no Tailwind, no component library) authored as a single stylesheet at `src/styles.css`, imported by the Vite + React application. Styling is driven by:
- A global `:root` block declaring design tokens (font stack, colors, background).
- A `.theme-dark` class that overrides those tokens to provide a dark mode.
- Responsive breakpoints via `@media` queries for tablet and mobile layouts.

There are no build-time style tools beyond Vite’s default CSS handling; the project has no `tailwind.config.*`, no PostCSS plugins, and no UI kit dependencies — only `react`, `react-dom`, `lucide-react` (for icons), and Vite.

## Key files and packages

- `src/styles.css` — the entire stylesheet (~15 lines of source but heavily minified/concatenated into one block). Contains all layout, component, and theme rules.
- `index.html` — minimal HTML shell that mounts the React app into `#root` and loads `/src/main.jsx`; no inline styles or third-party CSS links.
- `package.json` — confirms no styling frameworks or preprocessors are declared as dependencies.
- `src/main.jsx` — entry point that renders the React tree (styles are consumed through the CSS file).

## Architecture and conventions

### Design tokens
All visual tokens live in `:root`:
- Font family: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Color palette centered around a slate/blue-gray scale (`#172033`, `#101827`, `#dbe4f2`, `#aeb9cb`, `#7b879a`, `#cbd2dc`, `#e1e5ec`, `#f6f7fb`).
- Backgrounds: light `#f6f7fb`, dark `#0b1220`.
- Semantic color usage: green (`#2e8b62`) for solved/mastered, amber (`#c58a26`) for attempted, red (`#b33a45`) for hard/danger, purple (`#6d57a8`, `#f4f2ff`) for challenges/notes.

### Layout model
- Fixed left sidebar (`aside`, 248px wide, `position: fixed`) containing brand, navigation, and footer.
- Main content area (`main`) offset by `margin-left: 248px` and `width: calc(100% - 248px)`.
- Grid-based card layouts using `display: grid` with `gap` (cards, stats, pattern grids, complexity rows, activity charts).
- Flexbox for row-level components (problem rows, hero, actions, metadata).

### Component-style classes
Styles use descriptive BEM-like class names rather than a strict methodology:
- Structural: `.app`, `.sidebar-foot`, `.panel`, `.card`, `.pattern-card`, `.pattern-block`, `.hero`, `.filters`, `.stats-large`, `.detail-grid`, `.revision-columns`.
- Interactive: `.status-btn`, `.fav`, `.primary`, `.text-btn`, `.toggle`, `.problem-tabs button`, `.language-switch button`, `.copy-code`, `.back`, `.icon-danger`.
- Data display: `.problem-row`, `.revision-row`, `.upcoming`, `.approach-card`, `.note-view`, `.code-view`, `.activity-bar-wrap`, `.metadata span`, `.mini-stats span`.
- Status indicators: `.status-dot.solved/.mastered/.attempted/.not-started`, `.easy/.medium/.hard`, `.done/.todo/.weak` dots.

### Dark theme
A `.theme-dark` class on the root element toggles the entire palette by redefining backgrounds, borders, text colors, and accent states for every major surface (panels, cards, inputs, buttons, tabs, code blocks, callouts). The dark theme also adjusts interactive states (active tabs/buttons invert to light-on-dark).

### Responsive strategy
Three breakpoints are used:
- `max-width: 1050px` — collapses filter grid and revision columns to fewer columns.
- `max-width: 900px` — collapses sidebar to a thin icon-only strip (70px), hides brand text and nav labels, switches multi-column grids to two columns, stacks header/search.
- `max-width: 700px` — transforms aside into a horizontal top bar, removes main margin, collapses grids to single column, wraps action buttons, reduces spacing and font sizes.

### Code and notes panels
- `.code-view` and `.note-view` share a bordered panel look; `.code-view` additionally uses a monospace font stack (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) with a dark terminal-like background (`#020617`) and light text (`#e2e8f0`).
- Textareas in `.note-field` and `.panel` have consistent border, focus ring (`box-shadow: 0 0 0 3px #e8eef8`), and placeholder styling.

## Conventions and constraints

- **No CSS framework or preprocessor**: All styling is vanilla CSS in a single file; there is no Tailwind config, Sass, Less, or CSS-in-JS runtime.
- **Tokens centralized in `:root`**: Colors, fonts, and backgrounds are defined once at the root level and reused throughout the stylesheet.
- **Dark mode via class toggle**: The `.theme-dark` modifier class is the sole mechanism for switching themes; components do not define their own media-query-based dark styles.
- **Grid-first responsive layout**: Multi-column surfaces (`.cards`, `.grid2`, `.pattern-grid`, `.stats-large`, `.detail-grid`, `.meta-grid`) progressively collapse from 4 → 2 → 1 columns across breakpoints.
- **Sidebar-driven page shell**: Every page assumes the `.app` + `aside` + `main` structure; the main area’s width is computed relative to the sidebar width.
- **Consistent interaction affordances**: Buttons, selects, and inputs share border radius (`8–14px`), padding, and a unified border color (`#dce1e9` / `#dfe4eb`); active/focus states use either background inversion or a subtle box-shadow ring.
- **Status semantics are class-based**: Problem/topic status is expressed via modifier classes (`.solved`, `.mastered`, `.attempted`, `.not-started`, `.easy`, `.medium`, `.hard`, `.done`, `.todo`, `.weak`) rather than inline styles or data attributes driving CSS.