# School Thik Karo — Ground Report

CJP's School Thik Karo accountability map: a full-bleed, phone-first, pannable and
zoomable map of India where audit reports show up as pins, colored by status, with a
schools/districts audited-vs-impacted tracker. Anyone can submit a report — an Instagram
link and a location (village, tehsil, or district/city — whichever level is actually
findable) are required; school name is optional — and it appears on the map immediately
with the actual Instagram post embedded inline.

This is a stripped-down v1, not the full product described in the spec — see
[`docs/spec.md`](docs/spec.md) for the full plan (moderation queue, speech-to-text
location matching, representative data, gap reports, etc). What's real here:

- **Real location data, searchable at whatever level actually exists.** All ~662k
  inhabited villages, 6,921 tehsils, 763 districts and 36 states/UTs, sourced from the
  [Local Government Directory](https://lgdirectory.gov.in) (via
  [planemad/india-local-government-directory](https://github.com/planemad/india-local-government-directory)),
  imported into Postgres. A materialized view (`village_search`) combines village + tehsil
  + district + state name into one full-text search vector (`tsvector`, GIN indexed), so a
  query like "latur maharashtra" or "ausa" matches across all four levels at once with
  prefix matching per word. The search endpoint (`app/api/locations/search-villages`)
  layers three things: exact/prefix matches, ranked highest; a **trigram fuzzy fallback**
  (`pg_trgm`) for typos/spelling variants when the exact search comes up empty; and
  **tehsil- and district-level results** for places with no LGD village children at all —
  Kolkata, for instance, is a fully urban district with zero LGD villages or tehsils under
  it, so it only shows up via the district-level query. Tehsil/district matching also has
  its own relaxed fallback: a query like "kotla mubarakpur delhi" has no hope of an exact
  match (that neighborhood isn't in the LGD directory at all — it's urban, not a rural
  village), so if the strict all-words-must-match search comes up empty, it retries with
  any-word-matches instead, ranked by how many words hit — "delhi" alone is enough to
  surface Delhi's districts as something to manually narrow down from. If multiple villages share a name
  (surprisingly common — 748 are named exactly "Rampur"), results show full context so you
  pick the right one. Village names carry official LGD tags like "[rural]" or a
  disambiguation number — `lib/format.ts` strips those for display without touching real
  hamlet-name suffixes like "(Naravane)", which are genuine identity, not tags.
- **Village → tehsil → district/city fallback, at every level.** Not every real-world
  location matches an LGD village (spelling variants, small hamlets, or fully urban
  districts like Kolkata with no rural hierarchy at all). Search surfaces whichever level
  actually exists; the manual state → district → tehsil → village picker also offers
  "tag this report to the tehsil instead" and "tag this report to the district/city
  instead" at each level. Every fallback still gets a real, accurately-placed pin (down to
  district-level anchors — see below) — just without the more specific name.
- **Real map, pannable and zoomable.** State boundaries from
  [`@svg-maps/india`](https://www.npmjs.com/package/@svg-maps/india), wrapped in
  `react-zoom-pan-pinch` so wheel/pinch/drag zoom the map itself, not the browser page.
  Only state labels render for now (district/tehsil label layers were tried and pulled —
  see `scripts/match-geo.mjs` for the geodata behind them if that gets revisited).
- **Real pin placement, at whichever level has data.** There's no free lat/lng dataset
  down to the village level, but there *is* real tehsil- and district-boundary geometry
  ([geoBoundaries](https://www.geoboundaries.org) ADM1–ADM3 for India). `scripts/match-geo.mjs`
  cross-references that against the LGD tehsil/district lists by containment + fuzzy name
  matching, producing a real anchor point for 5,998 of 6,921 tehsils (86.7%) and 682 of 763
  districts — see `data/subdistrict-points.json` and `data/district-points.json`.
  `lib/statemap.ts`'s `placeLocation()` uses the most precise anchor available: tehsil
  anchor (jittered, if there's a specific village), tehsil anchor exactly (tehsil-only
  case), district anchor (district/city-only case), finally a pseudo-random point within
  the state's shape if nothing matched. All anchors are reprojected into the map's SVG
  space via a per-state bounding-box transform. True village-level precision would need
  per-village geocoding, which has no free nationwide dataset — production should geocode
  from the school record directly.
- **Real Instagram embeds.** Submitted links render as the actual Instagram post/reel
  inline (via Instagram's public embed widget — no API token needed, nothing to set up),
  with a fallback "Open on Instagram" link if the embed can't load. Note: some posts
  require an Instagram login to actually play, even via the fallback link — that's an
  Instagram-side restriction on that specific content, not something this app controls.
  Two silent-failure link formats are normalized before storage (`lib/format.ts`'s
  `normalizeInstagramUrl()`, applied client- and server-side, plus defensively again at
  render time): stray leading/trailing whitespace, and Instagram's own share sheet
  sometimes handing out `/reels/` (plural) instead of the `/reel/` permalink format the
  embed widget actually requires — either one makes the embed render nothing, with no
  error surfaced anywhere.
- **A real database.** Submissions persist via a Postgres backend (Neon).
- **Phone-first.** The submit form is a bottom sheet on small screens, the case drawer
  goes full-width, and header chrome (wordmark, tracker, FAB, zoom controls) is sized for
  touch.

What's simplified for now:

- **No moderation queue.** Submissions publish straight to the map — fine while one team
  is triaging directly, not fine at real public-submission volume (see spec §3.8).
- **No speech-to-text / caption NLP.** Location is picked via search instead of
  auto-suggested from a transcript.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres (Neon) via `pg`
- `@svg-maps/india` for state boundary paths
- `react-zoom-pan-pinch` for map pan/zoom

## Local development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL
npm run dev
```

## Deploying

1. Push this repo to GitHub (already done if you're reading this from there).
2. In Vercel, import the repo.
3. Add an environment variable `DATABASE_URL` pointing at your Postgres instance
   (the Neon connection string works as-is — get it from the Neon console, or ask
   whoever set up the database for the connection string).
4. Deploy. No build config changes needed.

## Data re-import

The `states`, `districts`, `subdistricts`, `villages` tables in Postgres were bulk-loaded
once from the LGD CSVs via `psql \copy` and don't need to be regenerated unless you're
rebuilding the database from scratch (source: [planemad/india-local-government-directory](https://github.com/planemad/india-local-government-directory)).
The `village_search` materialized view (full-text search across village/tehsil/district/state
name) is built from those tables — if you reimport the base tables, refresh it with
`REFRESH MATERIALIZED VIEW village_search;`.

Three small generated files in `data/` drive pin placement, and don't depend on the
database:

- `data/state-map.json` — each state's SVG bounding box in the map's coordinate space.
  Regenerate with `node scripts/gen-state-map.mjs`.
- `data/subdistrict-points.json`, `data/district-points.json` + `data/state-real-bbox.json`
  — real tehsil/district anchor points (with names, for a future label layer) and state
  lon/lat bounding boxes, used to place pins accurately. Regenerating requires downloading
  geoBoundaries' ADM1/ADM2/ADM3 India files (`geoBoundaries-IND-ADM{1,2,3}.geojson` from
  https://www.geoboundaries.org, ~250MB total) plus the cleaned LGD state/district/subdistrict
  CSVs, then running `GEO_SCRATCH_DIR=/path/to/those/files node scripts/match-geo.mjs`.
