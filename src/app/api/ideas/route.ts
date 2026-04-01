import { NextRequest, NextResponse } from "next/server";
import { query, ensureTables } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ensureTables();

  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No idea provided" }, { status: 400 });
    }

    const result = await query(
      "INSERT INTO ideas (text) VALUES ($1) RETURNING id, text, status, created_at",
      [text.trim()]
    );

    // Forward to research bot (must await — Vercel kills process after response)
    const RESEARCH_BOT_URL = process.env.RESEARCH_BOT_URL;
    let forwarded = false;
    if (RESEARCH_BOT_URL) {
      try {
        const fwd = await fetch(`${RESEARCH_BOT_URL}/ideas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        });
        forwarded = fwd.ok;
      } catch {
        // Research bot unreachable — idea is still saved locally
      }
    }

    return NextResponse.json({
      status: "stored",
      idea: result.rows[0],
      forwarded,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  await ensureTables();

  try {
    const result = await query(
      "SELECT id, text, status, created_at, researched_at FROM ideas ORDER BY created_at DESC LIMIT 50"
    );

    return NextResponse.json({ ideas: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, ideas: [] }, { status: 500 });
  }
}
