import stateMap from "@/data/state-map.json";

export type StateMapEntry = {
  svgId: string;
  svgName: string;
  bbox: [number, number, number, number];
};

export const STATE_MAP = stateMap as unknown as Record<string, StateMapEntry>;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function placeInState(stateCode: number, seed: string): { x: number; y: number } {
  const entry = STATE_MAP[String(stateCode)];
  if (!entry) return { x: 306, y: 348 };
  const [minX, minY, maxX, maxY] = entry.bbox;
  const marginX = (maxX - minX) * 0.12;
  const marginY = (maxY - minY) * 0.12;
  const rx = hash(seed + ":x");
  const ry = hash(seed + ":y");
  return {
    x: minX + marginX + rx * (maxX - minX - marginX * 2),
    y: minY + marginY + ry * (maxY - minY - marginY * 2),
  };
}
