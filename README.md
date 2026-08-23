# School Thik Karo — Ground Report

CJP's School Thik Karo accountability map: a full-bleed, phone-first, pannable and
zoomable map of India where audit reports show up as pins, colored by status. Anyone can
submit a report — an Instagram link and a village (or tehsil, if the exact village isn't
in official records) are required; school name and the post's original date are optional
— and it appears on the map immediately with the actual Instagram post embedded inline.

This is a stripped-down v1, not the full product described in the spec — see
[`docs/spec.md`](docs/spec.md) for the full plan (moderation queue, speech-to-text
location matching, representative data, gap reports, etc). What's real here:

- **Real location data.** All ~662k inhabited villages, 6,921 tehsils, 763 districts and
  36 states/UTs, sourced from the [Local Government Directory](https://lgdirectory.gov.in)
  (via [planemad/india-local-government-directory](https://github.com/planemad/india-local-government-directory)),
  imported into Postgres. A materialized view (`village_search`) combines village + tehsil
  + district + state name into one full-text search vector (Postgres `tsvector`, GIN
  indexed), so a query like "latur maharashtra" or "ausa" matches across all four levels
  at once with prefix matching per word. If multiple villages share a name (surprisingly
  common — 748 villages are named exactly "Rampur"), results show full context so you pick
  the right one. Village names carry official LGD tags like "[rural]" or a disambiguation
  number — `lib/format.ts` strips those for display without touching real hamlet-name
  suffixes like "(Naravane)", which are genuine identity, not tags.
- **A tehsil-level fallback.** Not every real-world location matches an LGD village exactly
  (spelling variants, small hamlets the directory doesn't carry separately). When search
  comes up empty, the manual state → district → tehsil picker offers "tag this report to
  the tehsil instead" — the case still gets a real, accurately-placed pin, just without a
  specific village name.
- **Real map, pannable and zoomable.** State boundaries from
  [`@svg-maps/india`](https://www.npmjs.com/package/@svg-maps/india), wrapped in
  `react-zoom-pan-pinch` so wheel/pinch/drag zoom the map itself, not the browser page.
  Only state labels render for now (district/tehsil label layers were tried and pulled —
  see `scripts/match-geo.mjs` for the geodata behind them if that gets revisited).
- **Real (tehsil-level) pin placement.** There's no free lat/lng dataset down to the
  village level, but there *is* real tehsil-boundary geometry
  ([geoBoundaries](https://www.geoboundaries.org) ADM1–ADM3 for India). `scripts/match-geo.mjs`
  cross-references that against the LGD tehsil list by containment + fuzzy name matching,
  producing a real anchor point for 5,998 of 6,921 tehsils (86.7%) and 682 of 763 districts
  — see `data/subdistrict-points.json` and `data/district-points.json`. Pins for a matched
  tehsil land in the actual right part of the state (reprojected into the map's SVG space
  via a per-state bounding-box transform), with a small jitter so villages in the same
  tehsil don't stack (tehsil-only cases sit exactly on the anchor point — no village to
  jitter around). Unmatched tehsils fall back to a random point within the state's shape.
  True village-level precision would need per-village geocoding, which has no free
  nationwide dataset — production should geocode from the school record directly.
- **Real Instagram embeds.** Submitted links render as the actual Instagram post/reel
  inline (via Instagram's public embed widget — no API token needed, nothing to set up),
  with a fallback "Open on Instagram" link if the embed can't load. Note: some posts
  require an Instagram login to actually play, even via the fallback link — that's an
  Instagram-side restriction on that specific content, not something this app controls.
  Instagram's oEmbed endpoint doesn't expose the post's original publish date publicly, so
  submitters can optionally enter it themselves; the timeline is honest about which date
  it's showing ("Posted on Instagram" vs. "Added to this map").
- **A real database.** Submissions persist via a Postgres backend (Neon).
- **Phone-first.** The submit form is a bottom sheet on small screens, the case drawer
  goes full-width, and header chrome (wordmark, stats, legend, FAB, zoom controls) is
  sized for touch.

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
