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
  "hook_1": {
    "line_1": "First text line — 3-5 words max",
    "line_2": "Second text line — completes the contradiction",
    "curiosity_line": "Middle screen text — creates tension",
    "end_line_1": "Punchy insight",
    "end_line_2": "Harder-hitting closer"
  },
  "hook_2": {
    "line_1": "Different angle, same contradiction format",
    "line_2": "Completes it",
    "curiosity_line": "Builds tension differently",
    "end_line_1": "Punchy insight",
    "end_line_2": "Closer"
  },
  "hook_3": {
    "line_1": "Most provocative version",
    "line_2": "Sharpest contradiction",
    "curiosity_line": "Most tension",
    "end_line_1": "Punchy insight",
    "end_line_2": "Strongest closer"
  },
  "caption": "Full Instagram caption — see structure rules below",
  "hashtags": "#bakerybusiness #foodbusiness #entrepreneurmindset (MUST start each with #)",
  "why_this_week": "One sentence — what makes this timely",
  "angle": "💰/🧠/⏱/🌍 and one-sentence description"
}

CAPTION STRUCTURE (mandatory, in this order):
1. HOOK — strong scroll-stopping first line, repeats reel hook, contradiction format
2. RELATABILITY — personal experience line, feels real ("I did this for YEARS.")
3. SCENARIO BUILD — paint a quick picture, then contrast with "But there's no money left."
4. AUTHORITY — include naturally: "After building not one, but TWO 7-figure food businesses… with another on the way…"
5. CORE INSIGHT — one clear lesson (Revenue ≠ profit / Margins decide everything)
6. BREAKDOWN — 3-4 short bullet points
7. CONSEQUENCE — what happens if not fixed
8. RESOLUTION — the shift ("Once I fixed this…")
9. FINAL LINE — strong and memorable
10. CTA — only sometimes ("Comment 'FOCUS'")

Caption writing rules:
- Short lines, lots of spacing, mobile readable
- Use line breaks between each section (\\n\\n)
- CAPITALS for emphasis (not overused)
- Direct, honest, slightly confrontational
- Never robotic or guru-sounding
- Goal: reader thinks 'This is literally me'

RULES:
- All 3 hooks must follow "Why [positive]... but [negative reality]" contradiction format
- Each hook must be genuinely different — different angle, not just different wording
- Every line_1 and line_2 must be 5 words or fewer (it's text on screen)
- Each hook has its OWN curiosity line, end_line_1, and end_line_2
- Must make a bakery owner feel called out
- No vague words: no "struggling", "stressful", "journey", "passion"
- Prioritise money/profit angle unless research strongly suggests another angle
- EVERY hashtag MUST start with # — e.g. #bakerybusiness not bakerybusiness
- Respond with ONLY the JSON object, no markdown, no code fences`;
}

export interface HookVariation {
  line_1: string;
  line_2: string;
  curiosity_line: string;
  end_line_1: string;
  end_line_2: string;
}

export interface ContentBrief {
  hook_1: HookVariation;
  hook_2: HookVariation;
  hook_3: HookVariation;
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
    max_tokens: 3000,
    messages: [{ role: "user", content: buildPrompt(researchDigest) }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .replace(/```json\s*/, "")
    .replace(/```\s*$/, "")
    .trim();

  const brief: ContentBrief = JSON.parse(text);
  return brief;
}
