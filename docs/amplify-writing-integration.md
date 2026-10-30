# AMPLIFY Writing integration

## Selected approach

KEYFLOW retains its Next.js client practice UI and localStorage answers. Its same-origin `/api/amplify/questions` gateway reads AMPLIFY's public, GET-only Writing API. AMPLIFY remains the only question store; its existing server-only Supabase client reads the existing `questions` table and private `question-images` bucket.

Options inspected before implementation:

1. The existing AMPLIFY `/api/questions` filters published rows, but caps results without pagination, normalizes only the original broad types, and omits private `image_paths` materials. It cannot supply the complete Writing bank.
2. Direct anonymous Supabase reads are blocked by the current RLS/grants. Changing those would violate the no-schema/access-change scope. Sharing AMPLIFY's service-role key with KEYFLOW would add unnecessary privilege and coupling.
3. **Selected:** additive, read-only AMPLIFY Writing endpoints, consumed by KEYFLOW's server. No DB changes or shared credentials.

AMPLIFY PR: https://github.com/KulafuAcademy/AMPLIFY/pull/18. The original AMPLIFY checkout was left untouched; the API change was made in an isolated checkout. No existing question, status, schema, RLS policy, or storage object was changed.

## Configuration

KEYFLOW requires **no Supabase keys and no new mandatory environment variables**. Its production default origin is `https://amplify-eight-delta.vercel.app`.

Optional server-only variable: `AMPLIFY_API_ORIGIN` (origin only, no path/credentials/query). HTTPS is required outside local development. Localhost HTTP is supported for integration tests. No `NEXT_PUBLIC_` configuration or CORS change is needed.

AMPLIFY reuses its existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` configuration. No new AMPLIFY variables are required. The service-role key stays exclusively in AMPLIFY server code and is never transferred to KEYFLOW.

## API boundary

AMPLIFY adds:

- `GET /api/writing-questions?cursor=<uuid>`: published metadata, 50 records/page, stable primary-key keyset pagination.
- `GET /api/writing-questions/<uuid>`: published question content, exact question type, safe supporting link and material indexes. Publication is rechecked on every selection.
- `GET /api/writing-questions/<uuid>/materials/<index>`: checks publication again before downloading from the existing private bucket. PNG/JPEG/WebP/GIF/PDF only, 15 MiB maximum, no-store and nosniff.

KEYFLOW proxies only these fixed read paths. It does not accept an arbitrary URL, forward credentials, or implement mutation methods. Redirects are rejected and upstream calls time out. Both services use no-store responses; no signed URLs are persisted. Unknown/unpublished/non-Writing records fail closed. Reading, Listening, Speaking and administrator metadata are excluded.

The picker loads every page before presenting a complete bank, deduplicates IDs and rejects malformed/repeated cursors or incomplete responses. It refreshes on focus/visibility and every 30 seconds. A question hidden between a refresh and a load is rejected by the detail endpoint. A currently open response is never discarded by a failed list/detail request.

## Types and learner experience

All seven existing Writing labels are supported: Task 1/2 without a variant, Academic Task 1/2, General Training Task 1/2, and shared Academic/General Training Task 2. Shared essays appear in both Academic and General Training filters. Legacy unspecified labels remain explicitly unspecified; KEYFLOW does not guess or rewrite AMPLIFY's metadata. The bank contains some content/type mismatches (for example, Academic-style content labelled General Training); these remain source data for AMPLIFY's owner to review, not records KEYFLOW modifies.

Task 1 uses 20 minutes / 150 words; Task 2 uses 40 minutes / 250 words. General Training Task 1 displays AMPLIFY’s original letter instructions. KEYFLOW does not add a conflicting task interpretation when source labels and content differ. Uploaded images display inline with an enlargement dialog and a separate-open fallback; PDFs and externally hosted supporting documents have safe open links. External document owners control their sharing permissions.

Built-in Basic/Visual practice, Task 2, drills and copy practice remain available independently of AMPLIFY. Writing source changes pause an active response. Successful remote selection saves the outgoing answer and restores the chosen answer, if present. An outage shows an inline retry state while built-ins and saved answers remain usable.

## Persistence without duplicating the bank

The existing `keyflow.drafts.v1` structure remains compatible. Remote drafts use `amplify:<source uuid>` and add only an optional reference: source, ID, original question type and task number. The answer, elapsed time and status remain local as before. KEYFLOW does **not** save a copy of the question body, bank rows, supporting images, or supporting URLs in localStorage or a database.

Saved AMPLIFY answers have a separate restore control, outside new-question selection. They can be edited/exported even if AMPLIFY is offline or the original question is hidden/deleted. In that case the original prompt is intentionally not republished: the UI explains that the question is not loaded. Reload a still-published question from the bank to see its current content again. Original task settings are retained for existing answers. Old built-in draft IDs and session history are unchanged.

Text saves on every edit. Elapsed-time checkpoints use interval, visibility and pagehide events for mobile Safari/PWA lifecycle handling. Native text editing, select controls, scrolling and image dialogs are retained; no synthetic keyboard shortcuts or authentication are introduced.

## Verification

See `QA.md`. Hidden/outage scenarios use a disposable local fixture and unit tests; no live records were hidden or edited to test this integration. Current live counts were compared with read-only DB aggregates. Actual Safari/PWA hardware testing is distinct from responsive Chromium checks and is not claimed.
