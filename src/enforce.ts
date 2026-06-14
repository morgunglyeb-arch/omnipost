import type { Repurposed } from "./ai.js";

export const LIMITS = {
  tweet: 280,
  linkedin: 3000,
  instagramCaption: 2200,
  hashtagsMax: 10,
  newsletter: 900,
} as const;

export type Platform = "x" | "linkedin" | "instagram" | "newsletter";

export interface EnforcedBundle {
  hooks: string[];
  x_thread: string[];
  linkedin_post: string;
  instagram_caption: string;
  hashtags: string[];
  pull_quotes: string[];
  newsletter_blurb: string;
}

export function enforceConstraints(input: Repurposed): EnforcedBundle {
  const hashtags = normalizeHashtags(input.hashtags).slice(0, LIMITS.hashtagsMax);
  const x_thread = numberThread(splitThreadToTweetLimit(input.x_thread));
  const linkedin_post = normalizeMarkdownForPlain(input.linkedin_post).slice(0, LIMITS.linkedin);
  const instagram_caption = normalizeMarkdownForPlain(input.instagram_caption).slice(
    0,
    LIMITS.instagramCaption,
  );
  const newsletter_blurb = normalizeMarkdownForPlain(input.newsletter_blurb).slice(
    0,
    LIMITS.newsletter,
  );
  const hooks = input.hooks.map((h) => normalizeMarkdownForPlain(h).slice(0, 220));
  const pull_quotes = input.pull_quotes.map((q) => normalizeMarkdownForPlain(q).slice(0, 280));

  return {
    hooks,
    x_thread,
    linkedin_post,
    instagram_caption,
    hashtags,
    pull_quotes,
    newsletter_blurb,
  };
}

export function selectPlatforms<T extends EnforcedBundle>(
  bundle: T,
  platforms: Platform[],
): Partial<T> {
  const all: Platform[] = ["x", "linkedin", "instagram", "newsletter"];
  const want = new Set(platforms.length ? platforms : all);
  const out: Partial<T> = { ...bundle };
  if (!want.has("x")) delete (out as Partial<EnforcedBundle>).x_thread;
  if (!want.has("linkedin")) delete (out as Partial<EnforcedBundle>).linkedin_post;
  if (!want.has("instagram")) {
    delete (out as Partial<EnforcedBundle>).instagram_caption;
    delete (out as Partial<EnforcedBundle>).hashtags;
  }
  if (!want.has("newsletter")) delete (out as Partial<EnforcedBundle>).newsletter_blurb;
  return out;
}

export function parsePlatforms(raw: string | undefined): Platform[] {
  if (!raw) return ["x", "linkedin", "instagram", "newsletter"];
  const all = new Set<Platform>(["x", "linkedin", "instagram", "newsletter"]);
  const out: Platform[] = [];
  for (const part of raw.split(",").map((s) => s.trim().toLowerCase())) {
    if (all.has(part as Platform) && !out.includes(part as Platform)) {
      out.push(part as Platform);
    }
  }
  return out.length ? out : ["x", "linkedin", "instagram", "newsletter"];
}

export function splitThreadToTweetLimit(input: string[]): string[] {
  const cleaned = input.map((t) => stripExistingNumbering(normalizeMarkdownForPlain(t)));
  const out: string[] = [];
  for (const tweet of cleaned) {
    if (tweet.length <= LIMITS.tweet) {
      if (tweet.trim()) out.push(tweet.trim());
      continue;
    }
    const reserve = 8;
    for (const part of splitToWindow(tweet, LIMITS.tweet - reserve)) {
      const t = part.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

export function numberThread(tweets: string[]): string[] {
  const total = tweets.length;
  if (total <= 1) return tweets.map((t) => clampToLimit(t, LIMITS.tweet));
  return tweets.map((t, i) => {
    const tag = ` ${i + 1}/${total}`;
    return clampToLimit(t, LIMITS.tweet - tag.length) + tag;
  });
}

export function normalizeHashtags(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const tag = raw
      .replace(/^#+/, "")
      .replace(/\s+/g, "")
      .replace(/[^A-Za-z0-9_]/g, "")
      .toLowerCase();
    if (tag.length < 2) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function formatHashtagLine(tags: string[]): string {
  return tags.map((t) => `#${t}`).join(" ");
}

function normalizeMarkdownForPlain(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^\*])\*(?!\*)(.+?)\*(?!\*)/g, "$1$2")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function stripExistingNumbering(s: string): string {
  return s.replace(/^\s*\d+\s*\/\s*\d+\s*[).:\-—]?\s*/, "").replace(/\s*\d+\s*\/\s*\d+\s*$/, "");
}

function clampToLimit(s: string, limit: number): string {
  if (s.length <= limit) return s;
  return s.slice(0, limit - 1).trimEnd() + "…";
}

function splitToWindow(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim()) out.push(buf.trim());
    buf = "";
  };
  for (const s of sentences) {
    if (s.length > limit) {
      flush();
      for (const piece of hardWrap(s, limit)) out.push(piece);
      continue;
    }
    if ((buf + " " + s).trim().length > limit) {
      flush();
      buf = s;
    } else {
      buf = buf ? buf + " " + s : s;
    }
  }
  flush();
  return out;
}

function hardWrap(s: string, limit: number): string[] {
  const words = s.split(/\s+/);
  const out: string[] = [];
  let buf = "";
  for (const w of words) {
    if (w.length > limit) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      for (let i = 0; i < w.length; i += limit) out.push(w.slice(i, i + limit));
      continue;
    }
    if ((buf + " " + w).trim().length > limit) {
      out.push(buf);
      buf = w;
    } else {
      buf = buf ? buf + " " + w : w;
    }
  }
  if (buf) out.push(buf);
  return out;
}
