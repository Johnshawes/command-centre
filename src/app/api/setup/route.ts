import { NextRequest, NextResponse } from "next/server";
import { ensureTables } from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-setup-token");
  if (token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTables();
  return NextResponse.json({ status: "tables_created" });
}
