import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const subdistrictCode = new URL(req.url).searchParams.get("subdistrict");
  if (!subdistrictCode) return NextResponse.json([], { status: 400 });
  const { rows } = await pool.query(
    "SELECT code, name FROM villages WHERE subdistrict_code = $1 ORDER BY name",
    [subdistrictCode]
  );
  return NextResponse.json(rows);
}
