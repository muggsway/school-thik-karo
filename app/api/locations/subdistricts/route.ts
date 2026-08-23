import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const districtCode = new URL(req.url).searchParams.get("district");
  if (!districtCode) return NextResponse.json([], { status: 400 });
  const { rows } = await pool.query(
    "SELECT code, name FROM subdistricts WHERE district_code = $1 ORDER BY name",
    [districtCode]
  );
  return NextResponse.json(rows);
}
