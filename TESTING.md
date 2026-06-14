# Testing OmniPost

OmniPost ships with a single end-to-end smoke test that asserts every behavior the README claims. Everything below is reproducible from a fresh clone with no API keys.

## TL;DR

```bash
git clone https://github.com/morgunglyeb-arch/omnipost
cd omnipost
npm install
npm test
```

Expected: **29/29 passed · [smoke] all green**.

That single command exercises the fallback path, the cached path, the schedule planner, the file writers and the `--force` cache-bust path — entirely offline.

## What `npm test` covers

`scripts/smoke-test.ts` runs four stages and prints a checklist. Each line is one assertion.

| # | Stage | Asserts |
|---|---|---|
| 1 | **Fallback path** (cache cleared, `--mock`) | LLM-free path produces ≥ 3 tweets, all ≤ 280 chars, hashtags deduped, `degraded: true`, `provider: fallback` |
| 2 | **Seed cache** via `gen:demo` | The seeded cache file lands at `data/cache/<hash>.json` |
| 3 | **Cached path** with `--schedule` | `provider: anthropic`, `cached: true`, `degraded: false`; ≥ 5 tweets all ≤ 280; thread numbered `1/n … n/n`; hashtags ≤ 10, lowercased, no `#`; 3 hooks; LinkedIn ≤ 3000 chars; Instagram ≤ 2200 chars; schedule covers all 4 platforms, sorted by datetime; all four artifacts (JSON, MD, CSV, ICS) non-empty; `.ics` has matching `BEGIN/END:VCALENDAR` and one `VEVENT` per scheduled post |
| 4 | **`--force` cache bust** | The cache file is removed before the next run |

Exit code is the number of failing assertions (0 on green, ≥ 1 on red).

## Manual smoke tests

If you want to see the output by eye instead of trusting the checklist:

```bash
# Polished cached bundle — what the live demo shows
npm run gen:demo
npm run repurpose -- --mock --dry

# Pure fallback (no cache, no API key)
rm -rf data/cache && mkdir -p data/cache
npm run repurpose -- --mock --dry

# Write everything to disk
npm run repurpose -- --mock --schedule --days=7
ls data/out/
# omnipost.json  omnipost.md  calendar.csv  calendar.ics

# Subset of platforms
npm run repurpose -- --mock --platforms=x,linkedin --dry

# Bypass the cache
npm run repurpose -- --force
```

The sanity line printed at the end of every non-dry run is the single most useful signal:

```
[omnipost] sanity: 9 tweets, longest=264 chars, over-280=0, hashtags=9
```

If `over-280` is ever non-zero, something in `src/enforce.ts` regressed.

## Testing with a real LLM

Set one of the two providers in `.env`:

```bash
cp .env.example .env
# either
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# or
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
```

Then drop the seeded cache and run:

```bash
rm -rf data/cache && mkdir -p data/cache
npm run repurpose -- --schedule --days=7
```

Expect a fresh call to the chosen provider. Re-running the same command should hit the cache and skip the LLM:

```
[omnipost] cache hit (<hash>) — skipping LLM call
```

`--force` drops the cache and re-calls the LLM. Switching `LLM_PROVIDER` or any `BRAND_*` value also changes the hash, so the next run regenerates.

## Testing the URL adapter

```bash
npm run repurpose -- --url=https://example.com/some-article --dry
```

The URL adapter strips `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>` and `<form>` blocks, then prefers `<article>`, `<main>` or a `.post / .article / .content / .entry` container if any of them holds more than ~400 chars of text. It fails fast on extracted text shorter than 200 chars with a clear error.

## Testing the calendar

```bash
npm run repurpose -- --mock --schedule --days=7
open data/out/calendar.ics   # macOS — opens in Calendar.app
```

Or import `data/out/calendar.ics` into Google Calendar (Settings → Import & export → Import). The smoke test already validates the file has matching `BEGIN/END:VCALENDAR` markers and one `VEVENT` per scheduled post; this is just a final eyeball check that the events render.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and PR:

1. `npm ci`
2. `npm run typecheck` — strict TypeScript with `noUncheckedIndexedAccess`
3. `npm test` — the 29-assertion smoke test described above

If any assertion fails, the job fails. No flake — the test is deterministic by design (`--mock` mode never hits a network).
