# CLAUDE.md

Fork-local working notes for agents. Upstream docs stay authoritative for the
app itself; this file covers what is different *here* and what is easy to get
wrong.

## What this repo is

A fork of `bilawalsidhu/gods-eye-view`. Vanilla ES modules + CesiumJS + Vite,
no framework. `main` is a clean mirror of `upstream/main` and is **never
developed on**; all work lands on `dev`.

Read before changing runtime behavior:

| Question | File |
|---|---|
| What does this fork carry, and why? | [docs/FORK-NOTES.md](docs/FORK-NOTES.md) |
| How does the app actually behave today? | [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md) |
| Architecture, style, PR rules | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Known broken things | [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) |

## Commands

```bash
npm test                 # unit gate — 2,819 passing, 0 failing on dev
npm run build            # must stay green
npm run test:track       # tracking invariants; needs the dev server up
node scripts/qa-*.mjs    # headless puppeteer harnesses, one per feature area
```

Node 24.14.x or 26.x only (enforced by `engines`). Two allocation
microbenchmarks **skip on Node 26** because their budgets are calibrated for
Node 24 — that is expected, not a failure.

Never start the dev server with Bash. Use the Browser pane: `preview_start`
with `{name: "gev"}`, which is `.claude/launch.json` → `localhost:4173`.

## Layout

- `src/data/<layer>.js` — one self-contained module per layer
  (`init/enable/disable/update/destroy/getStats`). Layer logic lives here.
- `src/ui.js` — panels, HUD, control facade. Keep UI and layer logic separate.
- `src/agent/` — typed multi-provider text agent (OpenAI / OpenRouter / Ollama),
  from upstream PR #51. `providers.js` is the registry.
- `src/voice/` — the OpenAI realtime path. Tools are declared server-side in
  `vite.config.js` (`GEV_REALTIME_TOOLS`), executed client-side in
  `gevActions.js`.
- `src/styles/` — GLSL post-process looks. `src/server/` — proxy allowlists.
- Tests sit next to their subject as `*.test.mjs`.

Secrets stay server-side, behind a Vite proxy in `vite.config.js`. The browser
sees only the (restricted) Google Maps key and ephemeral tokens. The CCTV proxy
fetches **registered** URLs only, never client-supplied ones.

## Fork-specific rules

- **Credentials have three regimes, not two:** Google key → photoreal direct
  with ion retry; ion token only → photoreal via ion; neither → keyless globe
  stacks, no crash. Do not reintroduce a hard throw. Both merge points carry a
  `MERGE NOTE (ours)` comment in `src/main.js`.
- **All six map stacks stay reachable.** The `free` remote deletes `photoreal`
  and the Bing entries when it adds the keyless ones; here they are appended.
  New stacks also need registering in `CABLE_GLOBE_STACK_IDS`.
- **Never hardcode "a value the system does not know about" in a fixture.**
  Derive it from the registry it must not collide with (see
  `layerState.test.mjs`, `sharelink.celestial.test.mjs`). Hardcoding it is a
  time bomb — the vocabulary grows and the assertion silently starts passing
  for the wrong reason. This bug class has already bitten twice.
- **A hidden browser verifies nothing that renders.** GEV pauses its render
  loop when `document.hidden`, so a backgrounded or headless tab never advances
  `frameNumber` past 0 and requests no tiles. That reads exactly like a broken
  imagery layer and is not one. Check in a focused window.
- **Silence is a failure mode here.** Cesium renders an empty imagery layer
  rather than raising on 404ing tiles. A passing suite does not prove a layer
  draws; unit-test the URL builder and look at the globe.

## Working on merges

Upstream PRs are absorbed on `pr-<n>` branches, then merged into `dev`.
Conflicting fixes are left alone rather than force-resolved. When a merge lands
or is backed out, record the decision in `docs/FORK-NOTES.md` — that file is the
memory of *why*, and it is the reason this fork can be re-based against a moving
upstream at all.

```bash
gh pr list -R bilawalsidhu/gods-eye-view --state open
```

## Commits

ES modules, 2-space indent, single quotes, semicolons. JSDoc on exported
functions. Match surrounding code. Small, reviewable commits. Behavior changes
update `docs/CURRENT-STATE.md` and `CHANGELOG.md` in the same commit; new data
sources update `DATA_SOURCES.md` with license and attribution.
