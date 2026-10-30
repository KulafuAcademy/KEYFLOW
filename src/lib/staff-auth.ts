import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicLearningAccessEnabled } from "@/lib/public-learning-access";

export type StaffIdentity = { id: string; email: string | null };

export function staffAuthConfig() {
  const url = process.env.AMPLIFY_SUPABASE_URL;
  const anonKey = process.env.AMPLIFY_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export async function createStaffServerClient() {
  const config = staffAuthConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookieOptions: {
      name: "keyflow_staff_auth",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot write cookies; route handlers and proxy refresh them.
        }
      },
    },
  });
}

export async function requireStaff() {
  if (publicLearningAccessEnabled()) return { identity: null, accessToken: null, response: null };
  const client = await createStaffServerClient();
  if (!client) return { identity: null, accessToken: null, response: Response.json({ error: "Staff authentication is not configured." }, { status: 503 }) };
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { identity: null, accessToken: null, response: Response.json({ error: "Sign in is required." }, { status: 401 }) };
  if (user.app_metadata?.staff_access !== true) return { identity: null, accessToken: null, response: Response.json({ error: "This account is not authorised for staff access." }, { status: 403 }) };
  const { data: { session } } = await client.auth.getSession();
  return { identity: { id: user.id, email: user.email ?? null } satisfies StaffIdentity, accessToken: session?.access_token ?? null, response: null };
}
