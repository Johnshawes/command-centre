import { NextRequest, NextResponse } from "next/server";
import { query, ensureTables } from "@/lib/db";
import { generateContentBrief } from "@/lib/content-generator";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Allow calls from the browser (same origin) or with API token
  const token = req.headers.get("x-api-token") || req.nextUrl.searchParams.get("token");
  const referer = req.headers.get("referer") || "";
  const isFromApp = referer.includes("command-centre");
  if (!isFromApp && token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  // Find the most recent digest that doesn't have a brief yet
  const pending = await query(
    `SELECT rd.id, rd.content
     FROM research_digests rd
     LEFT JOIN content_briefs cb ON cb.source_digest_id = rd.id
     WHERE cb.id IS NULL
     ORDER BY rd.created_at DESC
     LIMIT 1`
  );

  if (pending.rows.length === 0) {
    return NextResponse.json({ status: "no_pending_digests" });
  }

  const digest = pending.rows[0];
  const digestContent = typeof digest.content === "string"
    ? JSON.parse(digest.content)
    : digest.content;

  try {
    const brief = await generateContentBrief(digestContent.content || "");

    await query(
      `INSERT INTO content_briefs (
        hook_1, hook_2, caption, hashtags, why_this_week,
        source_digest_id, raw_content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `${brief.hook_1.line_1} ${brief.hook_1.line_2}`,
        `${brief.hook_2.line_1} ${brief.hook_2.line_2}`,
        brief.caption,
        brief.hashtags,
        brief.why_this_week,
        digest.id,
        JSON.stringify(brief),
      ]
    );

    return NextResponse.json({
      status: "generated",
      digest_id: digest.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
