import { NextRequest, NextResponse } from "next/server";
import { sql, ensureTables } from "@/lib/db";

export async function GET(req: NextRequest) {
  await ensureTables();

  const filter = req.nextUrl.searchParams.get("status");

  try {
    let result;
    if (filter) {
      result = await sql`
        SELECT * FROM content_briefs
        WHERE status = ${filter}
        ORDER BY created_at DESC
        LIMIT 30
      `;
    } else {
      result = await sql`
        SELECT * FROM content_briefs
        ORDER BY created_at DESC
        LIMIT 30
      `;
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

    const result = await sql`
      UPDATE content_briefs
      SET status = ${status}, reviewed_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json({ brief: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
