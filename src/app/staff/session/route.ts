import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { staffAuthConfig } from "@/lib/staff-auth";

export async function POST(request: NextRequest) {
  const config = staffAuthConfig();
  if (!config) return NextResponse.json({ error: "Staff authentication is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Enter your staff email and password." }, { status: 400 });
  const cookieWrites: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
  const client = createServerClient(config.url, config.anonKey, {
    cookieOptions: { name: "keyflow_staff_auth", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: { getAll: () => request.cookies.getAll(), setAll: (values) => { cookieWrites.push(...values); } },
  });
  const { data, error } = await client.auth.signInWithPassword({ email: body.email, password: body.password });
  if (error || !data.user) return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  if (data.user.app_metadata?.staff_access !== true) {
    await client.auth.signOut();
    const denied = NextResponse.json({ error: "This account is not authorised for staff access." }, { status: 403 });
    cookieWrites.forEach(({ name, value, options }) => denied.cookies.set(name, value, options));
    return denied;
  }
  const response = NextResponse.json({ ok: true });
  cookieWrites.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
