import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(
    "SELECT code, name FROM states ORDER BY name"
  );
  return NextResponse.json(rows);
}
