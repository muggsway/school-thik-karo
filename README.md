# School Thik Karo — Ground Report

A demo v1 of CJP's School Thik Karo accountability map: a full-bleed, phone-first map of
India where audit reports show up as pins, colored by status. Anyone can submit a report —
paste an Instagram link, search for the village by name (with full state/district/tehsil
context shown when multiple villages share a name), and it appears on the map immediately
with the actual Instagram post embedded inline.

This is a stripped-down demo build, not the full v1 described in the product spec —
see [`docs/spec.md`](docs/spec.md) for the full plan (moderation queue,
speech-to-text location matching, representative data, gap reports, etc). What's real here:

- **Real location data.** All ~662k inhabited villages, 6,921 tehsils, 763 districts and
  36 states/UTs, sourced from the [Local Government Directory](https://lgdirectory.gov.in)
  (via [planemad/india-local-government-directory](https://github.com/planemad/india-local-government-directory)),
  imported into Postgres with a trigram search index. Typing a village name searches all
  662k of them directly; picking one auto-fills district/tehsil/state, and if multiple
  villages share a name (surprisingly common — 748 villages are named exactly "Rampur"),
  the search results show full district/state context so you pick the right one.
- **Real map.** State boundaries from [`@svg-maps/india`](https://www.npmjs.com/package/@svg-maps/india).
- **Real (tehsil-level) pin placement.** There's no free lat/lng dataset down to the
  village level, but there *is* real tehsil-boundary geometry
  ([geoBoundaries](https://www.geoboundaries.org) ADM1–ADM3 for India). `scripts/match-geo.mjs`
  cross-references that against the LGD tehsil list by containment + fuzzy name matching,
  producing a real anchor point for 5,998 of 6,921 tehsils (86.7%) — see
  `data/subdistrict-points.json`. Pins for a matched tehsil land in the actual right part
  of the state (reprojected into the map's SVG space via a per-state bounding-box
  transform), with a small jitter so villages in the same tehsil don't stack. Unmatched
  tehsils fall back to a random point within the state's shape. True village-level
  precision would need per-village geocoding, which has no free nationwide dataset —
  production should geocode from the school record directly.
- **Real Instagram embeds.** Submitted links render as the actual Instagram post/reel
  inline (via Instagram's public embed widget — no API token needed), with a fallback
  "Open on Instagram" link if the embed can't load.
- **A real database.** Submissions persist via a Postgres backend (Neon).
- **Phone-first.** The submit form is a bottom sheet on small screens, the case drawer
  goes full-width, and header chrome (wordmark, stats, legend, FAB) is sized for touch.

What's mocked / simplified for this demo:

- **No moderation queue.** Submissions publish straight to the map — fine for a one-person
  demo, not fine for production (see spec §3.8).
- **No speech-to-text / caption NLP.** Location is picked via search instead of
  auto-suggested from a transcript.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres (Neon) via `pg`
- `@svg-maps/india` for state boundary paths

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
   whoever set up the original demo database for the connection string).
4. Deploy. No build config changes needed.

## Data re-import

The `states`, `districts`, `subdistricts`, `villages` tables in Postgres were bulk-loaded
once from the LGD CSVs via `psql \copy` and don't need to be regenerated unless you're
rebuilding the database from scratch (source: [planemad/india-local-government-directory](https://github.com/planemad/india-local-government-directory)).

Two small generated files in `data/` drive pin placement and don't depend on the database:

- `data/state-map.json` — each state's SVG bounding box in the map's coordinate space.
  Regenerate with `node scripts/gen-state-map.mjs`.
- `data/subdistrict-points.json` + `data/state-real-bbox.json` — real tehsil anchor
  points and state lon/lat bounding boxes, used to place pins accurately within a state.
  Regenerating requires downloading geoBoundaries' ADM1/ADM2/ADM3 India files
  (`geoBoundaries-IND-ADM{1,2,3}.geojson` from https://www.geoboundaries.org, ~250MB total)
  plus the cleaned LGD state/district/subdistrict CSVs, then running
  `node scripts/match-geo.mjs` (edit the hardcoded paths at the top of the script first —
  it expects those files in a local scratch directory, not committed to this repo).
