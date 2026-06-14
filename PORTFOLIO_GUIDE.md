# Как добавить OmniPost в портфолио

Пошаговая инструкция: где, что и в каком виде вставлять, чтобы кейс выглядел в одном инженерном почерке с PulseReport.

Ссылки, которые понадобятся (держи под рукой):

- Репозиторий: `https://github.com/morgunglyeb-arch/omnipost`
- Живое демо (EN): `https://morgunglyeb-arch.github.io/omnipost/`
- Живое демо (UK): `https://morgunglyeb-arch.github.io/omnipost/uk.html`
- Кейс (EN/UK long form): `https://github.com/morgunglyeb-arch/omnipost/blob/main/PORTFOLIO.md`
- README c архитектурой: `https://github.com/morgunglyeb-arch/omnipost/blob/main/README.md`

Скриншоты (сделай один раз и переиспользуй):

1. `hero` — топ страницы демо: заголовок «One source. Ten posts.» + 4 hero-карточки `1 → 13+`, `≤ 280`, `2 LLMs`, `.ics`.
2. `bundle` — секция «Live demo» с колонкой источника слева и сгенерированными карточками справа (X-тред, LinkedIn, Instagram, newsletter).
3. `calendar` — таблица «Weekly content calendar» с 7-дневным расписанием.
4. `mermaid` — диаграмма пайплайна из README (GitHub рендерит её прямо в репо).
5. (опционально) `code` — фрагмент `src/enforce.ts` с функциями `splitThreadToTweetLimit` и `numberThread` — это визуально доказывает тезис «код накладывает лимиты».

Размер скриншотов: 1600×1000 (Retina), формат WebP или PNG.

---

## 1. Upwork

### 1.1. Portfolio item

Profile → Edit profile → Portfolio → Add a portfolio item.

| Поле | Что писать |
|---|---|
| Project title | **OmniPost — Agentic AI Content Repurposing Pipeline** |
| Description | Скопируй блок «EN — long form» из [PORTFOLIO.md](./PORTFOLIO.md). Upwork разрешает до 5 000 символов — помещается целиком. |
| Skills | TypeScript, Node.js, Anthropic, Groq, OpenAI API, LLM, Prompt Engineering, AI Automation, Content Strategy, Social Media Automation, Zod, GitHub Actions |
| Project URL | `https://morgunglyeb-arch.github.io/omnipost/` |
| Source code URL | `https://github.com/morgunglyeb-arch/omnipost` |
| Images | загрузи 4 скриншота (`hero`, `bundle`, `calendar`, `mermaid`). Первый — обложка. |
| Role | Solo developer |
| Year | 2026 |

### 1.2. Specialized profile

Если у тебя профиль «AI Engineer / Automation»: добавь короткий буллет в раздел **Other Experiences**:

> Built **OmniPost** — TypeScript pipeline that turns one long-form source into platform-native posts (X, LinkedIn, Instagram, newsletter) with a weekly `.ics` calendar. LLM drafts, code enforces every character limit. `tool-use`, `cache_control`, zod-validated structured output, graceful fallback, source-hash cache.

### 1.3. Proposal template

Готовый шаблон под входящий гиг про «content repurposing / social media automation / AI content»:

```
Hi [Name],

I built exactly this pattern as an open-source pipeline you can run today:

OmniPost — https://github.com/morgunglyeb-arch/omnipost
Live demo — https://morgunglyeb-arch.github.io/omnipost/

It takes one long-form source (article, transcript, URL) and produces:
- An X thread with every tweet ≤ 280 chars (auto-numbered 1/n)
- A LinkedIn post in your brand voice
- An Instagram caption with deduped hashtags
- A newsletter blurb
- A weekly content calendar exported as .ics (drag into Google Calendar)

The key engineering choice is that the LLM only drafts — code enforces every
hard constraint (character limits, hashtag rules, scheduling). That's what
keeps it production-reliable across hundreds of runs.

For your project I would [1–2 sentences about their specific need —
adapt source adapters, plug in brand voice, hook up Typefully/Buffer for
auto-publishing, etc.].

Happy to do a paid 2-hour scoping call this week.

— Glyeb
```

### 1.4. Тэги для поиска (Specialty / Categories)

Категория: **AI Apps & Integrations** → подкатегория **AI Content Editing & Post-Editing**. Дополнительно поставь себе видимыми скиллы: `Claude`, `Anthropic`, `OpenAI API`, `LLM Prompt Engineering`, `Content Strategy`, `Social Media Marketing`, `TypeScript`, `Node.js`.

---

## 2. Fiverr

### 2.1. Gig

Каталог → My Business → Gigs → Create a new Gig.

**Title (80 chars max):**
> I will build an AI content repurposing pipeline that turns 1 article into 10 posts

**Category:** Digital Marketing → Social Media Marketing → Social Media Content
Альтернатива: Programming & Tech → AI Applications → AI Content Editing

**Search tags (5):** `ai content`, `repurposing`, `social media automation`, `content calendar`, `linkedin twitter`

**Gig description (1 200 chars max):**

```
I build the pipeline that turns one long-form source — your blog post,
podcast transcript, or webinar — into a full bundle of platform-native
posts: a numbered X thread (every tweet ≤ 280 chars), a LinkedIn post in
your voice, an Instagram caption with deduplicated hashtags, a newsletter
blurb, plus a weekly content calendar exportable as .ics.

The engineering choice that makes it reliable: the LLM only drafts. Code
enforces every hard limit — character counts, hashtag rules, scheduling.
No more 320-character tweets, no more hashtag piles, no more "in today's
fast-paced world."

What you get:
✓ Full TypeScript codebase, MIT, runs on Node 20+
✓ Anthropic Claude or Groq backend (your choice)
✓ Brand voice from a config file — change it, regenerate
✓ Plug-and-play source adapters (file, URL, easy to extend)
✓ CI workflow that runs offline tests on every push

Live demo & open-source reference:
github.com/morgunglyeb-arch/omnipost
```

### 2.2. Tiers

| Tier | Price | Delivery | Что входит |
|---|---|---|---|
| Basic | $120 | 3 days | Запуск OmniPost на твоём содержимом + 1 brand voice + 1 source = полный bundle постов + календарь `.ics`. |
| Standard | $290 | 5 days | + кастомный source adapter (YouTube-транскрипт / RSS / Notion) + 3 brand voice пресета + хостинг на GitHub Actions с auto-run каждую неделю. |
| Premium | $640 | 10 days | + auto-publish адаптер (Typefully или Buffer) + аналитика постов в Google Sheets + 30 дней поддержки. |

### 2.3. Gig images

Главное превью — `bundle` (демо-страница, колонки слева/справа). Второе — `calendar`. Третье — `mermaid`. Используй те же изображения, что готовил для Upwork.

---

## 3. LinkedIn

### 3.1. Featured section (закреплённые работы)

Profile → Add profile section → Featured → Add link.

| Поле | Что писать |
|---|---|
| Link | `https://morgunglyeb-arch.github.io/omnipost/` |
| Title | **OmniPost — Agentic Content Repurposing Pipeline** |
| Description | One source → X / LinkedIn / Instagram / newsletter + `.ics` calendar. LLM drafts, code enforces. TypeScript, Anthropic + Groq, zod, GitHub Actions. |

LinkedIn автоматически возьмёт OG-картинку с meta-тегов сайта.

### 3.2. Projects section

Profile → Add profile section → Additional → Projects.

| Поле | Что писать |
|---|---|
| Project name | **OmniPost** |
| Dates | 2026-06 → Present |
| Associated with | (твоя компания / `Self-employed`) |
| Project URL | `https://github.com/morgunglyeb-arch/omnipost` |
| Description | Скопируй блок «EN — long form» из [PORTFOLIO.md](./PORTFOLIO.md). LinkedIn лимит 2 000 символов — длинный блок придётся подрезать, либо используй «EN — short». |

### 3.3. Пост-анонс

Шаблон поста про запуск (короткая версия, для лента):

```
Open-sourced OmniPost — a small TypeScript pipeline I built for myself
and then realized other people kept asking for.

Feed it one long-form source — a blog post, a podcast transcript, an
article URL — and it gives you back:

→ A numbered X thread (every tweet ≤ 280, code-enforced)
→ A LinkedIn post in your brand voice
→ An Instagram caption with deduplicated hashtags
→ A newsletter blurb
→ A weekly content calendar exportable as .ics

The engineering choice I'm most happy about: the LLM only drafts.
Character limits, hashtag rules and thread numbering live in pure code,
not in the prompt. That's the entire reliability story.

Live demo + source:
github.com/morgunglyeb-arch/omnipost

Stack: TypeScript 5.6 strict, Node 20, Anthropic SDK with tool-use +
prompt caching, OpenAI SDK pointed at Groq, zod, GitHub Actions.

If you build AI content workflows for clients — happy to compare notes.
```

К посту прикрепи скриншот `bundle` (или короткое 15-секундное видео-демо со скроллом по `index.html`).

### 3.4. Skills

Profile → Skills → Add a new skill: `Anthropic Claude API`, `Groq`, `LLM Prompt Engineering`, `Structured Output (Zod)`, `TypeScript`, `Node.js`, `AI Content Automation`, `RFC 5545 (iCalendar)`. Каждому скиллу поставь OmniPost в Endorsements → Featured project.

---

## 4. Freelancehunt

Свій кабінет → Портфоліо → Додати роботу.

| Поле | Що писати |
|---|---|
| Назва | **OmniPost — AI-пайплайн для repurposing контенту** |
| Опис | Скопіюй блок «🇺🇦 UK — повна версія» з [PORTFOLIO.md](./PORTFOLIO.md). |
| Категорія | Програмування → Інтеграція API; додатково — Програмування → Інші мови програмування (Node.js / TypeScript). |
| Послуги | Розробка AI-агентів, інтеграція API, веб-розробка на Node.js |
| Файли | завантаж `hero`, `bundle`, `calendar`, `mermaid`. |
| Посилання | і на GitHub, і на live demo (UK-версію — `https://morgunglyeb-arch.github.io/omnipost/uk.html`). |

---

## 5. Behance / личный портфолио-сайт

Behance любит большие красивые изображения. Для проекта в Behance:

1. Project Cover (1400×900) — `bundle`, обрезанный так, чтобы показывал и источник, и сгенерированные карточки.
2. Слайд 2 — `hero` с заголовком и 4 стат-карточками.
3. Слайд 3 — `mermaid` диаграмма пайплайна.
4. Слайд 4 — фрагмент `src/enforce.ts` (текст рендерь как изображение, чтобы Behance не ломал форматирование). Под скриншотом — подпись «LLM drafts, code enforces».
5. Слайд 5 — `calendar` таблица.
6. Слайд 6 — текстовый блок «EN — long form» из PORTFOLIO.md.

В тэгах: `TypeScript`, `Node.js`, `AI`, `LLM`, `Claude`, `Anthropic`, `Content Strategy`, `Automation`.

Личный сайт (если у тебя один в стиле PulseReport): в карточку проекта вставляй блок «EN — one-liner (portfolio grid card)» из PORTFOLIO.md, обложкой — `hero`.

---

## 6. GitHub профиль

1. **Pin OmniPost** в шапке профиля (Pinned repositories — выбери 6).
2. В README профиля добавь строку:

   ```
   - [OmniPost](https://github.com/morgunglyeb-arch/omnipost) — agentic
     TypeScript pipeline · one long-form source → X thread + LinkedIn +
     Instagram + newsletter + weekly `.ics` calendar. LLM drafts, code
     enforces.
   ```

3. В личной шапке (Bio) укажи: `Building agentic TypeScript pipelines — Claude, Groq, zod. PulseReport · OmniPost.`

---

## 7. Cover letter / email pitch

Готовый универсальный шаблон под холодное письмо или ответ на гиг, где тебе нужно показать кейс быстро:

```
Subject: Repurposing pipeline you can clone today — OmniPost

I built an open-source TypeScript pipeline that does what you described
in your post:

One source → numbered X thread + LinkedIn + Instagram + newsletter +
weekly content calendar (.ics). Live demo and source:

→ https://morgunglyeb-arch.github.io/omnipost/
→ https://github.com/morgunglyeb-arch/omnipost

Two engineering choices that make it production-reliable:

1. The LLM only drafts. Character limits, hashtag dedup and thread
   numbering live in pure code (enforce.ts) — never trusted to the model.
2. One zod schema covers two providers (Anthropic tool-use + Groq
   response_format). Either fails or returns invalid JSON → deterministic
   fallback. The pipeline never silently breaks.

I can adapt this to your stack and brand voice in a paid 2-week sprint.
Open to a quick call this week — what time zone are you in?

— Glyeb Morgun
```

---

## 8. Чек-лист «всё ли я добавил»

- [ ] Upwork portfolio item (4 скриншота, long-form description, ссылка на demo)
- [ ] Upwork specialty profile буллет
- [ ] Fiverr gig (3 тира, 3 изображения)
- [ ] LinkedIn Featured ссылка
- [ ] LinkedIn Projects запись
- [ ] LinkedIn пост-анонс
- [ ] LinkedIn Skills + endorsements
- [ ] Freelancehunt портфоліо
- [ ] Behance project (или личный сайт)
- [ ] GitHub: pin репозитория + строка в profile README
- [ ] Cover letter / email шаблон сохранён в Notion / Raycast snippets

Когда всё это сделано — ты конвертируешь OmniPost из «один репозиторий в GitHub» в «4–5 точек входа из разных каналов», и любой гиг про content repurposing, AI content automation или social-media automation попадает на готовый, отлаженный кейс.
