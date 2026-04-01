import { NextRequest, NextResponse } from "next/server";
import { ensureTables } from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-setup-token");
  if (token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTables();
    return NextResponse.json({ status: "tables_created" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
