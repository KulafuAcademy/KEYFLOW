# Central staff access

KEYFLOW authenticates against AMPLIFY's existing Supabase Auth project. Configure `AMPLIFY_SUPABASE_URL` and `AMPLIFY_SUPABASE_ANON_KEY` as server-side variables in Vercel and local `.env.local`; neither needs a `NEXT_PUBLIC_` prefix. No service-role key is required or accepted in KEYFLOW.

Staff authorization is the exact boolean `app_metadata.staff_access: true`, validated with Supabase `auth.getUser()` on each request. User-editable `user_metadata` is ignored. AMPLIFY's `ADMIN_EMAILS` allowlist remains a separate privilege and does not grant staff access automatically.

An authorized Supabase project administrator provisions users and grants or revokes staff access through the Supabase Auth Admin API from a trusted server environment, using the existing project service-role credential there only. Preserve other `app_metadata` fields when changing `staff_access`. Never put the service-role key in KEYFLOW, browser code, Git, or client-side environment variables.

After enabling staff access, the user signs in at `/staff/login`. Per-user local browser storage prevents progress and drafts from being shared between staff accounts. On first sign-in, the browser migrates existing KEYFLOW history, drafts, and preferences into that user's namespace.
