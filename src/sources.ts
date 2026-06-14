import { readFile } from "node:fs/promises";

export interface Source {
  title?: string;
  text: string;
  url?: string;
}

export interface ContentSource {
  read(): Promise<Source>;
}

export class FileSource implements ContentSource {
  constructor(private readonly path: string) {}

  async read(): Promise<Source> {
    const raw = await readFile(this.path, "utf8");
    const title = extractMarkdownTitle(raw);
    const body = stripYamlFrontmatter(raw);
    const text = (title ? body.replace(/^#\s+.+?\n+/, "") : body).trim();
    return { title, text };
  }
}

export class UrlSource implements ContentSource {
  constructor(private readonly url: string) {}

  async read(): Promise<Source> {
    const res = await fetch(this.url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; OmniPostBot/1.0; +https://github.com/morgunglyeb-arch/omnipost)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`Fetch failed for ${this.url}: HTTP ${res.status}`);
    }
    const html = await res.text();
    const title = extractHtmlTitle(html);
    const text = extractMainText(html);
    if (!text || text.length < 200) {
      throw new Error(
        `Could not extract a usable article from ${this.url} (got ${text.length} chars).`,
      );
    }
    return { title, text, url: this.url };
  }
}

export function pickSource(opts: { input?: string; url?: string; defaultPath: string }): ContentSource {
  if (opts.url) return new UrlSource(opts.url);
  return new FileSource(opts.input ?? opts.defaultPath);
}

function extractMarkdownTitle(raw: string): string | undefined {
  const body = stripYamlFrontmatter(raw);
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m?.[1]?.trim();
}

function stripYamlFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  return raw.slice(end + 4).replace(/^\s*\n/, "");
}

function extractHtmlTitle(html: string): string | undefined {
  const og = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (og?.[1]) return decodeEntities(og[1]).trim();
  const t = html.match(/<title>([^<]+)<\/title>/i);
  return t?.[1] ? decodeEntities(t[1]).trim() : undefined;
}

export function extractMainText(html: string): string {
  let s = html;

  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  s = s.replace(/<aside[\s\S]*?<\/aside>/gi, " ");
  s = s.replace(/<form[\s\S]*?<\/form>/gi, " ");

  const article = pickFirst(s, [
    /<article[\s\S]*?>([\s\S]*?)<\/article>/i,
    /<main[\s\S]*?>([\s\S]*?)<\/main>/i,
    /<div[^>]*class=["'][^"']*(?:post|article|content|entry)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ]);
  if (article) s = article;

  s = s.replace(/<\/(p|h[1-6]|li|blockquote|br)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

function pickFirst(s: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = s.match(re);
    if (m?.[1] && m[1].length > 400) return m[1];
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)));
}
