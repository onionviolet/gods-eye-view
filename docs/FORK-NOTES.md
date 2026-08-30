# Fork Notes

What this fork carries on top of `bilawalsidhu/gods-eye-view`, why each piece
is here, and what is deliberately left out.

- [Layout](#layout)
- [What is merged](#what-is-merged)
- [Merge decisions worth knowing](#merge-decisions-worth-knowing)
- [Local additions](#local-additions)
- [Tried and backed out](#tried-and-backed-out)
- [Watch list](#watch-list)
- [Verifying a change](#verifying-a-change)

---

## Layout

| Branch | Purpose |
|---|---|
| `main` | Clean mirror of `upstream/main`. Never developed on, so upstream pulls stay trivial. |
| `dev` | The working branch. Everything below lives here. |

| Remote | Points at |
|---|---|
| `origin` | `onionviolet/gods-eye-view`, this fork |
| `upstream` | `bilawalsidhu/gods-eye-view` |
| `free` | `michal1000w/gods-eye-view-free`, the keyless/local-MLX fork |
| `kaizen` | `kaizencycle/gods-eye-view`, the Mobius integration fork |

## What is merged

Upstream pull requests, none of them merged upstream at the time of writing:

| PR | What it does |
|---|---|
| [#60](https://github.com/bilawalsidhu/gods-eye-view/pull/60) | Makes the Google Maps key optional; adds a Nominatim geocoding fallback |
| [#93](https://github.com/bilawalsidhu/gods-eye-view/pull/93) | FIRMS argument-spread bug that silently dropped 2 of 3 VIIRS sources |
| [#51](https://github.com/bilawalsidhu/gods-eye-view/pull/51) | Typed multi-provider agent (OpenAI / OpenRouter / Ollama) and the Cesium ion photoreal route |
| [#83](https://github.com/bilawalsidhu/gods-eye-view/pull/83) | Keeps `node:fs` out of the browser-built data modules |
| [#82](https://github.com/bilawalsidhu/gods-eye-view/pull/82) | Caps the buffered snapshot body in the CCTV frame proxy |
| [#97](https://github.com/bilawalsidhu/gods-eye-view/pull/97) | Hardens the Vite host allowlist |
| [#89](https://github.com/bilawalsidhu/gods-eye-view/pull/89) | RainViewer weather radar, re-landed with the PoC's four blocking bugs fixed |
| [#118](https://github.com/bilawalsidhu/gods-eye-view/pull/118) | Post-arrival camera ground guard — never frame an arrival buried in terrain |
| [#114](https://github.com/bilawalsidhu/gods-eye-view/pull/114) | OpenSeaMap / OpenSnowMap raster overlays (upstream issue #10) |
| [#116](https://github.com/bilawalsidhu/gods-eye-view/pull/116) | Rayhunter cell-site-simulator tap layer — merged with its SSRF guard rewritten |
| [#100](https://github.com/bilawalsidhu/gods-eye-view/pull/100) | Ocean Conditions (NDBC buoys) + person-overboard drift Monte Carlo |
| [#115](https://github.com/bilawalsidhu/gods-eye-view/pull/115) | Opt-in toggle routing Radio audio into the voice model |
| [#110](https://github.com/bilawalsidhu/gods-eye-view/pull/110) | Server-only Places / Street View key, split from the browser key |
| [#105](https://github.com/bilawalsidhu/gods-eye-view/pull/105) / [#106](https://github.com/bilawalsidhu/gods-eye-view/pull/106) | OSM webcam CCTV pack — merged with a resolved-host guard added — and the Warendorf pack |
| [#107](https://github.com/bilawalsidhu/gods-eye-view/pull/107) / [#102](https://github.com/bilawalsidhu/gods-eye-view/pull/102) | Installations: OSM provenance, viewport roster, bounds-midpoint fallback |
| [#104](https://github.com/bilawalsidhu/gods-eye-view/pull/104) | `OVERPASS_EXTRA_UPSTREAMS` for operator-supplied mirrors |
| [#73](https://github.com/bilawalsidhu/gods-eye-view/pull/73) | FIRMS IPv4 retry — merged, then narrowed to genuine connect failures |
| [#72](https://github.com/bilawalsidhu/gods-eye-view/pull/72) / [#79](https://github.com/bilawalsidhu/gods-eye-view/pull/79) / [#78](https://github.com/bilawalsidhu/gods-eye-view/pull/78) / [#62](https://github.com/bilawalsidhu/gods-eye-view/pull/62) | Render perf, mobile profile, boot diagnostics, touchpad pinch-zoom |
| [#119](https://github.com/bilawalsidhu/gods-eye-view/pull/119) / [#122](https://github.com/bilawalsidhu/gods-eye-view/pull/122) / [#111](https://github.com/bilawalsidhu/gods-eye-view/pull/111) / [#103](https://github.com/bilawalsidhu/gods-eye-view/pull/103) / [#98](https://github.com/bilawalsidhu/gods-eye-view/pull/98) / [#117](https://github.com/bilawalsidhu/gods-eye-view/pull/117) | Audit fixes, CRLF fixture portability, tooltips, QA polling, Nix shell, docs |
| [#61](https://github.com/bilawalsidhu/gods-eye-view/pull/61) | GBFS v3 station names — merged, then reworked to dispatch on shape |

### Absorbed but rewritten, and why

Four PRs were taken for their intent and changed on the way in. Each is worth
knowing about before a rebase re-opens the same question.

- **#116's Rayhunter proxy** shipped a blocklist of one literal string,
  `169.254.169.254`. `2852039166` and `0251.0376.0251.0376` are the same
  address, both satisfy its `host:port` pattern, and `metadata.google.internal`
  simply resolves to it. Replaced with an allowlist by address class:
  `isLanDeviceAddress` resolves the host and requires **every** answer to be
  private, loopback, or CGNAT. Link-local is refused wholesale, so the metadata
  address needs no special case.
- **#105's OSM webcam pack** filters the URL string, but `contact:webcam` is a
  world-editable OSM tag and a string cannot say where a name points. The pack
  is also ON by default (`CCTV_OSM_ENABLED ?? '1'`), which its own `.env`
  comment implied it was not. `filterOsmWebcamsToPublicHosts` now resolves each
  host on the refresh path and requires every answer to be public.
- **#73's FIRMS retry** fired on any `fetch` rejection, so an abort or a dead
  host paid the timeout twice and reported the second, less useful failure.
  `isConnectFailure` gates it, unwrapping the AggregateError that Happy Eyeballs
  reports the A/AAAA race through — the code sits on the inner errors, so a
  plain `err.code` check sees nothing.
- **#61's GBFS v3 names** called `.find()` on a possibly-absent field and
  `.toLowerCase()` on a possibly-absent `language`, so one malformed station
  threw and took down the parse for a whole system. Now dispatches on the
  field's shape rather than the feed's declared version, which fixes the crash
  and the mislabeled-feed case together.

### Refused, with reasons

- [#126](https://github.com/bilawalsidhu/gods-eye-view/pull/126) FIRMS IPv4:
  calls `setDefaultAutoSelectFamily(false)`, disabling Happy Eyeballs for the
  whole dev-server process — every other proxy included — as a side effect of
  constructing one plugin. #73's per-request retry stays scoped to the source
  that has the problem.
- [#125](https://github.com/bilawalsidhu/gods-eye-view/pull/125) OrcaRouter:
  adds a vendor route, limiter, model default, and a browser-exposed
  `VITE_HUD_SUMMARY_URL`. The registry from #51 already gives every provider a
  `baseUrlEnv`; OpenAI was simply missing one. Filling that in reaches
  OrcaRouter and every other OpenAI-compatible gateway with no vendor in the
  tree.
- [#94](https://github.com/bilawalsidhu/gods-eye-view/pull/94) Docker: this
  fork's own `Dockerfile` already exists and is strictly better — it documents
  why the image must run `vite`, not a production build, since ten of the
  nineteen proxies register only on `configureServer`.
- [#127](https://github.com/bilawalsidhu/gods-eye-view/pull/127) Deno CI:
  GitHub's stock Deno starter workflow, unmodified, in a Node/Vite repo whose
  `engines` pin Node and whose tests run through `scripts/run-unit-tests.mjs`.
- [#123](https://github.com/bilawalsidhu/gods-eye-view/pull/123) and
  [#109](https://github.com/bilawalsidhu/gods-eye-view/pull/109): subsets of the
  credential handling here — see the section above.
- Duplicates of work already landed: #113 (RainViewer, we have #89), #112
  (`node:fs`, we have #83), #121/#108/#81 (CRLF, we have #122).

## Merge decisions worth knowing

### PR #51 and PR #60 disagree, and this fork sides with neither

Both touch the same block of `src/main.js` and solve overlapping problems
differently. PR #51 widens the credential gate to "Google key **or** ion token"
but still calls `missingCredentialsError()` when neither is present. PR #60
exists precisely because ten of the thirteen layers need no credential at all,
so a hard throw is the thing it set out to remove.

The resolution here keeps #51's route resolution and its complete ion retry
path, and replaces the throw with #60's keyless branch. Three regimes instead
of two:

| Credentials | Result |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Photoreal direct, with an ion retry when Map Tiles is blocked |
| `CESIUM_ION_TOKEN` only | Photoreal through ion, which resells the same mesh |
| Neither | Keyless globe stacks. No crash, no tileset fetch. |

The combination is worth more than either PR alone: #51 documents that ion does
not resell Google's Geocoding API, so place-name search dies on an ion-only
route, and #60's Nominatim fallback is exactly the thing that fills that hole.
Neither author could have made this call from inside their own branch.

Both merge points carry a `MERGE NOTE (ours)` comment in `src/main.js`.

### Two later upstream PRs re-derive this, and both are subsets

[#123](https://github.com/bilawalsidhu/gods-eye-view/pull/123) and
[#109](https://github.com/bilawalsidhu/gods-eye-view/pull/109) arrived after the
above and independently rebuild parts of it. **Neither is merged, and neither
should be.**

| PR | What it has | What it lacks |
|---|---|---|
| #123 | The ion retry, same mechanism (clear the key, let CesiumJS take the ion path) | The keyless third regime; route modelling; the loader-status line; a graceful non-recovery |
| #109 | All three regimes | The retry after a *failed* direct load — it picks a route up front and never falls back mid-flight; the geocoding carve-out |

The one genuinely new fact between them is **why** the retry is needed as often
as it is: Google refuses Map Tiles outright to EEA-billed projects
(`developers.google.com/maps/comms/eea/map-tiles`), so a perfectly valid key
fails for an entire billing region — not just the `API_KEY_SERVICE_BLOCKED`
misconfiguration this fork already documented. #109 also names the ion asset id
(`2275207`) that Cesium resells the mesh under. Both facts are now cited in
`shouldRetryViaIon`'s JSDoc in `src/mapCredentials.js`; the code needed no
change.

If either lands upstream, **resolve the rebase toward ours.** The merge note in
`src/main.js` says so at the conflict point, which is where it will be read.

## Local additions

### Two keyless map stacks, added rather than substituted

`opentopo` and `osm-humanitarian` come from the `free` remote, along with its
generic `UrlTemplateImageryProvider` branch in `_getImageryProvider`. That fork
**deletes** `photoreal` and both Bing entries when it adds them, which turns a
switch into a one-way door: once the stacks are gone, adding a Google or ion
credential later buys nothing back. Here they are appended to `MAP_STACKS`, so
all six stacks stay reachable from the same toggle in every credential regime.

`subdomains` is per-stack because the hosts differ: OpenTopoMap publishes
`a/b/c`, the HOT style publishes `a/b`. Requesting a subdomain a host does not
serve yields dead tiles rather than an error.

Both ids are registered in `CABLE_GLOBE_STACK_IDS`. The per-stack cable
classification test walks the real `MAP_STACKS` and failed loudly on the
omission, which is what its comment promises it will do.

**The same rule was broken one layer up, and nothing caught it.** Both stacks
were registered in `CABLE_GLOBE_STACK_IDS` and in the UI, and neither was in the
voice vocabulary: `set_map_stack`'s server-side enum in `vite.config.js` listed
four stacks, and `STACK_ALIASES` in `gevActions.js` had no phrasing for either.
They were selectable by mouse and unaddressable by voice, and *no* error was
raised anywhere — the operator just got an assistant that appeared to ignore a
valid request.

The cable test caught its omission because it walks the real registry; the voice
vocabulary had no such test, so it did not. `mapStackAliasCoverage()` now derives
coverage from `MAP_STACKS` the same way. **"Reachable" is not one check.** A new
stack has to reach `MAP_STACKS`, `CABLE_GLOBE_STACK_IDS`, the tool enum, and the
alias map, and only a test that walks the registry will tell you which one was
missed.

Re-freezing the `GEV_REALTIME_TOOLS` hash in `firstRunExperience.test.mjs` was
part of this. That guard exists so the first-run mission work could not quietly
grow the tool schema; its concern is intact and still enforced. The baseline
moved once, deliberately, for an unrelated reason, and the edit is a real
realtime-session cache bust. Re-freeze it when you mean to change the schema —
never to make a red test green.

### `.claude/launch.json`

Mirrors upstream [#80](https://github.com/bilawalsidhu/gods-eye-view/pull/80) so
the dev server starts from an agent harness without retyping host and port.

## Tried, reverted, fixed, re-landed

[PR #89](https://github.com/bilawalsidhu/gods-eye-view/pull/89), the RainViewer
weather radar, arrived as a PoC. Merging it here failed three tests, so it was
reverted (`f7b6412`) with the failures named in the commit message. Upstream
picked that revert up and reviewed the PR, and the layer is now re-landed with
all four blocking points fixed.

Two of the four are worth remembering:

**The tile URL could never have worked.** `weather-maps.json` returns an opaque
hash in `frame.path` (`/v2/radar/3ae628836a15`), not a timestamp-composed path.
The PoC rebuilt the path from `frame.time`, which 404s on every tile. Cesium
renders an empty imagery layer rather than raising, so the layer looked enabled
and drew nothing. The failure mode is silence, which is why a test suite that
passes proves nothing here; `latestRadarTileUrl` is now pure and unit-tested,
including an assertion that the timestamp never appears in the URL.

**A test fixture stopped testing what it names.** `layerState.test.mjs` used the
literal `'z'` as its *unknown layer token*, and this PR registers `'z'` as a
real layer. The assertion kept passing for the wrong reason until the registry
count changed. Both fixtures now **derive** the first unregistered letter from
`LAYER_STATE_REGISTRY`, which retires the bug class rather than moving it one
letter along. A second instance lives in `sharelink.celestial.test.mjs`, which
the upstream diagnosis missed.

The generalisable rule: **a fixture that hardcodes "a value the system does not
know about" is a time bomb**, because the system's vocabulary grows. Derive it
from the registry it must not collide with.

Four small fixes still conflict against this branch and were left alone rather
than force-resolved: [#53](https://github.com/bilawalsidhu/gods-eye-view/pull/53),
[#46](https://github.com/bilawalsidhu/gods-eye-view/pull/46),
[#45](https://github.com/bilawalsidhu/gods-eye-view/pull/45),
[#50](https://github.com/bilawalsidhu/gods-eye-view/pull/50).

## Watch list

1. **A local voice toggle. No upstream PR provides one.** PR #51 is a *text*
   agent and says so: voice is byte-identical and untouched, asserted in tests.
   The `free` remote runs voice fully locally (Qwen3-4B-MLX-4bit for tool
   selection, Whisper large-v3-turbo for STT, Kokoro-82M for TTS, served
   OpenAI-compatible on loopback) but by replacing the OpenAI path, not by
   switching. The real work is porting those services behind #51's provider
   registry in `src/agent/providers.js`.
2. **Keyless data layers**, all unmerged upstream:
   [#15](https://github.com/bilawalsidhu/gods-eye-view/pull/15) Meshtastic,
   [#14](https://github.com/bilawalsidhu/gods-eye-view/pull/14) ALPR / Flock,
   [#13](https://github.com/bilawalsidhu/gods-eye-view/pull/13) NIFC wildfire.
3. **Commits from the `kaizen` remote**, independent of its Mobius work.
   Resource-hint gating is **done** — taken as an adaptation, not a
   cherry-pick, because kaizen's second commit (`5f2d872`) reverts the static
   `index.html` hints its own first commit (`0380959`) added, so only the
   runtime-gated form is worth landing, and the gate had to be re-pointed at
   `mapRoute.googleApiKey` rather than the raw env var. Still open: renderer
   capability negotiation, the mobile renderer fallback, and the canonical
   global camera home.

4. **Assessed and closed out on 2026-08-30.** The sweep's queue is now empty:
   every open upstream PR is merged, rewritten on the way in, or refused with a
   reason, all recorded above. What remains open upstream and unaddressed here
   is only what appeared after this sweep.

   Previously listed as unassessed (upstream reached #127; none
   merged upstream):
   [#116](https://github.com/bilawalsidhu/gods-eye-view/pull/116) Rayhunter
   cell-site-simulator tap layer,
   [#115](https://github.com/bilawalsidhu/gods-eye-view/pull/115) routing Radio
   audio into the voice model — adjacent to item 1 and worth reading before it,
   [#100](https://github.com/bilawalsidhu/gods-eye-view/pull/100) ocean
   conditions with a person-overboard drift Monte Carlo,
   [#79](https://github.com/bilawalsidhu/gods-eye-view/pull/79) a mobile render
   profile that overlaps kaizen's renderer work in item 3.
5. **Duplicate-implementation pressure is now the norm upstream, not the
   exception.** The 08-30 sweep found the RainViewer layer implemented twice
   ([#89](https://github.com/bilawalsidhu/gods-eye-view/pull/89), already landed
   here, and [#113](https://github.com/bilawalsidhu/gods-eye-view/pull/113)), the
   `node:fs` fix twice (#83 landed, #112), the Google-credential ladder twice
   (#123, #109), and the Windows CRLF fixture problem **four** times (#81, #88,
   #121, #122). Check this file and `git log` before absorbing anything: the
   question is no longer "is this fixed upstream" but "which of the several
   fixes is already here".

Re-check upstream with:

```
gh pr list -R bilawalsidhu/gods-eye-view --state open
gh api repos/bilawalsidhu/gods-eye-view/compare/main...OWNER:REPO:main
```

## Verifying a change

`npm test` is the gate. The suite stands at **2,970 passing, 0 failing** on
`dev`, against 2,587 on upstream `main`. PR #51 brings 218 of that difference;
the rest accumulates from every absorbed PR and from the tests this fork adds
when it reworks one.

Two allocation microbenchmarks skip on Node 26 because their budgets are
calibrated for Node 24. That is expected, not a failure.

**A hidden browser cannot verify anything that renders.** GEV pauses its render
loop when `document.hidden` is true, which is correct behavior and also means a
backgrounded or headless tab never advances `scene.frameState.frameNumber` past
0. The globe then requests no imagery tiles at all, which reads exactly like a
broken imagery layer and is not one. Check the globe in a focused window.

The Browser pane reports `document.hidden === true` **even when fronted**, and
the freeze is wider than the globe: the Data Layers panel stops syncing too, so
a row shows `OFF` while `dataManager.isEnabled(id)` returns `true`. Confirmed
against `earthquakes` on 2026-08-30 — if a new layer's toggle looks stuck,
check an old layer before believing it.

What does work there, and what was used to accept the overlays: call
`viewer.scene.render()` in a loop by hand. That advances `frameNumber` and
issues genuine tile requests, and
`performance.getEntriesByType('resource')` then gives the URLs **and
`responseStatus`** — which is the only way to tell a drawing layer from a
silently-404ing one, since Cesium raises on neither. Both overlay hosts returned
200 at `z=1`. `transferSize: 0` on those entries is opaque cross-origin timing,
not an empty response. Keep each render loop under ~60 iterations per
`javascript_tool` call or it times out.
