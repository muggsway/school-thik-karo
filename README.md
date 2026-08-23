# School Thik Karo — Ground Report

A demo v1 of CJP's School Thik Karo accountability map: a full-bleed map of India
where audit reports show up as pins, colored by status. Anyone can submit a report —
paste an Instagram link, pick the school's location from real cascading
state → district → tehsil → village dropdowns, and it appears on the map immediately.

This is a stripped-down demo build, not the full v1 described in the product spec —
see [`docs/spec.md`](docs/spec.md) for the full plan (moderation queue,
speech-to-text location matching, representative data, gap reports, etc). What's real here:

- **Real location data.** All ~662k inhabited villages, 6,921 tehsils, 763 districts and
  36 states/UTs, sourced from the [Local Government Directory](https://lgdirectory.gov.in)
  (via [planemad/india-local-government-directory](https://github.com/planemad/india-local-government-directory)),
  imported into Postgres. The dropdowns are backed by this data, not typed manually.
- **Real map.** State boundaries from [`@svg-maps/india`](https://www.npmjs.com/package/@svg-maps/india).
- **A real database.** Submissions persist via a Postgres backend (Neon).

What's mocked / simplified for this demo:

- **Pin placement isn't real geocoding.** There's no free lat/lng dataset down to the
  village level, so each case is placed at a deterministic pseudo-random point inside its
  *state's* bounding box (seeded by village code, so the same village always lands in the
  same spot). It's in the right state, not the right village. Production should geocode
  from the school/village record directly.
- **No Instagram oEmbed yet.** The link is stored and shown as a plain link, not a live
  embed/thumbnail. Wiring in real oEmbed needs a Meta developer app (App ID + Client Token).
- **No moderation queue.** Submissions publish straight to the map — fine for a one-person
  demo, not fine for production (see spec §3.8).
- **No speech-to-text / caption NLP.** Location is picked manually via dropdown instead of
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

The village/district/tehsil/state data lives in `data/state-map.json` (state → svg
bounding box, used only for pin placement) plus the `states`, `districts`,
`subdistricts`, `villages` tables in Postgres. To regenerate the state-map file:

```bash
node scripts/gen-state-map.mjs
```

The Postgres tables were bulk-loaded once from the LGD CSVs via `psql \copy` and don't
need to be regenerated unless you're rebuilding the database from scratch.
