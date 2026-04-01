import { NextResponse } from "next/server";
import { query, ensureTables } from "@/lib/db";

export async function GET() {
  await ensureTables();

  try {
    const lastDigest = await query(
      "SELECT id, digest_type, created_at FROM research_digests ORDER BY created_at DESC LIMIT 1"
    );

    const lastBrief = await query(
      "SELECT id, status, created_at FROM content_briefs ORDER BY created_at DESC LIMIT 1"
    );

    const pendingIdeas = await query(
      "SELECT COUNT(*) as count FROM ideas WHERE status = 'pending'"
    );

    return NextResponse.json({
      last_digest: lastDigest.rows[0] || null,
      last_brief: lastBrief.rows[0] || null,
      pending_ideas: Number(pendingIdeas.rows[0]?.count || 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
