import { NextRequest, NextResponse, after } from "next/server";
import { query, ensureTables } from "@/lib/db";
import { generateContentBrief } from "@/lib/content-generator";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-api-token") || req.nextUrl.searchParams.get("token");
  if (token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = await req.json();
  const digestType = body.digest_type || "daily";
  const digestContent = body.content || "";

  // Store the digest (works for daily, weekly, and reel_review)
  const digestResult = await query(
    "INSERT INTO research_digests (digest_type, content) VALUES ($1, $2) RETURNING id, created_at",
    [digestType, JSON.stringify(body)]
  );

  const digestId = digestResult.rows[0].id;

  // Reel reviews just get stored — no brief generation needed
  if (digestType === "reel_review") {
    return NextResponse.json({
      status: "stored",
      digest_id: digestId,
      type: "reel_review",
    });
  }

  // Mark all pending ideas as researched (they've been included in this digest)
  await query(
    "UPDATE ideas SET status = 'researched', researched_at = NOW() WHERE status = 'pending'"
  );

  // Generate brief AFTER response is sent (runs in background on Vercel)
  after(async () => {
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
    } catch (err) {
      console.error("Brief generation failed:", err);
    }
  });

  return NextResponse.json({
    status: "stored",
    digest_id: digestId,
    brief_generation: "auto_triggered",
  });
}
