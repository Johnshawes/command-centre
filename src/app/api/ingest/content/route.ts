import { NextRequest, NextResponse } from "next/server";
import { sql, ensureTables } from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-api-token") || req.nextUrl.searchParams.get("token");
  if (token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = await req.json();

  const result = await sql`
    INSERT INTO content_briefs (
      hook_1, hook_2, curiosity_line, end_line_1, end_line_2,
      caption, hashtags, why_this_week, raw_content
    ) VALUES (
      ${body.hook_1 || null},
      ${body.hook_2 || null},
      ${body.curiosity_line || null},
      ${body.end_line_1 || null},
      ${body.end_line_2 || null},
      ${body.caption || null},
      ${body.hashtags || null},
      ${body.why_this_week || null},
      ${JSON.stringify(body)}
    )
    RETURNING id, created_at
  `;

  return NextResponse.json({
    status: "stored",
    id: result.rows[0].id,
    created_at: result.rows[0].created_at,
  });
}
