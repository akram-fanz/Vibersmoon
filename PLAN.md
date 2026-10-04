# Vibersmoon Implementation Plan

**Status:** Phase 0 complete. Waiting for approval before implementation.
**Project:** `/root/Vibersmoon`
**Stack:** Node.js 20+, ESM, grammY, SQLite (`better-sqlite3`), `yt-dlp`, `ffmpeg`, `p-queue`.
**Deployment target:** Unconfirmed. Previous VPS + pm2 assumption rejected; target must be specified before deployment instructions are finalized.
**Limits:** 10 requests/minute and 20 downloads/day per user, per user confirmation.
**Utilities scope:** All catalogued utilities requested, no exclusions.

## 1. Architecture
- `src/index.js`: Bootstrap config, logger, database, queue, bot and graceful shutdown.
- `src/bot.js`: grammY bot, ordered middleware and handler/plugin registration.
- `src/core/`: configuration validation, logging, queue, temp-file lifecycle, rate limits, shared errors.
- `src/middlewares/`: error boundary, rate limiting, user/session loading and command/job logging.
- `src/handlers/`: Telegram-specific commands and callbacks, split by core, downloader, scraping, games, utilities, notes/reminders, group tools, AI and admin.
- `src/services/`: Telegram-independent business logic: downloader providers, public-page scraping, game engines/scoring, media conversion, information APIs, AI.
- `src/utils/`: URL/SSRF guard, formatting, safe file handling, keyboards.
- Plugin convention: one handler file per feature registered by `bot.js`; downloader provider interface exposes `name`, `match(url)`, `probe(url)`, `download(options)`.
- Downloads run through bounded `p-queue`; each job gets its own temp directory, removes it in `finally`, and is covered by periodic stale-file cleanup.

## 2. Folder layout
```text
/root/Vibersmoon/
  package.json, PLAN.md, README.md, .env.example, .gitignore
  src/
    index.js, bot.js
    core/ middlewares/ handlers/ services/ utils/
  tests/
  scripts/                 # yt-dlp update and database backup/migration
  assets/ music/           # existing media assets retained
  data/                    # SQLite database; excluded from git
  tmp/                     # temporary jobs; excluded from git
```
Existing CJS/Telegraf handlers and JSON storage need migration. Preserve existing commands/features, AI and vision integrations, assets, music and user data where compatible. Never read, print, or modify the real `.env` without explicit permission.

## 3. Dependencies
| Dependency | Purpose | Choice |
|---|---|---|
| `grammy` | Telegram bot framework and middleware | Replace Telegraf to match required stack |
| `better-sqlite3` | Persistent SQLite store | Synchronous embedded DB for single-process bot |
| `p-queue` | Bounded asynchronous job queue | No separate Redis service |
| `dotenv` | Local environment loading | Secrets remain environment-only |
| `pino` | Structured leveled logs with redaction | Avoid logging tokens/credentials |
| `node-html-parser` | Parse public HTML and metadata | Lightweight HTML parsing |
| `puppeteer-core` | Website screenshot when Chromium exists | No bundled browser; optional runtime capability |
| `sharp` | Image conversion/resizing and sticker preparation | Native image processing |
| `qrcode`, `jsqr` | QR generation and decoding | Dedicated libraries |
| `tesseract.js` | OCR | Avoid requiring system OCR for baseline |
| `vitest`, `eslint`, `@eslint/js` | Tests and lint | ESM-friendly test/lint tools |
| Node built-ins | `spawn`, HTTP/fetch, filesystem, crypto | Avoid extra packages where practical |

External binaries: `yt-dlp` and `ffmpeg`; optional Chromium/Tesseract. Exact package versions and optional platform support will be checked before installation. Do not add dependencies outside this approved plan without asking.

## 4. Feature matrix
Complexity: S small, M medium, L large. “MVP” is core and downloader; all requested catalog features remain in scope, delivered in later phases.

| Feature | Release | Complexity |
|---|---|---|
| Config validation, logging, error handling, `/start`, `/help`, `/ping`, rate limits, job queue/temp cleanup | MVP | M |
| URL autodetection; TikTok video/audio/slideshow; yt-dlp platform downloads; quality selection; `/play`, `/yt`; progress and >50 MB fallback | MVP | L |
| Public-page metadata, image/link extraction, screenshot, article summary, public profile info | v1 | L |
| Number/word guessing, trivia, RPS, Tic-Tac-Toe, image guessing, math quiz; scoring, levels, leaderboards, daily streak/economy | v1 | L |
| Image/sticker conversion, background removal, OCR, QR, URL shortener, media conversion | v2 | L |
| Translation, prayer times, BMKG weather, exchange and crypto rates, calculator | v2 | M |
| Reminders, private notes, TTS | v2 | M |
| Group welcome, anti-link/anti-spam, `/tagall`, group stats | v2 | M |
| Optional AI chat; daily limits and admin `/broadcast`, `/stats`, `/ban` | v2 | M |

Utilities are all requested. Their provider/API and cost constraints are reviewed per feature before implementation; paid external services require separate approval.

## 5. Database schema
SQLite tables, initialized with versioned migrations:
- `users`: Telegram ID, username/name, role, banned flag, last-seen, daily usage/reset date, creation time.
- `game_scores`: user ID, game ID, score, optional chat ID, timestamp; indexed by game/chat and score.
- `user_economy`: user ID, points, level, streak and last daily-reward date.
- `settings`: key/value configuration, including group settings.
- `job_log`: user ID, job type/platform/status, safe error code, duration, output size and timestamp. Do not store secrets or full sensitive URLs.
- `reminders`: ID, owner, target chat, message, due time and sent status.
- `notes`: ID, owner, title/content and timestamps.
- `group_settings`: chat ID, welcome text and moderation toggles.

Enable foreign keys and WAL. Preserve/migrate existing `data/db.json` only after inspectable backup and migration verification; do not discard source data.

## 6. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Telegram Bot API 50 MB send cap | Check size; attempt ffmpeg compression/re-encode; document send has same limit; if still too large return a safe direct link where provider permits. Self-hosted Bot API is a separately approved deployment option; verify its limits before relying on it. |
| `yt-dlp` extractor churn | Provide update script and version diagnostics; isolate provider; report extractor failures clearly. Updates are explicit, not automatic during a user job. |
| Platform/page changes | Isolate providers/parsers, use OpenGraph fallbacks, log sanitized failures and test representative URLs. |
| Spam and abuse | 10 requests/minute, 20 downloads/day, bounded concurrency, admin controls and group anti-spam safeguards. |
| Disk exhaustion | Per-job temp directories; `finally` cleanup; periodic stale cleanup; free-space threshold before large jobs. |
| SSRF/command injection | Allow only HTTP(S); reject localhost, private, link-local and reserved IPs after DNS resolution; guard redirects; `child_process.spawn` with argument arrays and no shell. |
| Public scraping boundaries | Respect `robots.txt`; no login, paywall, DRM or access-control bypass. |
| Isolated failures | Global error handler, safe user-facing errors, graceful shutdown; never expose stack/secrets to chat. |
| Termux/runtime differences | Deployment target remains unconfirmed; validate native SQLite/image dependencies and binary availability on selected platform before deployment work. |
| Existing user data | Back up and verify JSON-to-SQLite migration before switching; retain source until user approves cleanup. |

## 7. Testing and deployment
- Unit tests: URL normalization/SSRF guard, provider routing/format selection, queue/temp cleanup, rate limits, game logic/scoring, database migrations.
- Integration tests: handlers with Telegram/API clients mocked; subprocess arguments asserted to use `spawn` without shell.
- Run `npm test` and `npm run lint`; add startup tests for missing and present `BOT_TOKEN` without exposing token values.
- Manual acceptance after credentials and binaries are configured: supported TikTok/YouTube links, unsupported/invalid URLs, large-file path, three games and persisted scores after restart, reminder, cleanup and legacy-data migration.
- Deployment steps are deferred until user names the target. Do not install OS packages, global tools, use sudo, or deploy without explicit approval.

## Approval Gate
Confirm target deployment platform (Termux, Docker, VPS/process manager, or other). This plan does not authorize implementation until approved. Per PRD, stop here and wait for approval before Phase 1.
