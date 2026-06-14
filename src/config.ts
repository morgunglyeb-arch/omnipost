import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  LLM_PROVIDER: z.enum(["anthropic", "groq"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),

  BRAND_NAME: z.string().default("OmniPost Studio"),
  BRAND_TONE: z.string().default("clear, confident, friendly-expert, no hype, no clichés"),
  BRAND_AUDIENCE: z.string().default("small-business owners and indie founders evaluating AI tooling"),
  BRAND_CTA: z.string().default("Reply with your biggest content bottleneck — happy to brainstorm."),
  BRAND_DO: z
    .string()
    .default("specific examples, concrete numbers, plain English, one strong claim per post"),
  BRAND_DONT: z
    .string()
    .default("in today's fast-paced world, game-changer, leverage synergies, AI revolution"),
  BRAND_LANGUAGE: z.string().default("en-US"),

  INPUT_PATH: z.string().default("data/source.md"),
  OUTPUT_DIR: z.string().default("data/out"),
  CACHE_DIR: z.string().default("data/cache"),

  SCHEDULE_TIMEZONE: z.string().default("America/New_York"),
  SCHEDULE_DAYS: z.coerce.number().int().positive().max(60).default(7),
});

export type AppConfig = z.infer<typeof schema>;

export interface BrandVoice {
  name: string;
  tone: string;
  audience: string;
  cta: string;
  do_list: string;
  dont_list: string;
  language: string;
}

export function brandVoice(cfg: AppConfig): BrandVoice {
  return {
    name: cfg.BRAND_NAME,
    tone: cfg.BRAND_TONE,
    audience: cfg.BRAND_AUDIENCE,
    cta: cfg.BRAND_CTA,
    do_list: cfg.BRAND_DO,
    dont_list: cfg.BRAND_DONT,
    language: cfg.BRAND_LANGUAGE,
  };
}

export function loadConfig(): AppConfig {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export function assertLLMReady(cfg: AppConfig): void {
  if (cfg.LLM_PROVIDER === "anthropic" && !cfg.ANTHROPIC_API_KEY) {
    throw new Error("LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.");
  }
  if (cfg.LLM_PROVIDER === "groq" && !cfg.GROQ_API_KEY) {
    throw new Error("LLM_PROVIDER=groq but GROQ_API_KEY is not set.");
  }
}
