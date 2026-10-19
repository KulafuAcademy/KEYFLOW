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

## Task 1 Basic / Visual enhancement verification

Date: 20 October 2026 (Asia/Manila). Feature branch: `feat/task1-visual-questions`.

### Automated checks

- ESLint: passed without warnings.
- TypeScript: passed.
- Unit tests: **18 passed** (the original 10 plus 8 enhancement tests).
- Production build: passed with the visual renderer in a lazy client chunk.
- Data checks: exactly 3 questions in each of 7 types, 21 unique new IDs, percentage totals, mixed-chart cohort consistency, non-negative aligned series, map bounds and road clearance, complete process stages.
- Render checks: all 21 visuals produce finite SVG geometry or accessible tables; SVG definition IDs are unique; every visual includes enlargement controls.
- Regression checks: original Basic IDs, titles and table values remain unchanged; all 4 Task 2 prompts remain available; Basic and Visual drafts coexist under the original storage key; shared Task 1 deadline clamps at 20 minutes.

### Browser checks on the feature preview

Used in-app Chromium at `http://127.0.0.1:3047`. These checks were performed on the local feature, not the unchanged production app.

- Selected and rendered **all 21 questions** through the actual category and question controls. Each showed the expected chart/table/diagram, no invalid geometry, and a 150-word minimum.
- Opened enlargement dialogs for **all seven types**. Checked SVG zoom to 150%, keyboard Escape, and close controls. Tables remain selectable text; diagrams and charts remain SVG.
- Inspected representative bar, line, pie, table, process, map, and mixed screenshots. Axes/units, series legends, percentage labels, directed process stages, north arrows, scale bars and map legends rendered.
- Random Question changed `v-mixed-3` to `v-mixed-2` while the Mixed filter was active; it did not repeat the current question or leave the category.
- A pre-existing 151-word Basic `w1` response loaded unchanged, including its original elapsed time and completed state. Switching to Visual and back preserved the Basic response exactly.
- A separate Visual response survived Basic/Visual switching and a full reload; it restored paused, could be resumed/edited/paused, and completed at 155 words. Its session appeared in history under its Visual title, with words/time and no invented accuracy or band score.
- Copy writing and `.txt` export remained functional; a browser download event was received for the Visual response.
- Basic `w2` displayed its original table, 20-minute clock and 150-word minimum. Task 2 `w5` displayed its original instruction, 40-minute clock and 250-word minimum; the Task 1 selector and visuals were absent.
- Existing Typing Drill and Copy Practice both completed on exact matches with 100% accuracy and zero uncorrected errors. Automated WPM values are smoke-test data, not human benchmarks.
- Desktop: question and editor confirmed side by side; SVG fit within its visual panel. Light/dark switching retained white chart paper and dark labels.
- Mobile: all seven types tested with a 390 × 844 requested viewport (the browser exposed a 355 CSS-pixel viewport at its current zoom). Question preceded the editor in every case. Document width was 341 CSS pixels, so no page overflow; oversized charts/diagrams scrolled inside their own visual container. Table scrolling is handled by its table wrapper. Mobile enlargement and zoom also worked.
- Fresh-page error/warning log scan after the final corrections: **0 entries**.

The full 20-minute countdown was not waited out in real time; boundary arithmetic is unit tested and the existing shared timer implementation is unchanged. This is a Chromium verification, not a Safari/Firefox device matrix.

### Release status

Prepared for PR review. No feature code has been merged into `main` or deployed to production. A branch-only Vercel deployment rule suppresses the automatic preview for this feature branch until approval; `main` automatic deployment remains enabled. The current public production application is unchanged.
