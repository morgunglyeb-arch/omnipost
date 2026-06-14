import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import type { AppConfig, BrandVoice } from "./config.js";
import type { Source } from "./sources.js";

const MAX_SOURCE_CHARS = 6000;

export const RepurposedSchema = z.object({
  hooks: z.array(z.string().min(8).max(220)).min(3).max(3),
  x_thread: z.array(z.string().min(8).max(600)).min(3).max(10),
  linkedin_post: z.string().min(40).max(2800),
  instagram_caption: z.string().min(40).max(2200),
  hashtags: z.array(z.string().min(2).max(40)).min(3).max(20),
  pull_quotes: z.array(z.string().min(8).max(280)).min(3).max(5),
  newsletter_blurb: z.string().min(40).max(900),
});
export type Repurposed = z.infer<typeof RepurposedSchema>;

export interface RepurposedResult {
  data: Repurposed;
  degraded: boolean;
  provider: "anthropic" | "groq" | "fallback";
}

const SYSTEM_PROMPT = `You are a senior content strategist repurposing one long-form source into platform-native posts.

Hard rules:
- Match the provided brand voice exactly: tone, audience, do/don't list, language.
- Never fabricate facts, numbers, names, or quotes that are not in the source.
- No clichés: "in today's fast-paced world", "game-changer", "leverage synergies", "AI revolution", "unlock your potential", "next level".
- Be specific. Prefer concrete examples and one strong claim per post over vague generalities.
- Write in the brand's language. Do not switch language mid-text.

You will emit a single structured JSON object with these keys:
- "hooks": exactly 3 distinct opening lines (≤ 200 chars each).
- "x_thread": 5–8 tweets that work as a thread. Each tweet under 270 characters (code will enforce 280 and add 1/n numbering — do not number yourself, do not include hashtags).
- "linkedin_post": one cohesive post, 4–10 short paragraphs, no hashtags inline.
- "instagram_caption": engaging caption, may use line breaks and minimal emojis (≤ 3 total).
- "hashtags": 5–12 hashtags WITHOUT the # symbol, lowercase, no spaces.
- "pull_quotes": 3–5 quotable sentences pulled or paraphrased from the source.
- "newsletter_blurb": 80–180 word email-friendly recap ending with the brand CTA.

Return only the structured JSON. Do not add commentary outside it.`;

const TOOL_NAME = "emit_repurposed";
const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    hooks: {
      type: "array",
      items: { type: "string", maxLength: 220 },
      minItems: 3,
      maxItems: 3,
    },
    x_thread: {
      type: "array",
      items: { type: "string", maxLength: 600 },
      minItems: 3,
      maxItems: 10,
    },
    linkedin_post: { type: "string", maxLength: 2800 },
    instagram_caption: { type: "string", maxLength: 2200 },
    hashtags: {
      type: "array",
      items: { type: "string", maxLength: 40 },
      minItems: 3,
      maxItems: 20,
    },
    pull_quotes: {
      type: "array",
      items: { type: "string", maxLength: 280 },
      minItems: 3,
      maxItems: 5,
    },
    newsletter_blurb: { type: "string", maxLength: 900 },
  },
  required: [
    "hooks",
    "x_thread",
    "linkedin_post",
    "instagram_caption",
    "hashtags",
    "pull_quotes",
    "newsletter_blurb",
  ],
  additionalProperties: false,
};

function buildUserMessage(brand: BrandVoice, source: Source): string {
  const trimmed = source.text.length > MAX_SOURCE_CHARS
    ? source.text.slice(0, MAX_SOURCE_CHARS) + "\n\n[...source truncated for length...]"
    : source.text;
  return [
    "BRAND VOICE",
    `- Name: ${brand.name}`,
    `- Tone: ${brand.tone}`,
    `- Audience: ${brand.audience}`,
    `- CTA: ${brand.cta}`,
    `- Do: ${brand.do_list}`,
    `- Don't: ${brand.dont_list}`,
    `- Language: ${brand.language}`,
    "",
    `SOURCE TITLE: ${source.title ?? "(untitled)"}`,
    source.url ? `SOURCE URL: ${source.url}` : "",
    "",
    "SOURCE TEXT (truncated to ~6k chars):",
    trimmed,
    "",
    "Return only the structured JSON described in the system prompt.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function callAnthropic(
  cfg: AppConfig,
  brand: BrandVoice,
  source: Source,
): Promise<Repurposed> {
  const client = new Anthropic({ apiKey: cfg.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: cfg.ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: TOOL_NAME,
        description: "Emit the structured repurposed-content bundle.",
        input_schema: TOOL_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: buildUserMessage(brand, source) }],
  });
  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Anthropic response did not contain tool_use block.");
  }
  return RepurposedSchema.parse(toolUse.input);
}

async function callGroq(
  cfg: AppConfig,
  brand: BrandVoice,
  source: Source,
): Promise<Repurposed> {
  const client = new OpenAI({
    apiKey: cfg.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
  const res = await client.chat.completions.create({
    model: cfg.GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          buildUserMessage(brand, source) +
          "\n\nReturn ONLY a JSON object with keys: hooks, x_thread, linkedin_post, instagram_caption, hashtags, pull_quotes, newsletter_blurb.",
      },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Groq response was not valid JSON: ${(err as Error).message}`);
  }
  return RepurposedSchema.parse(parsed);
}

export function fallbackRepurposed(brand: BrandVoice, source: Source): Repurposed {
  const paragraphs = source.text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 60);

  const title = source.title ?? "What I learned this week";
  const lead = paragraphs[0] ?? source.text.slice(0, 280);
  const middle = paragraphs.slice(1, 6);

  const sentences = source.text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 240);

  const pullQuotes = uniq(sentences).slice(0, 5);
  while (pullQuotes.length < 3) pullQuotes.push(truncate(lead, 220));

  const hooks = [
    truncate(`${title} — here is what actually matters.`, 200),
    truncate(`Most takes on this miss the point. Here is the version that holds up.`, 200),
    truncate(`A quick walk-through of ${title.toLowerCase()} for ${brand.audience}.`, 200),
  ];

  const xThreadCore = [
    truncate(`${title}. A short thread.`, 260),
    ...middle.slice(0, 5).map((p) => truncate(p, 260)),
    truncate(brand.cta, 260),
  ];

  return {
    hooks,
    x_thread: xThreadCore.length >= 3 ? xThreadCore : [...xThreadCore, truncate(lead, 260)],
    linkedin_post: [title, "", lead, "", ...middle.slice(0, 3), "", brand.cta]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2700),
    instagram_caption: [title, "", truncate(lead, 1200), "", brand.cta]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2100),
    hashtags: ["aitools", "contentstrategy", "smallbusiness", "automation", "founders"],
    pull_quotes: pullQuotes,
    newsletter_blurb: [truncate(lead, 600), brand.cta].join("\n\n").slice(0, 880),
  };
}

export async function repurpose(
  cfg: AppConfig,
  brand: BrandVoice,
  source: Source,
): Promise<RepurposedResult> {
  try {
    if (cfg.LLM_PROVIDER === "groq") {
      return { data: await callGroq(cfg, brand, source), degraded: false, provider: "groq" };
    }
    return { data: await callAnthropic(cfg, brand, source), degraded: false, provider: "anthropic" };
  } catch (err) {
    console.warn(`[ai] LLM call failed, using fallback: ${(err as Error).message}`);
    return { data: fallbackRepurposed(brand, source), degraded: true, provider: "fallback" };
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
