import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const { rows } = await pool.query(
    `SELECT
       v.code AS village_code, v.name AS village_name,
       s.code AS subdistrict_code, s.name AS subdistrict_name,
       d.code AS district_code, d.name AS district_name,
       st.code AS state_code, st.name AS state_name
     FROM villages v
     JOIN subdistricts s ON s.code = v.subdistrict_code
     JOIN districts d ON d.code = v.district_code
     JOIN states st ON st.code = v.state_code
     WHERE v.name ILIKE $1
     ORDER BY (v.name ILIKE $2) DESC, length(v.name), v.name
     LIMIT 25`,
    [`%${q}%`, `${q}%`]
  );
  return NextResponse.json(rows);
}
