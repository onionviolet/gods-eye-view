# Changelog

This changelog records public product changes. For the authoritative description
of current runtime behavior, see [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md).

## [Unreleased] — 2026-08-30

### Fixed

- Arrivals at elevated locations no longer place the camera underground. Framing
  fell back to a per-city `groundElevation` that defaults to sea level and is only
  supplied for the curated `CITY_POIS`, so any other destination was framed as if
  it stood on the ocean surface, burying the eye by roughly the local elevation:
  ~1,609 m over Denver, ~2,240 m over Mexico City, both a black frame. The
  fallback now consults the worldwide ground-floor elevation service before
  assuming zero, and a new post-arrival guard measures the rendered surface once
  tiles have streamed in and lifts the eye to a usable clearance if it is still
  buried. The guard yields immediately to manual camera input.
- Voice can now switch to the OpenTopoMap and OSM Humanitarian basemaps. Both
  were selectable in the interface and silently unaddressable by voice, which
  read as the assistant ignoring a valid request.
- Active fires now load on connections where the wildfire source is only
  reachable over IPv4. The request retries explicitly over IPv4 when the first
  attempt fails to connect, and the proxy log now names the underlying cause
  instead of reporting a bare "fetch failed".
- Mapped military installations no longer come back nearly empty. Areas and
  site relations arrived without a centre point and were being discarded, so
  the layer drew only the sites mapped as single points — nothing at all over
  places mapped purely as areas.
- Bike-share stations from GBFS v3 feeds now show their names.
- Data-layer rows and visual-style buttons now carry hover tooltips, so the
  reason a layer is unavailable is legible without hunting for the meta line.

### Added

- Added OpenSeaMap sea marks and OpenSnowMap ski pistes as open-data raster
  overlays, toggleable independently under one Map Overlays row and reachable
  by voice. They draw on the globe surface, so they are visible on the OSM,
  Bing, OpenTopoMap, and OSM Humanitarian stacks and show nothing on the
  Google 3D stack, which renders with the globe hidden — the layer says so
  rather than appearing broken.
- Added a Rayhunter tap layer: point the app at your own Rayhunter device on
  your network to plot its cell-site-simulator detections. The proxy that
  reaches the device accepts local network addresses only.
- Added an opt-in toggle that routes Radio audio into the voice model, so you
  can ask about what a station is currently saying. Off by default; the status
  readout says whether audio is actually reaching the model, not just whether
  the switch is on.
- Added the Ocean Conditions layer: ~900 NOAA NDBC buoy stations from one
  server-cached bulk feed, color-banded by significant wave height, with
  sparse observation cards, Open-Meteo Marine forecast lines (`FC`-labeled),
  ocean-point forecast cards, analyst-query coverage, voice aliases
  ("buoys", "sea state", "waves"), and share token `o`.
- Added a person-overboard drift Monte Carlo MVP: USCG PIW-1 leeway
  coefficients (Allen & Plourde 1999 / Allen 2005; Breivik & Allen 2008
  formulation), 10⁴-particle ensembles run in a worker over a 5×5
  Open-Meteo forecast grid, rendered as a scrubbable particle cloud labeled
  `SIMULATED DRIFT ENSEMBLE — NOT A SAR PRODUCT`, started from a `▶ DRIFT`
  chip on buoy and ocean-point cards.


## [Unreleased] — 2026-08-24

### Added

- Added boot diagnostics to the loading screen: a module-load failure now
  shows `Boot error: <message> @ <file>:<line>` instead of an eternal
  "Initializing photorealistic world…", and a boot still waiting on modules
  after 20 s says so with a running counter. Lives in `src/bootDiagnostics.js`,
  loaded from `index.html` before `main.js` so it also covers a module that
  fails to load, not only one that throws.
- Added a lighter rendering profile for phones and small tablets
  (`src/mobileProfile.js`): no preserved drawing buffer, CSS-pixel
  resolution, a 256 MB photoreal tile cache with coarser detail,
  and the post-process passes (scope mask, sharpen, bloom, visual styles)
  disabled. Desktop rendering is unchanged. `?gevMobile=1|0` forces the
  profile; `?gevFlags=diag` shows an on-screen GPU/canvas readout for bug
  reports. See `docs/KNOWN-ISSUES.md`, "Phones and small tablets".
- Added honest aircraft identity narration: callsign, operator, registration,
  type, and route come only from selected-contact context, and missing operator,
  route, or type enrichment is named explicitly.
- Added local, publication-compatible copies of the two README PNGs, with source
  records and third-party-license boundaries in `docs/media/README.md`.
- Added regression coverage for aircraft identity narration and optional-key
  loading feedback.

### Changed

- Connection warm-up for Cesium ion and Google Maps now happens only when the
  matching credential is configured. A keyless install contacts neither, so the
  previous unconditional hints spent connection slots on hosts that session
  would never call.
- First-run presentation now opens with Detection `DENSE` at 75%, `ELASTIC`
  allocation, Fade 7%, Outside 1%, scope feather 11%, and aircraft 3D models in
  `PROXIMITY`. Stored state and share links still override these baselines.
- The 17 selected README GIFs remain unchanged and are documented separately
  from the two owner-published PNGs.
- Bundled datacenter and dam snapshots now omit contact-oriented fields and
  note values containing email or phone identifiers. Feature geometry, names,
  operator/capacity/river metadata, counts, and ODbL terms are unchanged.
- Public documentation and the L9 release matrix no longer reference non-public
  planning material or repository history.

### Fixed

- All three VIIRS sources now reach the Active Fires layer. Merging a source's
  detections used argument spread, which exceeds the engine's argument limit on
  the two largest sources and dropped them entirely — leaving roughly a third of
  global detections while reporting each dropped source twice, once as
  successful with its real count and once as failed.
- Windows laptop touchpads can pinch-zoom and two-finger-scroll the globe.
  Precision Touchpad pinch arrives as Ctrl+wheel, which Cesium recorded but
  never bound to zoom; two-finger motion no longer tilts on a fine pointer.
  Pinch and two-finger zoom now share a 0.002 height scale (~2.5× Cesium
  wheel) so the gestures feel snappier. Click-drag orbit and Ctrl+drag tilt
  are unchanged.
- A missing optional FIRMS key no longer turns the complete Environmental
  mission into `LOAD FAILED`. The FIRMS row still reports `KEY REQUIRED`, while
  earthquakes continue to load. Real lifecycle and fetch failures retain
  failure priority.
- The mapped-installations layer retries after an unavailable request when it is
  enabled or the camera settles.
- Aircraft trails attach to the rendered aircraft transform and remain near the
  rear center across headings. Parked aircraft do not draw a moving head
  segment.
- Grounded aircraft keep validated floor evidence through temporary terrain
  outages and wait for measured photoreal-surface evidence before a 3D model
  takes over from its billboard.
- Cockpit altitude uses aviation MSL data rather than Cesium render height.
- The bundled Natural Earth region and neighborhood-polygon packs load through a
  single import path in both the browser and `node:test`, so the production
  build no longer externalizes `node:fs` for two browser data modules.

### Security

- The CCTV frame proxy caps one buffered snapshot at 16 MB while it reads. A
  configured source that declares or streams a larger body is cancelled and
  treated as an ordinary upstream miss, so the Street View and synthetic
  fallbacks still run.
- Production transitive dependencies resolve to patched DOMPurify and
  protobufjs releases without changing the Cesium version or application APIs.
- Production dependency audit reports no known advisories; remaining audit
  findings are confined to development and QA tooling.

## [Unreleased] — 2026-08-23

### Added

- Added a first-run mission launcher for Contacts, Space Missions,
  Environmental, and manual exploration.
- Added terrain-validity gating and bounded last-known placement for grounded
  aircraft models.

### Changed

- Environmental consistently presents both earthquakes and NASA FIRMS fires,
  with honest optional-key degradation.
- The tracked aircraft trail acceptance bar is visual: roughly rear-center,
  stable across headings, with minor hull overlap allowed and no conspicuous
  top, bottom, or lateral projection.

## [Unreleased] — 2026-08-18 to 2026-08-22

### Added

- Added the four-source Map Source tray, share-link v2 state, cockpit/context
  voice parity, MSL altitude readouts, and close-range tracked aircraft models.
- Added the L9 release-candidate matrix, AIS feed watchdog, voice cost controls,
  satellite classes, and the shared world-overlay host.
- Added deterministic first-run, map-source, floor, overlay, tracking, and
  aircraft-model regression harnesses.

### Changed

- Consolidated world labels, cards, tracked readouts, CCTV thumbnails, cable
  labels, mission labels, and detection presentation under shared allocation and
  lifecycle rules.
- Reduced idle rendering through the render governor and explicit scope mask.
- Improved cockpit layout, context restoration, keyless feed honesty, and
  aircraft 2D/3D handoffs.

### Fixed

- Fixed degenerate depth picks, map-source restore states, route-camera motion,
  bright-ground label readability, grounded display flooring, and cross-layer
  tracking cleanup.
- Fixed stale overlay callbacks, parked-idle render leaks, cable-label sweep
  starvation, and several share-link state conflicts.

## [Unreleased] — 2026-08-02 to 2026-08-16

### Added

- Added Global Context modes, Cockpit briefing surfaces, Radio context,
  satellite mission replay, and real per-class aircraft models with adjacent
  provenance records.
- Added a shared screen-space overlay system with bounded allocation for labels,
  cards, callouts, detection brackets, and selected-object presentation.

### Changed

- Unified right-side product controls and responsive cockpit/map layouts.
- Migrated public-safe neighborhood geometry to DataSF and tightened safe local
  development defaults.
- Improved proxy resilience, annotation outline bounds, CCTV enable pacing,
  contact de-emphasis, and deterministic visual stacking.

## [Unreleased] — July 2026

### Added

- Added live NASA FIRMS fires, optional live TomTom traffic, Caltrans and TfL
  CCTV packs, CCTV viewsheds and direct-manipulation calibration, citywide CCTV
  cards, Natural Earth regions, analyst queries, and voice routing QA.
- Added the end-to-end vertical-datum system for aircraft, vessels, CCTV,
  annotations, trails, and terrain-aware rendering.
- Added aircraft class silhouettes, path-derived display heading, ADSBDB
  enrichment, cached CelesTrak TLE lookup, and next-ISS-pass prediction.

### Fixed

- Fixed elevated-airport aircraft placement, vessel sea-surface placement,
  close-zoom FIRMS anchors, antimeridian region framing, annotation resolution,
  cross-layer tracking ownership, and CCTV projection lifecycle issues.

## [Unreleased] — June 2026

### Added

- Added OpenAI Realtime voice control, scene-aware entity context, viewport image
  grounding, the AI HUD summary, live AIS vessels, infrastructure layers, map
  source switching, free-text navigation, and server-side data proxies.
- Added hybrid map annotations, 3D aircraft, panoptic detection, tracking
  harnesses, and public data attribution.
- Added MIT source licensing, security guidance, contribution guidance, data
  source notices, and third-party asset boundaries.

### Changed

- Removed the experimental AI video-edit style and retained seven deterministic
  visual styles.
- Moved Realtime text-history trimming to the server-side retention policy while
  keeping only the latest viewport image in conversation context.

## [0.7.0] — 2026-02-18

- Added the Bikeshare Pulse layer and panoptic label improvements.
- Improved tracked-item boxes, post-render alignment, and CCTV projection
  quality.
- Removed the experimental shift-drag CCTV calibration interaction.

## [0.6.0] — 2026-02-10

- Added the initial multi-layer 3D globe experience, visual styles, live
  aircraft, satellites, earthquakes, CCTV, traffic, FIRMS, infrastructure, and
  performance controls.
- Added entity inspection, tracking, scenes, keyboard controls, and shareable
  views.

## [0.1.0] — 2026-02-09

- Initial project version.
