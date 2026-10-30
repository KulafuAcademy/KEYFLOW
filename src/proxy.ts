import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { publicLearningAccessEnabled } from "@/lib/public-learning-access";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicLearningAccessEnabled()) {
    if (path === "/staff/login") return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (path === "/staff/login" || path === "/staff/session" || path === "/staff/logout") return NextResponse.next();
  const url = process.env.AMPLIFY_SUPABASE_URL;
  const anonKey = process.env.AMPLIFY_SUPABASE_ANON_KEY;
  const isApi = path.startsWith("/api/");
  if (!url || !anonKey) return isApi ? NextResponse.json({ error: "Staff authentication is not configured." }, { status: 503 }) : NextResponse.redirect(new URL("/staff/login?setup=required", request.url));
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { name: "keyflow_staff_auth", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: { getAll: () => request.cookies.getAll(), setAll(values) { values.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.staff_access === true) return response;
  if (isApi) return NextResponse.json({ error: user ? "Staff access is required." : "Sign in is required." }, { status: user ? 403 : 401 });
  return NextResponse.redirect(new URL(user ? "/staff/login?reason=staff" : "/staff/login", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"] };
