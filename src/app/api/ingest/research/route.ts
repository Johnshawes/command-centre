import { NextRequest, NextResponse } from "next/server";
import { query, ensureTables } from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-api-token") || req.nextUrl.searchParams.get("token");
  if (token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const body = await req.json();
  const digestType = body.digest_type || "daily";

  const result = await query(
    "INSERT INTO research_digests (digest_type, content) VALUES ($1, $2) RETURNING id, created_at",
    [digestType, JSON.stringify(body)]
  );

  return NextResponse.json({
    status: "stored",
    id: result.rows[0].id,
    created_at: result.rows[0].created_at,
  });
}
