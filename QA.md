# KEYFLOW release verification

Date: 20 October 2026 (Asia/Manila).

## Automated checks

- ESLint: passed, zero errors or warnings.
- TypeScript (`tsc --noEmit`): passed.
- Unit tests (`npm test`): 10 passed.
- Next.js production build: passed; home page generated statically.

The first sandboxed build could not bind the port needed by the Next.js CSS worker. The same build succeeded with process/network permissions. This was an execution-environment limitation, not a source error.

## Local browser verification

Performed using the in-app Chromium browser at `http://127.0.0.1:3047`.

- Drill: initial autofocus; first-keystroke start; incorrect-character feedback; backspace correction restored 100% accuracy while retaining cumulative mistake count; pause/resume; exact-match completion and results.
- Timeout: let a real 1-minute drill expire; displayed `00:00`, locked input, and recorded a `01:00` session with the expected error count.
- Copy: original Task 1 reference rendered with paragraph breaks; paste was blocked with an inline explanation; entering the exact passage completed and recorded the exercise.
- Writing Task 1: table rendered with headings/units; entered 151 words; word minimum reached; normal deletion/editing worked; mode navigation and full reload recovered response and elapsed time in a paused state; completion recorded words/time without accuracy or band score.
- Copy writing: displayed successful clipboard confirmation.
- Text export: browser download produced `keyflow-w1.txt`.
- Writing Task 2: 40:00 clock and 250-word minimum; response editing, autosave, and completion worked.
- Progress: displayed drill, timeout, copy, and both writing sessions; rendered speed/accuracy trends; confirmed reset removed session records and best metrics.
- Mobile: 390 × 844 viewport; drill, writing editor, progress, and confirmation controls rendered; no page-width overflow (document width 375, viewport 390); navigation and theme controls remained available.
- Light/dark controls worked and the selected theme survived reload.

## Scope

Browser typing was automated for smoke testing; the resulting test WPM values are not human performance benchmarks. The 20/40-minute full writing durations were not waited out in real time; deadline arithmetic and clamping were verified in unit tests, and the shared timer's real timeout was verified with a one-minute drill.

Production verification is recorded below after deployment.

## Production browser verification

Public URL: https://keyflow-seven-henna.vercel.app

- Anonymous HTTP request returned **200** without a Vercel sign-in page.
- Drill and copy exercises both completed on exact reference matches, displayed results, and recorded history.
- Task 1 writing reached 151 words; pausing and a full production-page reload restored the text, elapsed time, and paused state; finishing recorded the result.
- Task 2 displayed a 40-minute limit and 250-word minimum; a 302-word test response reached the minimum and completed successfully.
- Reload retained the two typing-session records and selected light theme. Progress then displayed all four production smoke-test sessions with correct mode-specific fields.
- Production tested at desktop and 390 × 844 mobile viewports; no page-width overflow.
- 1-, 3-, and 5-minute selections displayed 01:00, 03:00, and 05:00 respectively. Next exercise changed the title and reference and cleared the input.
- No production-domain warning/error messages were captured by the browser log collector.
- Confirmed reset and draft-restart flows cleared only the synthetic QA data created during this run; the final app was left ready for new practice.
- Vercel reported **READY**, framework **Next.js**, Git connection **KulafuAcademy/KEYFLOW**, and production branch **main**. The first production deployment was automatically triggered by the initial GitHub push.

The browser runs used Chromium, not a full Safari/Firefox/device matrix. Export and clipboard were exercised locally; production completion and persistence were exercised separately on the public origin.
