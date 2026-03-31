import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const RESEARCH_BOT_URL = process.env.RESEARCH_BOT_URL;

  if (!RESEARCH_BOT_URL) {
    return NextResponse.json(
      { error: "RESEARCH_BOT_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No idea provided" }, { status: 400 });
    }

    const res = await fetch(`${RESEARCH_BOT_URL}/ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const RESEARCH_BOT_URL = process.env.RESEARCH_BOT_URL;
  const RESEARCH_BOT_TOKEN = process.env.RESEARCH_BOT_TOKEN || "";

  if (!RESEARCH_BOT_URL) {
    return NextResponse.json(
      { error: "RESEARCH_BOT_URL not configured", ideas: [] },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `${RESEARCH_BOT_URL}/ideas?token=${encodeURIComponent(RESEARCH_BOT_TOKEN)}`,
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, ideas: [] }, { status: 500 });
  }
}
