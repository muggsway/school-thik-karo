import { pool } from "@/lib/db";
import MapApp, { type CaseRow, type StateOption } from "@/components/MapApp";

export const dynamic = "force-dynamic";

async function getCases(): Promise<CaseRow[]> {
  const { rows } = await pool.query(`
    SELECT
      c.id, c.school_name, c.status, c.instagram_url, c.notes,
      c.map_x, c.map_y, c.created_at, c.posted_at,
      v.name AS village_name, s.name AS subdistrict_name,
      d.name AS district_name, st.name AS state_name
    FROM cases c
    LEFT JOIN villages v ON v.code = c.village_code
    JOIN subdistricts s ON s.code = c.subdistrict_code
    JOIN districts d ON d.code = c.district_code
    JOIN states st ON st.code = c.state_code
    ORDER BY c.created_at DESC
  `);
  return rows as CaseRow[];
}

async function getStates(): Promise<StateOption[]> {
  const { rows } = await pool.query("SELECT code, name FROM states ORDER BY name");
  return rows as StateOption[];
}

export default async function Home() {
  const [cases, states] = await Promise.all([getCases(), getStates()]);
  return <MapApp initialCases={cases} states={states} />;
}
