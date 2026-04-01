import { NextRequest, NextResponse } from "next/server";
import { query, ensureTables } from "@/lib/db";
import { generateContentBrief } from "@/lib/content-generator";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-api-token") || req.nextUrl.searchParams.get("token");
  if (token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = await req.json();
  const digestType = body.digest_type || "daily";
  const digestContent = body.content || "";

  // Store the research digest
  const digestResult = await query(
    "INSERT INTO research_digests (digest_type, content) VALUES ($1, $2) RETURNING id, created_at",
    [digestType, JSON.stringify(body)]
  );

  const digestId = digestResult.rows[0].id;

  // Generate content brief from the digest (replaces content bot)
  try {
    const brief = await generateContentBrief(digestContent);

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
        digestId,
        JSON.stringify(brief),
      ]
    );

    return NextResponse.json({
      status: "stored_and_generated",
      digest_id: digestId,
      brief_generated: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      status: "stored",
      digest_id: digestId,
      brief_generated: false,
      brief_error: message,
    });
  }
}
