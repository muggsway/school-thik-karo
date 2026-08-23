import stateMap from "@/data/state-map.json";
import subdistrictPoints from "@/data/subdistrict-points.json";
import districtPoints from "@/data/district-points.json";
import stateRealBBox from "@/data/state-real-bbox.json";

export type StateMapEntry = {
  svgId: string;
  svgName: string;
  bbox: [number, number, number, number];
};

export type GeoPoint = { name: string; lon: number; lat: number; stateCode: number };

export const STATE_MAP = stateMap as unknown as Record<string, StateMapEntry>;
export const SUBDISTRICT_POINTS = subdistrictPoints as unknown as Record<string, GeoPoint>;
export const DISTRICT_POINTS = districtPoints as unknown as Record<string, GeoPoint>;
export const STATE_REAL_BBOX = stateRealBBox as unknown as Record<string, [number, number, number, number]>;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function jitter(x: number, y: number, rangeX: number, rangeY: number, seed: string) {
  const rx = hash(seed + ":x") - 0.5;
  const ry = hash(seed + ":y") - 0.5;
  return { x: x + rx * rangeX, y: y + ry * rangeY };
}

/** Reprojects a real lon/lat point into the map's SVG space via a per-state bounding-box transform. */
export function lonLatToSvg(stateCode: number, lon: number, lat: number): { x: number; y: number } | null {
  const entry = STATE_MAP[String(stateCode)];
  const realBBox = STATE_REAL_BBOX[String(stateCode)];
  if (!entry || !realBBox) return null;
  const [svgMinX, svgMinY, svgMaxX, svgMaxY] = entry.bbox;
  const [minLon, minLat, maxLon, maxLat] = realBBox;
  const fracX = (lon - minLon) / (maxLon - minLon || 1);
  const fracY = (lat - minLat) / (maxLat - minLat || 1);
  return {
    x: svgMinX + fracX * (svgMaxX - svgMinX),
    y: svgMinY + (1 - fracY) * (svgMaxY - svgMinY),
  };
}

export function stateLabelPosition(stateCode: number): { x: number; y: number } | null {
  const entry = STATE_MAP[String(stateCode)];
  if (!entry) return null;
  const [minX, minY, maxX, maxY] = entry.bbox;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/**
 * Places a case pin, preferring the most precise real anchor available:
 * tehsil anchor (jittered around, if there's a specific village), then the
 * tehsil anchor exactly (tehsil-only case), then the district anchor
 * (district/city-only case, e.g. Kolkata, which has no LGD tehsils at all),
 * finally a pseudo-random point within the state's shape if nothing matched.
 * Anchors come from geoBoundaries, reprojected into the map's SVG space via
 * a per-state bounding-box transform — see scripts/match-geo.mjs.
 */
export function placeLocation(
  stateCode: number,
  districtCode: number,
  subdistrictCode: number | null,
  villageCode: string | null
): { x: number; y: number } {
  const entry = STATE_MAP[String(stateCode)];
  if (!entry) return { x: 306, y: 348 };
  const [svgMinX, svgMinY, svgMaxX, svgMaxY] = entry.bbox;

  const subPoint = subdistrictCode ? SUBDISTRICT_POINTS[String(subdistrictCode)] : undefined;
  if (subPoint) {
    const svg = lonLatToSvg(stateCode, subPoint.lon, subPoint.lat);
    if (svg) {
      // No specific village to jitter around: place tehsil-only cases exactly
      // at the tehsil's real anchor point instead of pretending to precision
      // we don't have.
      if (!villageCode) return svg;
      return jitter(svg.x, svg.y, (svgMaxX - svgMinX) * 0.012, (svgMaxY - svgMinY) * 0.012, villageCode);
    }
  }

  const distPoint = DISTRICT_POINTS[String(districtCode)];
  if (distPoint) {
    const svg = lonLatToSvg(stateCode, distPoint.lon, distPoint.lat);
    if (svg) return svg;
  }

  const seed = villageCode ?? String(subdistrictCode ?? `district:${districtCode}`);
  const marginX = (svgMaxX - svgMinX) * 0.12;
  const marginY = (svgMaxY - svgMinY) * 0.12;
  const rx = hash(districtCode + seed + ":x");
  const ry = hash(districtCode + seed + ":y");
  return {
    x: svgMinX + marginX + rx * (svgMaxX - svgMinX - marginX * 2),
    y: svgMinY + marginY + ry * (svgMaxY - svgMinY - marginY * 2),
  };
}
