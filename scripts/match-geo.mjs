import fs from "fs";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import pointOnFeature from "@turf/point-on-feature";
import bbox from "@turf/bbox";

// Run from the repo root. SCRATCH must contain the LGD *_clean.csv files
// (see gen-state-map.mjs) and geoBoundaries-IND-ADM{1,2,3}.geojson downloaded
// from https://www.geoboundaries.org — neither is committed to this repo.
const APP = process.cwd();
const SCRATCH = process.env.GEO_SCRATCH_DIR || APP;

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/^THE\s+/, "")
    .replace(/[().]/g, "")
    .replace(/\b(DISTRICT|TEHSIL|TALUKA|TALUK|BLOCK|CITY|RURAL|URBAN|SADAR|PART|PT)\b/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function bestMatch(name, candidates) {
  const nname = normalize(name);
  let exact = candidates.find((c) => c._norm === nname);
  if (exact) return { candidate: exact, score: 1 };
  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(nname, c._norm);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (!best) return null;
  const maxLen = Math.max(nname.length, best._norm.length) || 1;
  const score = 1 - bestDist / maxLen;
  return { candidate: best, score };
}

function loadGeojson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function featureBBox(f) {
  return bbox(f);
}

function pip(pt, feature) {
  const geom = feature.geometry;
  if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
    return booleanPointInPolygon(pt, feature);
  }
  return false;
}

console.log("Loading LGD tables...");
const scratch = SCRATCH;
const statesCsv = fs.readFileSync(`${scratch}/states_clean.csv`, "utf8").split("\n").slice(1).filter(Boolean);
const districtsCsv = fs.readFileSync(`${scratch}/districts_clean.csv`, "utf8").split("\n").slice(1).filter(Boolean);
const subdistrictsCsv = fs.readFileSync(`${scratch}/subdistricts_clean.csv`, "utf8").split("\n").slice(1).filter(Boolean);

const lgdStates = statesCsv.map((l) => {
  const [code, ...rest] = l.split(",");
  return { code: Number(code), name: rest.join(",").trim(), _norm: normalize(rest.join(",").trim()) };
});
const lgdDistricts = districtsCsv.map((l) => {
  const [code, state_code, ...rest] = l.split(",");
  const name = rest.join(",").trim();
  return { code: Number(code), state_code: Number(state_code), name, _norm: normalize(name) };
});
const lgdSubdistricts = subdistrictsCsv.map((l) => {
  const [code, district_code, state_code, ...rest] = l.split(",");
  const name = rest.join(",").trim();
  return { code: Number(code), district_code: Number(district_code), state_code: Number(state_code), name, _norm: normalize(name) };
});

console.log("Loading geoBoundaries ADM1/2/3...");
const adm1 = loadGeojson(`${scratch}/adm1.geojson`).features;
const adm2 = loadGeojson(`${scratch}/adm2.geojson`).features;
const adm3 = loadGeojson(`${scratch}/adm3.geojson`).features;

// --- Step 1: match ADM1 -> LGD state ---
let adm1Matched = 0;
for (const f of adm1) {
  const m = bestMatch(f.properties.shapeName, lgdStates);
  if (m && m.score > 0.5) {
    f._lgdStateCode = m.candidate.code;
    f._bbox = featureBBox(f);
    adm1Matched++;
  }
}
console.log(`ADM1 matched: ${adm1Matched}/${adm1.length}`);

// real-world lon/lat bbox per LGD state code
const stateRealBBox = {};
for (const f of adm1) {
  if (f._lgdStateCode != null) stateRealBBox[f._lgdStateCode] = f._bbox;
}

// precompute bboxes for candidate filtering
for (const f of adm1) f._bbox = f._bbox || featureBBox(f);
for (const f of adm2) f._bbox = featureBBox(f);
for (const f of adm3) f._bbox = featureBBox(f);

function bboxContains(bb, pt) {
  return pt[0] >= bb[0] && pt[0] <= bb[2] && pt[1] >= bb[1] && pt[1] <= bb[3];
}

function findContainer(pt, candidates) {
  const hits = candidates.filter((f) => bboxContains(f._bbox, pt));
  for (const f of hits) {
    if (pip(pt, f)) return f;
  }
  return hits[0] || null;
}

// --- Step 2: ADM2 (district) -> containing ADM1 state, then fuzzy match district name ---
console.log("Matching ADM2 districts...");
let adm2Matched = 0;
for (const f of adm2) {
  const pof = pointOnFeature(f);
  const pt = pof.geometry.coordinates;
  f._point = pt;
  const parent = findContainer(pt, adm1);
  if (!parent || parent._lgdStateCode == null) continue;
  const stateCode = parent._lgdStateCode;
  const candidates = lgdDistricts.filter((d) => d.state_code === stateCode);
  const m = bestMatch(f.properties.shapeName, candidates);
  if (m && m.score > 0.55) {
    f._lgdDistrictCode = m.candidate.code;
    f._lgdStateCode = stateCode;
    adm2Matched++;
  }
}
console.log(`ADM2 matched: ${adm2Matched}/${adm2.length}`);

const matchedAdm2 = adm2.filter((f) => f._lgdDistrictCode != null);

const districtByCode = new Map(lgdDistricts.map((d) => [d.code, d]));
const subdistrictByCode = new Map(lgdSubdistricts.map((s) => [s.code, s]));

const districtPoint = {}; // lgd district code -> { name, lon, lat, stateCode }
for (const f of matchedAdm2) {
  const d = districtByCode.get(f._lgdDistrictCode);
  districtPoint[f._lgdDistrictCode] = { name: d.name, lon: f._point[0], lat: f._point[1], stateCode: d.state_code };
}
console.log(`Unique LGD districts with a point: ${Object.keys(districtPoint).length} / ${lgdDistricts.length}`);

// --- Step 3: ADM3 (subdistrict) -> containing ADM2 district, then fuzzy match subdistrict name ---
console.log("Matching ADM3 subdistricts...");
let adm3Matched = 0;
const subdistrictPoint = {}; // lgd subdistrict code -> { name, lon, lat }
for (const f of adm3) {
  const pof = pointOnFeature(f);
  const pt = pof.geometry.coordinates;
  const parent = findContainer(pt, matchedAdm2);
  if (!parent) continue;
  const districtCode = parent._lgdDistrictCode;
  const candidates = lgdSubdistricts.filter((s) => s.district_code === districtCode);
  const m = bestMatch(f.properties.shapeName, candidates);
  if (m && m.score > 0.5) {
    const s = subdistrictByCode.get(m.candidate.code);
    subdistrictPoint[m.candidate.code] = { name: s.name, lon: pt[0], lat: pt[1], stateCode: s.state_code };
    adm3Matched++;
  }
}
console.log(`ADM3 matched: ${adm3Matched}/${adm3.length}`);
console.log(`Unique LGD subdistricts with a point: ${Object.keys(subdistrictPoint).length} / ${lgdSubdistricts.length}`);

fs.writeFileSync(`${APP}/data/subdistrict-points.json`, JSON.stringify(subdistrictPoint));
fs.writeFileSync(`${APP}/data/district-points.json`, JSON.stringify(districtPoint));
fs.writeFileSync(`${APP}/data/state-real-bbox.json`, JSON.stringify(stateRealBBox));
console.log("Done.");
