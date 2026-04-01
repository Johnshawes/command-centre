import Anthropic from "@anthropic-ai/sdk";

const FOUNDER_PROFILE = `John Hawes — a UK food and hospitality entrepreneur who CURRENTLY runs a multi-company group:

- Co-Managing Director of Watermoor Meat Supply Ltd (trading as Jesse Smith & WJ Castles) — a wholesale and catering butchery business turning over £10M+ as part of the wider group. Runs this alongside his brother David.
- Co-Founder & CEO of KNEAD — a multi-site bakery and hospitality brand with 5 core sites, a central production unit, and a bakery/sandwich van. On track for nearly £5M revenue this year.
- Co-Founder & CEO of LARDON — a European small plates restaurant launching June 2026. Ingredient-led, wood-fired cooking.
- Founder of Flavour Founders — a high-ticket education programme (£5,800) helping bakery and café owners get profitable and free from daily operations.

He has NOT sold any of these businesses. He still runs them daily. Real experience, hard lessons, no theory. He is an active operator — not an ex-operator turned coach.`;

const BRAND_CONTEXT = `
WHO YOU ARE WRITING FOR:
${FOUNDER_PROFILE}

PERSONAL BRAND PILLARS:
1. Food & Drink Business (PRIMARY) — bakery/café growth, profit, margins, labour, systems, scaling
2. Care Less (SECONDARY) — life perspective, freedom, time, YOLO, not overvaluing seriousness

BRAND VOICE: Direct, honest, slightly confrontational, insight-led. NO fluff.

REEL FORMAT:
- 6–9 seconds, text-led, no talking
- Structure: Thumbnail (face) → First 2-3 secs (clean visual + text hook) → Middle (curiosity line) → End (1-2 punchy insight lines)
- Hook style: "Why [positive/neutral]... but [negative reality]"

CONTENT ROTATION:
💰 Money (profit, margins, cash)
🧠 Control (systems, chaos, structure)
⏱ Time (freedom, burnout, stepping away)
🌍 Care Less (occasional)

STYLE REFERENCE — @mrfourtoeight (Blake Rocha):
This is the #1 brand inspiration. Match this energy:
- Personal transformation storytelling — real journey, real struggles, real wins
- Faith + purpose-driven entrepreneurship — not just chasing money
- Raw, honest, direct — zero corporate polish, zero guru energy
- Storytelling massively outperforms generic advice
- Mix personal story with practical insight — never one without the other
- Conversation starters that pull engagement ("Do you agree? 👇")

WHAT WORKS: Contradiction hooks, money topics, personal story, specific wording, clean visuals, one clear idea, conversation starters
WHAT DOESN'T: Vague language, repetitive phrasing, talking head intros, long explanations, guru energy, generic motivation
`;

function buildPrompt(researchDigest: string): string {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateShort = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `You are the content strategist for Flavour Founders, a UK food entrepreneur personal brand.

${BRAND_CONTEXT}

Today is ${today}.

Here is today's research digest:
${researchDigest || "No research digest available — use your knowledge of UK food business trends."}

PRIORITY RULE: If the research digest contains a "JOHN'S IDEAS — VALIDATED" section with 🟢 Strong ideas, you MUST base today's reel on one of those ideas. John's own ideas always take priority over general research. Only fall back to research insights if no ideas were submitted or all were rated 🔴 Skip.

Based on the strongest insight from the research digest (or John's top-rated idea), generate TODAY'S REEL BRIEF.

You MUST respond with valid JSON matching this exact schema:
{
  "hook_1": "Hook A — Line 1 + Line 2 combined (the on-screen text)",
  "hook_2": "Hook B — Line 1 + Line 2 combined (the on-screen text)",
  "hook_3": "Hook C — Line 1 + Line 2 combined (the on-screen text)",
  "curiosity_line": "The middle screen text that creates tension",
  "end_line_1": "Punchy insight line",
  "end_line_2": "Harder-hitting closer",
  "caption": "Full Instagram caption following the mandatory structure",
  "hashtags": "Space-separated hashtags",
  "why_this_week": "One sentence — what makes this timely",
  "angle": "💰/🧠/⏱/🌍 and one-sentence description"
}

RULES:
- All 3 hooks must follow "Why [positive]... but [negative reality]" contradiction format
- Each hook must be genuinely different — different angle, not just different wording
- Every hook line must be 5 words or fewer (it's text on screen)
- Must make a bakery owner feel called out
- No vague words: no "struggling", "stressful", "journey", "passion"
- Prioritise money/profit angle unless research strongly suggests another angle
- Caption must follow the 10-step mandatory structure
- Respond with ONLY the JSON object, no markdown, no code fences`;
}

export interface ContentBrief {
  hook_1: string;
  hook_2: string;
  hook_3?: string;
  curiosity_line: string;
  end_line_1: string;
  end_line_2: string;
  caption: string;
  hashtags: string;
  why_this_week: string;
  angle?: string;
}

export async function generateContentBrief(
  researchDigest: string
): Promise<ContentBrief> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: buildPrompt(researchDigest) }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const brief: ContentBrief = JSON.parse(text);
  return brief;
}
