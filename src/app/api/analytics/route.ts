import { NextResponse } from "next/server";
import { query, ensureTables } from "@/lib/db";

export async function GET() {
  await ensureTables();

  try {
    const result = await query(
      "SELECT id, content, created_at FROM research_digests WHERE digest_type = 'reel_review' ORDER BY created_at DESC LIMIT 7"
    );

    // Parse content if it's a string
    const reviews = result.rows.map((r: Record<string, unknown>) => ({
      ...r,
      content:
        typeof r.content === "string" ? JSON.parse(r.content as string) : r.content,
    }));

    return NextResponse.json({ reviews });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, reviews: [] }, { status: 500 });
  }
}
