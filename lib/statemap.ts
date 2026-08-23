import stateMap from "@/data/state-map.json";
import subdistrictPoints from "@/data/subdistrict-points.json";
import stateRealBBox from "@/data/state-real-bbox.json";

export type StateMapEntry = {
  svgId: string;
  svgName: string;
  bbox: [number, number, number, number];
};

export const STATE_MAP = stateMap as unknown as Record<string, StateMapEntry>;
const SUBDISTRICT_POINTS = subdistrictPoints as unknown as Record<string, [number, number]>;
const STATE_REAL_BBOX = stateRealBBox as unknown as Record<string, [number, number, number, number]>;

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

/**
 * Places a case pin. Prefers a real tehsil-level anchor point (from geoBoundaries,
 * reprojected into the map's SVG space via a per-state bounding-box transform),
 * falling back to a pseudo-random point within the state's shape when no tehsil
 * anchor was matched (~13% of tehsils, mostly ones with LGD/geoBoundaries name
 * mismatches — see scripts/match-geo.mjs).
 */
export function placeLocation(
  stateCode: number,
  subdistrictCode: number,
  villageCode: string
): { x: number; y: number } {
  const entry = STATE_MAP[String(stateCode)];
  if (!entry) return { x: 306, y: 348 };
  const [svgMinX, svgMinY, svgMaxX, svgMaxY] = entry.bbox;

  const point = SUBDISTRICT_POINTS[String(subdistrictCode)];
  const realBBox = STATE_REAL_BBOX[String(stateCode)];

  if (point && realBBox) {
    const [lon, lat] = point;
    const [minLon, minLat, maxLon, maxLat] = realBBox;
    const fracX = (lon - minLon) / (maxLon - minLon || 1);
    const fracY = (lat - minLat) / (maxLat - minLat || 1);
    const x = svgMinX + fracX * (svgMaxX - svgMinX);
    const y = svgMinY + (1 - fracY) * (svgMaxY - svgMinY);
    return jitter(x, y, (svgMaxX - svgMinX) * 0.012, (svgMaxY - svgMinY) * 0.012, villageCode);
  }

  const marginX = (svgMaxX - svgMinX) * 0.12;
  const marginY = (svgMaxY - svgMinY) * 0.12;
  const rx = hash(subdistrictCode + villageCode + ":x");
  const ry = hash(subdistrictCode + villageCode + ":y");
  return {
    x: svgMinX + marginX + rx * (svgMaxX - svgMinX - marginX * 2),
    y: svgMinY + marginY + ry * (svgMaxY - svgMinY - marginY * 2),
  };
}
