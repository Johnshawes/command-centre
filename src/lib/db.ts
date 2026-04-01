import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

export async function query(text: string, params?: unknown[]) {
  const res = await pool.query(text, params);
  return res;
}

export async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS ideas (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      researched_at TIMESTAMPTZ,
      research_data JSONB
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS research_digests (
      id SERIAL PRIMARY KEY,
      digest_type TEXT NOT NULL DEFAULT 'daily',
      content JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS content_briefs (
      id SERIAL PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      hook_1 TEXT,
      hook_2 TEXT,
      curiosity_line TEXT,
      end_line_1 TEXT,
      end_line_2 TEXT,
      caption TEXT,
      hashtags TEXT,
      why_this_week TEXT,
      source_idea_id INTEGER REFERENCES ideas(id),
      source_digest_id INTEGER REFERENCES research_digests(id),
      raw_content JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )
  `);
}
