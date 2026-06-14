import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EnforcedBundle, Platform } from "./enforce.js";
import { formatHashtagLine } from "./enforce.js";
import type { ScheduledPost } from "./schedule.js";
import { toCsv, toIcs } from "./schedule.js";
import type { Source } from "./sources.js";

export interface RunArtifacts {
  source: Source;
  bundle: EnforcedBundle;
  platforms: Platform[];
  schedule?: ScheduledPost[];
  meta: {
    provider: "anthropic" | "groq" | "fallback";
    degraded: boolean;
    cached: boolean;
    generated_at: string;
    brand_name: string;
  };
}

export async function writeOutputs(outputDir: string, artifacts: RunArtifacts): Promise<{
  json: string;
  markdown: string;
  csv?: string;
  ics?: string;
}> {
  await mkdir(outputDir, { recursive: true });

  const jsonPath = join(outputDir, "omnipost.json");
  const mdPath = join(outputDir, "omnipost.md");
  await writeFile(jsonPath, JSON.stringify(artifacts, null, 2), "utf8");
  await writeFile(mdPath, renderMarkdown(artifacts), "utf8");

  const result: { json: string; markdown: string; csv?: string; ics?: string } = {
    json: jsonPath,
    markdown: mdPath,
  };

  if (artifacts.schedule && artifacts.schedule.length) {
    const csvPath = join(outputDir, "calendar.csv");
    const icsPath = join(outputDir, "calendar.ics");
    await writeFile(csvPath, toCsv(artifacts.schedule), "utf8");
    await writeFile(icsPath, toIcs(artifacts.schedule, artifacts.meta.brand_name), "utf8");
    result.csv = csvPath;
    result.ics = icsPath;
  }

  return result;
}

export function renderMarkdown(a: RunArtifacts): string {
  const { bundle, platforms, schedule, meta, source } = a;
  const wants = new Set(platforms);
  const parts: string[] = [];

  parts.push(`# ${meta.brand_name} — repurposed posts`);
  parts.push("");
  parts.push(
    `> Source: **${source.title ?? "(untitled)"}**` +
      (source.url ? ` · ${source.url}` : "") +
      ` · provider: \`${meta.provider}\`` +
      (meta.degraded ? " · _degraded fallback_" : "") +
      (meta.cached ? " · _from cache_" : ""),
  );
  parts.push(`> Generated: ${meta.generated_at}`);
  parts.push("");

  parts.push("## Hooks");
  for (const h of bundle.hooks) parts.push(`- ${h}`);
  parts.push("");

  if (wants.has("x")) {
    parts.push("## X / Twitter thread");
    parts.push("");
    bundle.x_thread.forEach((t, i) => {
      parts.push(`**Tweet ${i + 1}** (${t.length} chars)`);
      parts.push("");
      parts.push(quote(t));
      parts.push("");
    });
  }

  if (wants.has("linkedin")) {
    parts.push("## LinkedIn");
    parts.push("");
    parts.push(quote(bundle.linkedin_post));
    parts.push("");
  }

  if (wants.has("instagram")) {
    parts.push("## Instagram");
    parts.push("");
    parts.push(quote(bundle.instagram_caption));
    parts.push("");
    parts.push(`**Hashtags (${bundle.hashtags.length}):** ${formatHashtagLine(bundle.hashtags)}`);
    parts.push("");
  }

  if (wants.has("newsletter")) {
    parts.push("## Newsletter blurb");
    parts.push("");
    parts.push(quote(bundle.newsletter_blurb));
    parts.push("");
  }

  parts.push("## Pull quotes");
  for (const q of bundle.pull_quotes) parts.push(`- "${q}"`);
  parts.push("");

  if (schedule && schedule.length) {
    parts.push("## Content calendar");
    parts.push("");
    parts.push("| When (UTC) | Platform | Preview |");
    parts.push("| --- | --- | --- |");
    for (const p of schedule) {
      parts.push(
        `| ${p.datetime.replace("T", " ").replace(":00.000Z", " UTC")} | ${p.platform} | ${preview(p.content)} |`,
      );
    }
    parts.push("");
  }

  return parts.join("\n");
}

function quote(s: string): string {
  return s
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function preview(s: string): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return (flat.length > 80 ? flat.slice(0, 79) + "…" : flat).replace(/\|/g, "\\|");
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}
