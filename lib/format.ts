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

/**
 * Instagram's own share sheet sometimes hands out a link with `/reels/`
 * (plural) instead of the `/reel/` permalink format their embed widget
 * actually requires -- the embed silently renders nothing, no error, for
 * a plural-path URL. Also strips stray leading/trailing whitespace, which
 * has the same silent-failure effect (e.g. from a copy-paste that grabs a
 * trailing space).
 */
export function normalizeInstagramUrl(raw: string): string {
  return raw.trim().replace(/\/reels\//i, "/reel/");
}
