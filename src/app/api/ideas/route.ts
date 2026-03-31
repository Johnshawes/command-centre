import { NextRequest, NextResponse } from "next/server";

const RESEARCH_BOT_URL = process.env.RESEARCH_BOT_URL!;
const RESEARCH_BOT_TOKEN = process.env.RESEARCH_BOT_TOKEN || "";

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "No idea provided" }, { status: 400 });
  }

  // POST idea to Railway research bot
  const res = await fetch(`${RESEARCH_BOT_URL}/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim() }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";

  // Fetch pending ideas from Railway research bot
  const res = await fetch(
    `${RESEARCH_BOT_URL}/ideas?token=${encodeURIComponent(RESEARCH_BOT_TOKEN || token)}`,
  );

  const data = await res.json();
  return NextResponse.json(data);
}
