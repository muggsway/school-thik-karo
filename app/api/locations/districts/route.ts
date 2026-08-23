import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const stateCode = new URL(req.url).searchParams.get("state");
  if (!stateCode) return NextResponse.json([], { status: 400 });
  const { rows } = await pool.query(
    "SELECT code, name FROM districts WHERE state_code = $1 ORDER BY name",
    [stateCode]
  );
  return NextResponse.json(rows);
}
