import { NextRequest, NextResponse } from "next/server";
import { sql, ensureTables } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ensureTables();

  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No idea provided" }, { status: 400 });
    }

    // Store locally first — Command Centre is source of truth
    const result = await sql`
      INSERT INTO ideas (text) VALUES (${text.trim()})
      RETURNING id, text, status, created_at
    `;

    // Forward to research bot async (fire and forget)
    const RESEARCH_BOT_URL = process.env.RESEARCH_BOT_URL;
    if (RESEARCH_BOT_URL) {
      fetch(`${RESEARCH_BOT_URL}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      }).catch(() => {});
    }

    return NextResponse.json({
      status: "stored",
      idea: result.rows[0],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  await ensureTables();

  try {
    const result = await sql`
      SELECT id, text, status, created_at, researched_at
      FROM ideas
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ ideas: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, ideas: [] }, { status: 500 });
  }
}
