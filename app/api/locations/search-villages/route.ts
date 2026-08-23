import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export type LocationResult = {
  level: "village" | "subdistrict" | "district";
  village_code: number | null;
  village_name: string | null;
  subdistrict_code: number | null;
  subdistrict_name: string | null;
  district_code: number;
  district_name: string;
  state_code: number;
  state_name: string;
};

function buildTsQuery(q: string): string | null {
  const tokens = q
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const tsQuery = buildTsQuery(q);
  if (!tsQuery) return NextResponse.json([]);

  const villageRows = (
    await pool.query(
      `SELECT 'village' AS level, village_code, village_name, subdistrict_code, subdistrict_name,
              district_code, district_name, state_code, state_name
       FROM village_search
       WHERE search_vector @@ to_tsquery('simple', $1)
       ORDER BY ts_rank(search_vector, to_tsquery('simple', $1)) DESC, length(village_name), village_name
       LIMIT 20`,
      [tsQuery]
    )
  ).rows as LocationResult[];

  // Fuzzy fallback for typos/spelling variants: only kicks in when the exact
  // search comes up empty, since trigram matching is looser and would just
  // add noise on top of already-good exact results.
  let fuzzyRows: LocationResult[] = [];
  if (villageRows.length === 0) {
    fuzzyRows = (
      await pool.query(
        `SELECT 'village' AS level, village_code, village_name, subdistrict_code, subdistrict_name,
                district_code, district_name, state_code, state_name
         FROM village_search
         WHERE village_name % $1
         ORDER BY similarity(village_name, $1) DESC
         LIMIT 15`,
        [q]
      )
    ).rows as LocationResult[];
  }

  const subdistrictRows = (
    await pool.query(
      `SELECT 'subdistrict' AS level, NULL::bigint AS village_code, NULL::text AS village_name,
              s.code AS subdistrict_code, s.name AS subdistrict_name,
              d.code AS district_code, d.name AS district_name,
              st.code AS state_code, st.name AS state_name
       FROM subdistricts s
       JOIN districts d ON d.code = s.district_code
       JOIN states st ON st.code = s.state_code
       WHERE to_tsvector('simple', s.name || ' ' || d.name || ' ' || st.name) @@ to_tsquery('simple', $1)
       LIMIT 5`,
      [tsQuery]
    )
  ).rows as LocationResult[];

  const districtRows = (
    await pool.query(
      `SELECT 'district' AS level, NULL::bigint AS village_code, NULL::text AS village_name,
              NULL::int AS subdistrict_code, NULL::text AS subdistrict_name,
              d.code AS district_code, d.name AS district_name,
              st.code AS state_code, st.name AS state_name
       FROM districts d
       JOIN states st ON st.code = d.state_code
       WHERE to_tsvector('simple', d.name || ' ' || st.name) @@ to_tsquery('simple', $1)
       LIMIT 5`,
      [tsQuery]
    )
  ).rows as LocationResult[];

  // Exact/prefix matches (village, then tehsil, then district) always rank
  // above fuzzy suggestions -- fuzzy is a last resort for typos, not a
  // substitute for a real match that exists.
  return NextResponse.json([...villageRows, ...subdistrictRows, ...districtRows, ...fuzzyRows]);
}
