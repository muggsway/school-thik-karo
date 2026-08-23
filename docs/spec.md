# School Thik Karo — Project Context
### Consolidated brief for Claude Code — v1 build

This doc captures everything decided so far so a build can start from a clean context. It supersedes any earlier draft spec — the ingestion strategy in particular changed after review.

---

## 1. What this is

CJP (**Cockroach Janta Party**, the satirical political movement founded by Abhijeet Dipke) runs a campaign called **School Thik Karo**, launched around Independence Day 2026, where volunteers audit government schools against a 10-point checklist and post the findings on Instagram — broken toilets, missing benches, no water, unsafe buildings, etc. Right now that content is scattered across individual posts with no way to see the full picture or track what actually got fixed.

Note: CJP is not a registered political party with the ECI, and the campaign has reportedly drawn pushback in some states, including at least one reported incident of a volunteer's family member being attacked after a school audit. This raises the stakes on a couple of things already flagged in §6 and §11 — anonymous submission should probably be the default rather than optional, and the "display named MLA/MP next to unresolved complaints" feature deserves real legal/editorial review before launch, not just a nice-to-have sign-off.

**The product:** a public website with a map of India that turns campaign content into an accountability tool — tracking what's been flagged, where, whether it's been fixed, and where nobody has looked yet.

**The core loop:** someone submits a post → we auto-suggest which school/village it's about (from the caption + video transcript) → a moderator confirms → it appears as a pin with a dated timeline → follow-ups attach to the same case → a computed "gap report" shows what's stale or uncovered, which is the actual audit-prioritization tool.

---

## 2. Key decisions already made (don't relitigate these)

- **No crawler, no CJP account automation.** Instagram's Graph API only allows hashtag search through an account you own, is capped (30 hashtags/7 days, 200 calls/hour), and CJP is not willing to risk their account. **Public submission is the entire intake mechanism for v1.**
- **No browser extension for v1.** Considered (grabs the permalink via oEmbed while volunteers browse instagram.com), genuinely useful, but deferred — extensions only work on desktop/mobile-web anyway, not the native app, so it's a v2 nice-to-have, not a blocker.
- **Location matching is done via speech-to-text + caption NLP, not manual pin-drop as the default.** Almost everyone posting either says or writes where they are. Transcribe the video (Hindi/Hinglish-capable), combine with caption text, fuzzy-match against the official village/school database, and present ranked suggestions. A human always confirms — never auto-published.
- **Landing page is map-only.** Just the map of India with pins. Every other piece of UI (case list, filters, stats, legend, submission form) lives behind an icon click or a pin click — nothing else on the page by default.
- **The real India map matters.** Use actual state-boundary geometry, not a stylized/abstract placeholder — a wrong-looking map undermines trust in an accountability tool. Source used in the mockup: [`@svg-maps/india`](https://www.npmjs.com/package/@svg-maps/india) (npm, CC-BY-4.0, real state polygons, viewBox `0 0 612 696`) — credit it in the UI. For production, this is fine for a state-level view; if district/tehsil-level boundaries are needed later, that's a separate GIS data question (see §7).

---

## 3. v1 functionality

1. **Public submission** — paste an Instagram post/reel URL or upload media directly. No login required. Goes into a moderation queue, not published immediately.
2. **Location auto-matching** — transcribe video audio (speech-to-text, Hindi/Hinglish-capable) + parse caption text → fuzzy-match extracted place names against the official village/school gazetteer → present ranked candidate locations ("did you mean: X, 91% match?") for human confirmation. Never auto-assign without confirmation.
3. **De-duplication** — new submissions are checked against existing cases at the same (or a nearby-matched) location within a time window, using text similarity on caption/transcript. Likely duplicates get attached as a follow-up/update to the existing case instead of creating a new pin.
4. **Map display** — real map of India, pins colored by status (flagged / in progress / resolved), filterable by state/district/tehsil, by status, and by date range.
5. **Official data layers** — villages/schools and representatives sourced from official/trusted databases, not user-entered (see §6). Each location shows its sitting MLA, MP, and block-level official where available, with source + last-verified date.
6. **Case timeline** — every location has a dated history: initial flag → follow-ups → resolution claim → community/admin verification.
7. **Gap report** — computed view: official schools with zero submitted coverage, and flagged cases with no update in 90+ days. This is the actual "go audit here next" output, sortable by district/constituency, exportable as CSV.
8. **Moderation queue** — every submission (regardless of confidence of the auto-match) is reviewed by a human before it's public: confirm it's genuinely campaign-related, confirm/correct the location, classify as initial flag vs. update vs. resolution.

**Explicitly deferred to v2+:** CJP-account hashtag automation, browser extension, in-app share-sheet integration, ADR/MyNeta enrichment of representative profiles, multi-state scale beyond the pilot.

---

## 4. Data model

```
Location
 - id, name, type (school | village | tehsil)
 - official_school_id (UDISE+ code, if type=school)
 - village_lgd_code (Local Government Directory code, if type=village)
 - tehsil, district, state
 - lat, lng (from official geocoding, not inferred from the post itself)
 - constituency_assembly_id (-> Representative)
 - constituency_parliamentary_id (-> Representative)
 - block_panchayat_id (-> LocalOfficial)
 - location_source (official | unofficial_manual_pin)

Submission
 - id, location_id
 - source_type (instagram_url | direct_upload)
 - instagram_permalink, instagram_media_id (nullable)
 - caption_text, transcript_text, media_thumbnail_url
 - posted_at (from Instagram, if available)
 - submitted_by (user_id or "anonymous"), submitted_at
 - location_match_candidates[] (ranked, with confidence score)
 - status (pending_review | approved | rejected | flagged_duplicate)
 - moderator_id, moderated_at, moderator_notes

Timeline_Event  (chronological, per location)
 - id, location_id, submission_id (nullable, for manually-logged events)
 - event_type (initial_flag | update | official_response | resolution_claim | resolution_verified)
 - date, description, media_urls[]
 - verification_status (unverified | community_verified | admin_verified)

Representative
 - id, name, role (MLA | MP), constituency_name, constituency_id
 - party, term_start, term_end, source_url, last_verified_at

LocalOfficial
 - id, name, role (Sarpanch | Block officer | etc.), jurisdiction_id
 - source, last_verified_at

AuditFlag  (derived/computed, not user-entered)
 - location_id, flag_type (no_coverage | stale_no_update | conflicting_reports)
 - computed_at
```

---

## 5. Instagram ingestion — the actual mechanism (read carefully)

There is no automated crawler in v1. The pipeline is entirely human-initiated submission, assisted by NLP:

1. **Intake.** A person pastes an Instagram post/reel URL, or uploads media directly, into the public submission form.
2. **Render.** If a URL was given, use Instagram's public **oEmbed API** (no auth required, works for any public post) to pull a legitimate embeddable preview — thumbnail, caption, author — for display. This is the only "Instagram API" touchpoint in v1; it carries no rate-limit or account-risk exposure.
3. **Transcribe.** Run speech-to-text on the video (e.g. Whisper), with attention to Hindi/Hinglish/code-switched audio — that's the common case here, not clean English.
4. **Match.** Combine caption text + transcript text. Extract place-name-like tokens and fuzzy-match them (e.g. trigram similarity) against the official location gazetteer (§6) — not a generic NER model, since small villages won't be in general-purpose training data. Return a ranked list of candidate locations with confidence scores.
5. **Confirm.** Submitter or moderator picks from the ranked candidates via a type-ahead UI, or corrects it manually if nothing matches. This step is mandatory — the system suggests, it never auto-assigns.
6. **De-dupe check.** Before creating a new case, check for an existing case at the matched (or a nearby) location with similar caption/transcript text posted within a configurable window. If found, offer to attach as a follow-up instead of creating a duplicate pin.
7. **Queue.** Goes to moderation. On approval, it's published to the map as a new case or a new timeline event on an existing one.

**What was explicitly ruled out and why:**
- Automated hashtag crawling via CJP's own Graph API account — CJP does not want to risk the account, and the API is capped/limited anyway (30 hashtags/week, recent-media only, no location field).
- Third-party Instagram scraping outside the official API/oEmbed paths — ToS and legal risk, not appropriate for an NGO-facing tool.
- Browser extension for volunteer-assisted discovery — good idea, deferred to v2. Only works on desktop/mobile-web, not the native app, so it augments but doesn't replace the submission form.

---

## 6. Official data layers

| Layer | Suggested source | Notes |
|---|---|---|
| Schools | **UDISE+** (Unified District Information System for Education Plus, Ministry of Education) | School ID, name, location, facilities. Bulk access varies by state — verify current access method before building. |
| Villages / Tehsils / Panchayats | **Local Government Directory (LGD)**, Ministry of Panchayati Raj | Canonical hierarchy: village → block → tehsil → district → state. This is the backbone for `Location.village_lgd_code`. |
| MP (Lok Sabha) | Election Commission of India (ECI) + **PRS Legislative Research** | PRS publishes clean, structured sitting-member data — commonly used for civic apps like this. |
| MLA (State Assembly) | ECI + state assembly sites / PRS | Per-state; assembly constituency boundaries also from ECI. |
| Candidate background (assets, cases, education) | **ADR / MyNeta** | v2 — not required for v1. |
| Block/Panchayat leadership (Sarpanch, BDO, etc.) | State Panchayati Raj department portals | No single national database — treat as lowest-confidence layer, mark provenance + last-verified date, make correction submission easy. |

**Neutrality requirement:** this displays real, named political office-holders. Keep it strictly factual (name, role, constituency, term, source link, last-verified date), no editorializing, and make corrections easy — incumbency data goes stale after every election.

**Build a `RepresentativeDataSource` abstraction** so a source can be swapped without touching the rest of the app — government data portal availability changes.

---

## 7. Map data

The UI mockup uses **`@svg-maps/india`** (npm package, CC-BY-4.0 license), which provides real state-boundary SVG paths in a `0 0 612 696` viewBox with each state as a separate `<path id="xx">` element (e.g. `up`, `mp`, `hr`, `mh`). This is good enough for a state-level view and gives an honest, recognizable map shape rather than a stylized placeholder.

For district/tehsil-level boundary rendering (not required for pin placement, only if choropleth-by-district is wanted for the gap report later), that's a separate GIS data sourcing task — the LGD gives the codes/hierarchy but not necessarily polygon geometry; that would need to come from a GIS-specific source.

Pin coordinates in the mockup are placed by state-bbox estimation, not real geocoding — production pins should use actual lat/lng from the official location record (§4/§6), reprojected into whatever coordinate system the chosen map renderer uses.

---

## 8. Architecture

- **Frontend:** React (or plain HTML/CSS/JS as in the mockup) + real India map SVG/geo data. Marker clustering for dense districts if pin volume grows.
- **Backend:** Node/Express or Python/FastAPI — FastAPI is a good fit if the transcription/matching pipeline stays in Python.
- **Database:** PostgreSQL + PostGIS (needed for real geospatial queries — gap analysis, "schools within this tehsil," etc.).
- **Media storage:** submitted photos/videos → S3-compatible object storage. Instagram media itself stays embedded via oEmbed/permalink, not re-hosted.
- **Speech-to-text:** Whisper (or similar) as an async processing step on submission — needs decent Hindi/Hinglish handling.
- **Matching:** fuzzy string matching (trigram similarity) against the official gazetteer, not generic NER.
- **Auth:** optional for submitters (anonymous submission is fine, gated by moderation); role-based for moderators/admins.
- **Search/autocomplete:** Postgres full-text search or lightweight Elasticsearch over the LGD + UDISE+ location tables, for the location-confirmation UI.

---

## 9. UI direction (see attached mockup: `school-thik-karo-ui.html`)

- **Landing = map only.** Full-bleed map of India with colored pins (brick red = flagged, amber = in progress, moss green = resolved). No header bar, no stats, no list on load.
- **Everything else opens on click:**
  - Click a pin → right-side drawer: case title, location, representatives on record, dated timeline, source.
  - Click the list icon (top-right) → left-side panel: stats, status filter chips, search, full case list.
  - Click the key icon (bottom-left) → small legend popover.
  - Click "Submit a report" (bottom-right FAB) → modal: paste link/upload, see the auto-suggested location match, confirm, send for review.
  - Click the wordmark seal (top-left) → also opens the browse panel.
- **Visual language:** ledger/gazette aesthetic — warm paper background, serif display type, monospace for data/timestamps/labels, muted state boundary lines, status colors kept desaturated/earthy rather than bright alert colors, to read as "official record" rather than "warning dashboard."
- **Design tokens used:** paper `#EAE5D9`, ink `#22281F`, moss (resolved) `#2E4A38`, amber (in progress) `#B5691E`, brick (flagged) `#9B3B2C`.

---

## 10. Build phases

**Phase 1 — Core loop, one pilot state/district, no automation**
- Location DB seeded from LGD + UDISE+ for the pilot area.
- Representative DB seeded from PRS/ECI for the pilot area.
- Full-bleed map UI as described in §9, with the mock data replaced by real DB-backed pins.
- Submission form (URL via oEmbed + direct upload), speech-to-text + fuzzy-match location suggestion, moderation queue, timeline view.
- Gap report v1 (no-coverage only).

**Phase 2 — De-dupe, richer gap analysis**
- De-duplication logic against existing cases.
- Stale-gap and conflicting-report analysis.
- Representative rollup reporting.

**Phase 3 — Scale & extras**
- Multi-state expansion.
- CSV export for gap report.
- Optional: ADR/MyNeta enrichment, browser extension, share-sheet integration.

---

## 11. Open decisions to settle before/at build start

1. Which state(s)/district(s) for the pilot? (Mockup uses UP, MP, HR, MH as placeholder examples — not a real decision yet.)
2. Who moderates submissions, and what's the expected volume?
3. Is anonymous public submission allowed, or does every contributor need an account? (Given reported volunteer safety incidents — see §1 — leaning toward anonymous-by-default is worth strong consideration, not just an open question.)
4. How is "resolved" verified — one photo enough, or second-source/admin confirmation required before a pin turns green?
5. Legal/editorial sign-off on displaying named MLA/MP/local officials next to unresolved complaints — sensitive combination, worth a quick review before launch.
6. Whisper (or alternative) — self-hosted vs. API, and confirm Hindi/Hinglish transcription quality is good enough before committing to the matching pipeline design.

---

## 12. Non-goals for v1

- No real-time Instagram streaming/crawling.
- No automated fact-checking of resolution claims — verification stays human-driven.
- No scraping of Instagram outside the oEmbed path.
- No browser extension, no CJP-account automation.
