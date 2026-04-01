import { NextRequest, NextResponse } from "next/server";
import { query, ensureTables } from "@/lib/db";

export async function GET(req: NextRequest) {
  await ensureTables();

  const filter = req.nextUrl.searchParams.get("status");

  try {
    // Auto-delete rejected briefs older than 7 days
    await query(
      "DELETE FROM content_briefs WHERE status = 'rejected' AND reviewed_at < NOW() - INTERVAL '7 days'"
    );

    let result;
    if (filter) {
      result = await query(
        "SELECT * FROM content_briefs WHERE status = $1 ORDER BY created_at DESC LIMIT 30",
        [filter]
      );
    } else {
      result = await query(
        "SELECT * FROM content_briefs ORDER BY created_at DESC LIMIT 30"
      );
    }

    return NextResponse.json({ briefs: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, briefs: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await ensureTables();

  try {
    const { id, status } = await req.json();

    if (!id || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid id or status" }, { status: 400 });
    }

    const result = await query(
      "UPDATE content_briefs SET status = $1, reviewed_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json({ brief: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
