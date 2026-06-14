import { brandVoice, loadConfig, assertLLMReady, type AppConfig, type BrandVoice } from "./config.js";
import { pickSource, type Source } from "./sources.js";
import { fallbackRepurposed, repurpose, type Repurposed, type RepurposedResult } from "./ai.js";
import { enforceConstraints, parsePlatforms, type Platform } from "./enforce.js";
import { planSchedule } from "./schedule.js";
import { writeOutputs } from "./outputs.js";
import { dropCache, hashSource, readCache, writeCache } from "./cache.js";

interface CliFlags {
  dry: boolean;
  force: boolean;
  mock: boolean;
  schedule: boolean;
  days?: number;
  input?: string;
  url?: string;
  platformsRaw?: string;
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = { dry: false, force: false, mock: false, schedule: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (a === "--dry") flags.dry = true;
    else if (a === "--force") flags.force = true;
    else if (a === "--mock") flags.mock = true;
    else if (a === "--schedule") flags.schedule = true;
    else if (a === "--days") flags.days = Number(argv[++i]);
    else if (a.startsWith("--days=")) flags.days = Number(a.slice("--days=".length));
    else if (a === "--input") flags.input = argv[++i];
    else if (a.startsWith("--input=")) flags.input = a.slice("--input=".length);
    else if (a === "--url") flags.url = argv[++i];
    else if (a.startsWith("--url=")) flags.url = a.slice("--url=".length);
    else if (a === "--platforms") flags.platformsRaw = argv[++i];
    else if (a.startsWith("--platforms=")) flags.platformsRaw = a.slice("--platforms=".length);
  }
  return flags;
}

export interface RunOptions extends Partial<CliFlags> {}

export async function runRepurpose(opts: RunOptions = {}): Promise<void> {
  const cfg = loadConfig();
  const brand = brandVoice(cfg);
  const flags: CliFlags = {
    dry: opts.dry ?? false,
    force: opts.force ?? false,
    mock: opts.mock ?? false,
    schedule: opts.schedule ?? false,
    days: opts.days,
    input: opts.input,
    url: opts.url,
    platformsRaw: opts.platformsRaw,
  };
  const platforms = parsePlatforms(flags.platformsRaw);

  console.log(
    `[omnipost] starting (provider=${cfg.LLM_PROVIDER}, mock=${flags.mock}, dry=${flags.dry}, force=${flags.force}, platforms=${platforms.join("+")})`,
  );

  const source = await readSource(cfg, flags);
  console.log(`[omnipost] source: "${source.title ?? "(untitled)"}" — ${source.text.length} chars`);

  const brandKey = JSON.stringify(brand);
  const hash = hashSource(source.text, brandKey);

  if (flags.force) await dropCache(cfg.CACHE_DIR, hash);

  let llmResult: RepurposedResult;
  let cached = false;

  const cacheHit = flags.force ? null : await readCache(cfg.CACHE_DIR, hash);
  if (cacheHit) {
    console.log(`[omnipost] cache hit (${hash}) — skipping LLM call`);
    llmResult = { data: cacheHit.data, degraded: false, provider: cacheHit.provider };
    cached = true;
  } else if (flags.mock) {
    console.log(`[omnipost] --mock: using deterministic fallback (no network)`);
    llmResult = { data: fallbackRepurposed(brand, source), degraded: true, provider: "fallback" };
  } else {
    try {
      assertLLMReady(cfg);
    } catch (err) {
      console.warn(`[omnipost] ${(err as Error).message} — using fallback.`);
      llmResult = { data: fallbackRepurposed(brand, source), degraded: true, provider: "fallback" };
      await persistResult(cfg, hash, source, llmResult);
      return finalize(cfg, brand, source, llmResult, platforms, flags, cached);
    }
    llmResult = await repurpose(cfg, brand, source);
    await persistResult(cfg, hash, source, llmResult);
  }

  await finalize(cfg, brand, source, llmResult, platforms, flags, cached);
}

async function finalize(
  cfg: AppConfig,
  _brand: BrandVoice,
  source: Source,
  result: RepurposedResult,
  platforms: Platform[],
  flags: CliFlags,
  cached: boolean,
): Promise<void> {
  const bundle = enforceConstraints(result.data);

  const schedule = flags.schedule
    ? planSchedule(bundle, {
        days: flags.days ?? cfg.SCHEDULE_DAYS,
        platforms,
      })
    : undefined;

  const artifacts = {
    source,
    bundle,
    platforms,
    schedule,
    meta: {
      provider: result.provider,
      degraded: result.degraded,
      cached,
      generated_at: new Date().toISOString(),
      brand_name: cfg.BRAND_NAME,
    },
  };

  if (flags.dry) {
    console.log("\n--- DRY RUN OUTPUT ---\n");
    const { renderMarkdown } = await import("./outputs.js");
    console.log(renderMarkdown(artifacts));
    console.log("\n--- END ---\n");
    return;
  }

  const written = await writeOutputs(cfg.OUTPUT_DIR, artifacts);
  console.log(`[omnipost] wrote ${written.json}`);
  console.log(`[omnipost] wrote ${written.markdown}`);
  if (written.csv) console.log(`[omnipost] wrote ${written.csv}`);
  if (written.ics) console.log(`[omnipost] wrote ${written.ics}`);

  const tweets = bundle.x_thread;
  const overflow = tweets.filter((t) => t.length > 280);
  console.log(
    `[omnipost] sanity: ${tweets.length} tweets, longest=${Math.max(0, ...tweets.map((t) => t.length))} chars, over-280=${overflow.length}, hashtags=${bundle.hashtags.length}`,
  );
  if (overflow.length) {
    console.warn(`[omnipost] WARN: ${overflow.length} tweet(s) exceed 280 — investigate enforce.ts`);
  }
}

async function readSource(cfg: AppConfig, flags: CliFlags): Promise<Source> {
  const source = pickSource({
    input: flags.input,
    url: flags.url,
    defaultPath: cfg.INPUT_PATH,
  });
  return source.read();
}

async function persistResult(
  cfg: AppConfig,
  hash: string,
  source: Source,
  result: RepurposedResult,
): Promise<void> {
  if (result.degraded) return;
  await writeCache(cfg.CACHE_DIR, {
    hash,
    cached_at: new Date().toISOString(),
    provider: result.provider,
    source_title: source.title,
    source_url: source.url,
    data: result.data,
  });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const flags = parseFlags(process.argv.slice(2));
  runRepurpose(flags).catch((err) => {
    console.error("[omnipost] fatal:", err);
    process.exit(1);
  });
}

export type { Repurposed };
