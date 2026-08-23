/**
 * LGD village names carry official census tags as suffixes — [rural]/[urban]
 * classification, or a plain number when a tehsil has two villages with the
 * same base name. Strips those for display. Leaves named-hamlet suffixes like
 * "(Naravane)" alone since those are real disambiguating identity, not tags.
 */
export function cleanVillageName(raw: string): string {
  return raw
    .replace(/\s*\[(rural|urban)\]\s*$/i, "")
    .replace(/\s*\((?:\d+|ct|m\.?\s?cl\.?|nac|og|n\.?a\.?)\)\s*$/i, "")
    .trim();
}
