import { config } from "dotenv";
import { Pool } from "pg";
config({ path: ".env.local" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { rows } = await pool.query(`select left(body,38) as body, created_at from announcements order by created_at desc limit 3`);
rows.forEach(r=>console.log("  ", r.created_at.toISOString().slice(11,19), "|", r.body));
await pool.end();
