import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { placeLocation } from "@/lib/statemap";

export async function GET() {
  const { rows } = await pool.query(`
    SELECT
      c.id, c.school_name, c.status, c.instagram_url, c.notes,
      c.map_x, c.map_y, c.created_at,
      v.name AS village_name, s.name AS subdistrict_name,
      d.name AS district_name, st.name AS state_name
    FROM cases c
    JOIN villages v ON v.code = c.village_code
    JOIN subdistricts s ON s.code = c.subdistrict_code
    JOIN districts d ON d.code = c.district_code
    JOIN states st ON st.code = c.state_code
    ORDER BY c.created_at DESC
  `);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { schoolName, stateCode, districtCode, subdistrictCode, villageCode, instagramUrl, notes } = body;

  if (!instagramUrl || !stateCode || !districtCode || !subdistrictCode || !villageCode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { x, y } = placeLocation(Number(stateCode), Number(subdistrictCode), String(villageCode));

  const { rows } = await pool.query(
    `INSERT INTO cases
      (school_name, state_code, district_code, subdistrict_code, village_code, status, instagram_url, notes, map_x, map_y)
     VALUES ($1,$2,$3,$4,$5,'flagged',$6,$7,$8,$9)
     RETURNING id`,
    [schoolName || null, stateCode, districtCode, subdistrictCode, villageCode, instagramUrl, notes || null, x, y]
  );

  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}
