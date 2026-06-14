import type { EnforcedBundle, Platform } from "./enforce.js";
import { formatHashtagLine } from "./enforce.js";

export interface ScheduledPost {
  platform: Platform;
  content: string;
  datetime: string;
}

export interface ScheduleOptions {
  days: number;
  startDate?: Date;
  platforms?: Platform[];
}

interface Slot {
  platform: Platform;
  weekdays: number[];
  hour: number;
  minute: number;
}

const DEFAULT_SLOTS: Slot[] = [
  { platform: "x", weekdays: [1, 2, 3, 4, 5, 6, 0], hour: 10, minute: 0 },
  { platform: "linkedin", weekdays: [1, 3, 5], hour: 9, minute: 0 },
  { platform: "instagram", weekdays: [2, 4, 6], hour: 12, minute: 30 },
  { platform: "newsletter", weekdays: [4], hour: 8, minute: 0 },
];

export function planSchedule(
  bundle: EnforcedBundle,
  opts: ScheduleOptions,
): ScheduledPost[] {
  const start = opts.startDate ?? startOfTomorrowUtc();
  const wanted = new Set<Platform>(
    opts.platforms?.length ? opts.platforms : ["x", "linkedin", "instagram", "newsletter"],
  );
  const slots = DEFAULT_SLOTS.filter((s) => wanted.has(s.platform));

  const queues: Record<Platform, string[]> = {
    x: [...bundle.x_thread],
    linkedin: wanted.has("linkedin") ? [bundle.linkedin_post] : [],
    instagram: wanted.has("instagram")
      ? [`${bundle.instagram_caption}\n\n${formatHashtagLine(bundle.hashtags)}`.trim()]
      : [],
    newsletter: wanted.has("newsletter") ? [bundle.newsletter_blurb] : [],
  };

  const out: ScheduledPost[] = [];
  for (let d = 0; d < opts.days; d++) {
    const date = addDays(start, d);
    const weekday = date.getUTCDay();
    for (const slot of slots) {
      if (!slot.weekdays.includes(weekday)) continue;
      const q = queues[slot.platform];
      if (!q.length) continue;
      const content = q.shift();
      if (!content) continue;
      const dt = new Date(date);
      dt.setUTCHours(slot.hour, slot.minute, 0, 0);
      out.push({
        platform: slot.platform,
        content,
        datetime: dt.toISOString(),
      });
    }
  }
  return out.sort((a, b) => a.datetime.localeCompare(b.datetime));
}

export function toCsv(posts: ScheduledPost[]): string {
  const header = "datetime,platform,content";
  const rows = posts.map(
    (p) => `${p.datetime},${p.platform},${csvEscape(p.content)}`,
  );
  return [header, ...rows].join("\n") + "\n";
}

export function toIcs(posts: ScheduledPost[], brandName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//OmniPost//${escapeIcs(brandName)}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const stamp = formatIcsDateTime(new Date());
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    if (!p) continue;
    const dtStart = formatIcsDateTime(new Date(p.datetime));
    const dtEnd = formatIcsDateTime(new Date(new Date(p.datetime).getTime() + 30 * 60_000));
    const uid = `${stamp}-${i}-${p.platform}@omnipost`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcs(`[${p.platform.toUpperCase()}] ${truncate(p.content, 60)}`)}`,
      `DESCRIPTION:${escapeIcs(p.content)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function startOfTomorrowUtc(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
