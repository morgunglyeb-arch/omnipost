/**
 * End-to-end smoke test. Runs the whole pipeline in --mock mode (no network),
 * then asserts on every property the Definition of Done cares about:
 *   - all tweets ≤ 280 chars
 *   - thread is numbered 1/n .. n/n
 *   - hashtags are deduplicated and capped at 10
 *   - schedule covers all requested platforms
 *   - JSON / Markdown / CSV / .ics artifacts are non-empty
 *   - cache hit on second run, .ics is RFC-5545-ish
 *   - fallback path produces a usable bundle when cache is cleared
 *
 * Exit code is the number of failures (0 = green).
 */

import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { brandVoice, loadConfig } from "../src/config.js";
import { FileSource } from "../src/sources.js";
import { hashSource } from "../src/cache.js";
import { runRepurpose } from "../src/index.js";

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

const checks: Check[] = [];

function expect(name: string, cond: boolean, detail = ""): void {
  checks.push({ name, pass: cond, detail });
}

async function readJson<T = unknown>(path: string): Promise<T> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as T;
}

async function fileSize(path: string): Promise<number> {
  try {
    const raw = await readFile(path, "utf8");
    return raw.length;
  } catch {
    return 0;
  }
}

interface Bundle {
  x_thread: string[];
  linkedin_post: string;
  instagram_caption: string;
  hashtags: string[];
  pull_quotes: string[];
  newsletter_blurb: string;
  hooks: string[];
}

interface Artifacts {
  source: { title?: string; text: string };
  bundle: Bundle;
  platforms: string[];
  schedule?: { platform: string; datetime: string; content: string }[];
  meta: { provider: string; degraded: boolean; cached: boolean };
}

async function clean(...paths: string[]): Promise<void> {
  for (const p of paths) await rm(p, { force: true, recursive: true });
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const brand = brandVoice(cfg);
  const out = cfg.OUTPUT_DIR;
  const cache = cfg.CACHE_DIR;

  console.log("[smoke] resetting data/out and data/cache …");
  await clean(out, cache);
  await mkdir(out, { recursive: true });
  await mkdir(cache, { recursive: true });

  // --- 1. fallback path (no cache, --mock) ---
  console.log("[smoke] step 1 — fallback path (no cache, --mock)");
  await runRepurpose({ mock: true, schedule: true, days: 7 });
  let artifacts = await readJson<Artifacts>(join(out, "omnipost.json"));
  expect("fallback: degraded:true", artifacts.meta.degraded);
  expect("fallback: provider=fallback", artifacts.meta.provider === "fallback");
  expect(
    "fallback: ≥3 tweets",
    artifacts.bundle.x_thread.length >= 3,
    `${artifacts.bundle.x_thread.length}`,
  );
  expect(
    "fallback: all tweets ≤ 280",
    artifacts.bundle.x_thread.every((t) => t.length <= 280),
    `max=${Math.max(0, ...artifacts.bundle.x_thread.map((t) => t.length))}`,
  );
  expect(
    "fallback: hashtags deduped",
    artifacts.bundle.hashtags.length === new Set(artifacts.bundle.hashtags).size,
  );

  // --- 2. seeded cache (gen-demo) ---
  console.log("[smoke] step 2 — seed cache via gen:demo …");
  const { genDemo } = await import("./gen-demo.js");
  await genDemo();
  // gen-demo writes the cache file; verify it lands where we expect
  const source = await new FileSource(cfg.INPUT_PATH).read();
  const hash = hashSource(source.text, JSON.stringify(brand));
  const cachePath = join(cache, `${hash}.json`);
  expect("cache file exists", (await fileSize(cachePath)) > 0, cachePath);

  // --- 3. run with seeded cache + schedule ---
  console.log("[smoke] step 3 — run with seeded cache + --schedule …");
  await clean(out);
  await mkdir(out, { recursive: true });
  await runRepurpose({ mock: true, schedule: true, days: 7 });
  artifacts = await readJson<Artifacts>(join(out, "omnipost.json"));

  expect("cached: provider=anthropic", artifacts.meta.provider === "anthropic");
  expect("cached: cached=true", artifacts.meta.cached);
  expect("cached: degraded=false", artifacts.meta.degraded === false);

  const tweets = artifacts.bundle.x_thread;
  expect("cached: ≥5 tweets", tweets.length >= 5, `${tweets.length}`);
  expect(
    "cached: all tweets ≤ 280",
    tweets.every((t) => t.length <= 280),
    `max=${Math.max(0, ...tweets.map((t) => t.length))}`,
  );
  const numbered = tweets.every((t, i) => t.endsWith(`${i + 1}/${tweets.length}`));
  expect("cached: thread numbered 1/n … n/n", numbered);

  expect(
    "cached: hashtags ≤ 10",
    artifacts.bundle.hashtags.length <= 10,
    `${artifacts.bundle.hashtags.length}`,
  );
  expect(
    "cached: hashtags deduped",
    artifacts.bundle.hashtags.length === new Set(artifacts.bundle.hashtags).size,
  );
  expect(
    "cached: hashtags lowercased + no #",
    artifacts.bundle.hashtags.every((h) => h === h.toLowerCase() && !h.startsWith("#")),
  );

  expect("cached: 3 hooks", artifacts.bundle.hooks.length === 3);
  expect(
    "cached: LinkedIn ≤ 3000 chars",
    artifacts.bundle.linkedin_post.length <= 3000,
  );
  expect(
    "cached: Instagram ≤ 2200 chars",
    artifacts.bundle.instagram_caption.length <= 2200,
  );

  // schedule
  const sched = artifacts.schedule ?? [];
  expect("schedule: non-empty", sched.length > 0, `${sched.length}`);
  const platforms = new Set(sched.map((s) => s.platform));
  expect(
    "schedule: all 4 platforms covered",
    ["x", "linkedin", "instagram", "newsletter"].every((p) => platforms.has(p)),
    Array.from(platforms).join(","),
  );
  const sortedAsc = sched.every(
    (s, i) => i === 0 || s.datetime >= (sched[i - 1]?.datetime ?? ""),
  );
  expect("schedule: sorted ascending by datetime", sortedAsc);

  // artifact files
  expect("write: omnipost.json non-empty", (await fileSize(join(out, "omnipost.json"))) > 1000);
  expect("write: omnipost.md non-empty", (await fileSize(join(out, "omnipost.md"))) > 1000);
  expect("write: calendar.csv non-empty", (await fileSize(join(out, "calendar.csv"))) > 100);
  expect("write: calendar.ics non-empty", (await fileSize(join(out, "calendar.ics"))) > 100);

  const ics = await readFile(join(out, "calendar.ics"), "utf8");
  expect("ics: BEGIN:VCALENDAR header", ics.startsWith("BEGIN:VCALENDAR"));
  expect("ics: END:VCALENDAR footer", ics.trimEnd().endsWith("END:VCALENDAR"));
  expect(
    "ics: one VEVENT per scheduled post",
    (ics.match(/BEGIN:VEVENT/g) ?? []).length === sched.length,
  );

  // --- 4. --force drops cache, falls back when --mock ---
  console.log("[smoke] step 4 — --force drops cache …");
  await runRepurpose({ mock: true, force: true, dry: true });
  // dry run does not rewrite omnipost.json, so just check the cache file is gone
  expect("force: cache file removed", (await fileSize(cachePath)) === 0);

  // ----- report -----
  console.log("");
  console.log("=== smoke test results ===");
  let failed = 0;
  for (const c of checks) {
    const tag = c.pass ? "  ok " : "FAIL ";
    const detail = c.detail ? `   (${c.detail})` : "";
    console.log(`${tag} ${c.name}${detail}`);
    if (!c.pass) failed++;
  }
  console.log("");
  console.log(`${checks.length - failed}/${checks.length} passed`);
  if (failed > 0) {
    console.error(`[smoke] ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("[smoke] all green");
}

main().catch((err) => {
  console.error("[smoke] fatal:", err);
  process.exit(2);
});
