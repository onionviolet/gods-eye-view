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

### `.claude/launch.json`

Mirrors upstream [#80](https://github.com/bilawalsidhu/gods-eye-view/pull/80) so
the dev server starts from an agent harness without retyping host and port.

## Tried and backed out

[PR #89](https://github.com/bilawalsidhu/gods-eye-view/pull/89), the RainViewer
weather radar, is labelled a PoC for issue #85 and is one. It registers a layer
without extending the sealed `LAYER_STATE_REGISTRY` contract, so three tests
fail on merge: production registry exactness, and both unknown-layer-token
rejection tests. Reverted rather than patched, because completing the registry
contract for someone else's proof of concept is design work rather than a
fixup. The revert is kept in history instead of reset away, so the attempt is
visible. Re-land when upstream finishes it.

Four small fixes conflict against this branch and were left alone rather than
force-resolved: [#53](https://github.com/bilawalsidhu/gods-eye-view/pull/53),
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
2. **PR #89**, once the layer registry contract is done.
3. **Keyless data layers**, all unmerged upstream:
   [#15](https://github.com/bilawalsidhu/gods-eye-view/pull/15) Meshtastic,
   [#14](https://github.com/bilawalsidhu/gods-eye-view/pull/14) ALPR / Flock,
   [#13](https://github.com/bilawalsidhu/gods-eye-view/pull/13) NIFC wildfire.
4. **Four commits from the `kaizen` remote**, independent of its Mobius work:
   renderer capability negotiation, the mobile renderer fallback, the canonical
   global camera home, and gating ion/Google resource hints on actual
   credential availability.

Re-check upstream with:

```
gh pr list -R bilawalsidhu/gods-eye-view --state open
gh api repos/bilawalsidhu/gods-eye-view/compare/main...OWNER:REPO:main
```

## Verifying a change

`npm test` is the gate. The suite stands at **2,813 passing, 0 failing** on
`dev`, against 2,587 on upstream `main`; PR #51 brings 218 of the difference.

Two allocation microbenchmarks skip on Node 26 because their budgets are
calibrated for Node 24. That is expected, not a failure.

**A hidden browser cannot verify anything that renders.** GEV pauses its render
loop when `document.hidden` is true, which is correct behavior and also means a
backgrounded or headless tab never advances `scene.frameState.frameNumber` past
0. The globe then requests no imagery tiles at all, which reads exactly like a
broken imagery layer and is not one. Check the globe in a focused window.
