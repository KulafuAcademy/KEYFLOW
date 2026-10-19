# KEYFLOW

A browser-local IELTS Academic typing studio built with Next.js App Router, TypeScript, and Tailwind CSS. No accounts, database, AI API, environment variables, or runtime paid services.

## Run

Requires Node.js 20.9+ (24 LTS recommended).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Production: `npm run build && npm start`.

## Practice modes

- **Typing drill:** 8 academic vocabulary, phrase, punctuation, and sentence exercises; 1-, 3-, or 5-minute limits. Finishes on an exact match or timeout.
- **Copy practice:** 4 original Task 1/2 passages. Finishes on an exact match, with no time limit. Paste/drop is disabled in reference modes so measured results reflect typing.
- **Writing simulation:** 3 Task 1 prompts with self-contained tables and 4 Task 2 questions; 20/40-minute limits, 150/250-word indicators, per-prompt autosaved drafts, copy and UTF-8 text export. No band scores or invented accuracy.
- **Progress:** recent 200 sessions, personal best, speed and accuracy trends, and confirmed history reset. History reset preserves drafts and preferences.
- Desktop and mobile layouts, light/dark preference, labelled controls, focus handling, and reduced-motion support.

## Measurement contract

`WPM = correctly matching characters / 5 / elapsed minutes`.

Character accuracy is matching characters divided by all currently entered characters, including extra characters. An empty response displays 100% accuracy and 0 WPM. Unentered reference characters do not count as errors. Capitalization, punctuation, spaces, and line breaks matter. Deleting or correcting text repairs accuracy and WPM; **mistakes made** independently counts incorrect inserted/replaced characters and is not reduced by correction. This is a positional comparison, not an edit-distance metric. Built-in references use standard English BMP characters.

The first input starts the timer. Timing uses wall-clock timestamps rather than incrementing interval counters; delayed ticks cannot grant extra time. Pause excludes paused time. Timeout caps at the configured limit, locks input, and records a single result. Copy practice has no timeout. Switching a typing mode resets that practice; writing is saved and paused. Finishing writing locks that response; restart requires confirmation and offers export first.

Simulation pauses are a training convenience; the real IELTS exam clock does not pause. Drafts restore paused after reopening and exclude time with the tab closed. Each prompt retains its own draft and elapsed time. Draft text is written synchronously on edits and elapsed time is checkpointed every second and before leaving. Active drafts trigger the browser's standard unload warning. Storage failures display an export reminder; the editor continues to work in memory. Do not use separate tabs for concurrent edits of the same draft.

## Storage and privacy

Versioned localStorage keys: `keyflow.history.v1`, `keyflow.drafts.v1`, `keyflow.preferences.v1`. No response or progress is sent to a server. Storage is specific to browser and origin. Clearing site data or using private browsing can remove progress. Export important writing. Drafts do not transfer from localhost/preview to production.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Unit tests cover WPM, accuracy, zero-time input, corrections and extra characters, punctuation/case, exact completion, pause/deadline timing, word count, persistence failures/corruption, completion deduplication, history cap, and content completeness. See `QA.md` for browser checks actually performed.

## Vercel

Import `KulafuAcademy/KEYFLOW`, detect **Next.js**, and use `main` as the production branch. Root directory is the repository root. No environment variables are required. Vercel's GitHub connection deploys pushes to `main` automatically and creates previews for other branches. `.vercel/` stays local and is ignored by Git.

## Structure

- `src/components/studio.tsx`: practice UI and session lifecycle
- `src/lib/metrics.ts`: pure scoring and timing functions
- `src/lib/storage.ts`: versioned, validated browser persistence
- `src/lib/content.ts`: original exercises, passages, and prompts
- `src/app/globals.css`: responsive monochrome design tokens and layouts
- `tests/metrics.test.ts`: core regression tests

All practice content was written for KEYFLOW. KEYFLOW is an independent training tool and is not affiliated with IELTS or its test partners.
