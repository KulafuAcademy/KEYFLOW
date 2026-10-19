# Task 1: progressive practice

## Learner workflow

The original three simple Task 1 questions remain **Basic Practice**. Their IDs (`w1`, `w2`, `w3`), instructions, table values, and saved drafts are unchanged. Basic keeps the original seven-option prompt menu, including all four existing Task 2 questions.

**Visual Practice** adds 21 independent questions: three bar charts, three line graphs, three pie-chart comparisons, three new tables, three process diagrams, three map comparisons, and three mixed-chart questions. Use the Basic / Visual selector beneath the question menu. Visual questions can be filtered by type; Random Question draws from the current filter and excludes the current question. Task 2 remains accessible from the prompt menu, with its original 40-minute timer and 250-word minimum. Task 1 controls are hidden for Task 2.

Both Task 1 categories use the existing 20-minute clock, 150-word indicator, editor, pause/resume, local autosave, copy/text export, and session history. Switching questions or categories saves the outgoing response and restores the destination draft paused. Drafts use stable IDs in the existing `keyflow.drafts.v1` storage object; no migration or destructive reset is performed. After a reload, the app opens its usual drill screen; select Writing, Visual, and the saved question to restore that response.

Basic and Visual are free writing: neither receives a fabricated character accuracy or IELTS band score. Typing-drill and copy-practice scoring is unchanged.

## Data and rendering

- `src/lib/task1-visuals.ts` owns the typed question bank and category/random-selection helpers.
- Every question is original and explicitly describes fictional data. Percentage pie charts and applicable sector/subject shares total 100%. Related mixed-chart panels describe the same populations and units.
- D3's individual `d3-scale` and `d3-shape` modules generate chart scales, line paths, and pie geometry; React renders SVG. No full dashboard/charting framework is introduced.
- Bar charts use a zero baseline, direct value labels, and patterned series. Line graphs use solid/dashed/dotted lines and different markers. Exact chart values are available through accessible data tables.
- Process diagrams have numbered stages and explicit directed arrows. Glass recycling includes a labelled return cycle. Text equivalents provide the full sequence.
- Map pairs use the same boundary, scale and north orientation. Patterned land uses, labels, legends, a road, a 50 m scale bar, and text descriptions support comparison.
- Every visual has an Enlarge button. Its native modal supports keyboard focus, Escape, 50–200% zoom and scrolling. Charts/diagrams remain SVG at every size; tables remain text. Opening the visual does not pause an active timer.
- Charts use white paper with dark labels in both themes. On desktop, the question and editor sit side by side; the editor remains available while scrolling long questions. On mobile, the prompt precedes the editor, and oversized figures scroll within their own container.
- The visual renderer is lazy loaded and memoized, so its geometry is not recomputed for every editor keystroke.

## Adding questions

Add a `VisualQuestion` with a stable `v-<type>-<number>` ID, title, IELTS-style instruction, explanatory note, and the appropriate visual union. Keep data arrays aligned, state units explicitly, and use internally consistent totals. Cartesian series use a common unit and non-negative zero-based scale; map features must remain inside the shared boundary and outside the road. The built-in renderer currently supports up to three Cartesian series, five pie categories, and six to nine process stages.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Tests validate the bank, geometry, totals, preserved Basic content, distinct draft IDs, filtered randomization and shared timer boundaries. Check new content on desktop/mobile and in the enlargement dialog.

## Approval and deployment

Work is on `feat/task1-visual-questions`; production remains on `main`. The branch-specific `git.deploymentEnabled` rule in `vercel.json` prevents the GitHub feature push from creating a Vercel deployment before user approval. It does not disable `main` or any other branch. After explicit approval, merge the reviewed PR into `main` and verify its automatic production deployment. This uses Vercel's documented [branch deployment configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled).
