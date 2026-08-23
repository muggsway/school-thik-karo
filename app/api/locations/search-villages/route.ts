import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

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

  const { rows } = await pool.query(
    `SELECT village_code, village_name, subdistrict_code, subdistrict_name,
            district_code, district_name, state_code, state_name
     FROM village_search
     WHERE search_vector @@ to_tsquery('simple', $1)
     ORDER BY ts_rank(search_vector, to_tsquery('simple', $1)) DESC, length(village_name), village_name
     LIMIT 30`,
    [tsQuery]
  );
  return NextResponse.json(rows);
}
