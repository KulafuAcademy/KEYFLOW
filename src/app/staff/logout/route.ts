import {localSsoEnabled,config as ssoConfig,SESSION_COOKIE,cookieOptions,logoutSsoSession} from '@/lib/hub-sso';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { staffAuthConfig } from "@/lib/staff-auth";

export async function GET(request: NextRequest) {
  if(localSsoEnabled())return new NextResponse('<!doctype html><html lang="en"><meta charset="utf-8"><title>Sign out · KEYFLOW</title><h1>Sign out everywhere?</h1><p>This signs you out of the Hub and all connected applications.</p><form method="post" action="/staff/logout"><button>Sign out everywhere</button></form></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; form-action 'self' http://127.0.0.1:4184; frame-ancestors 'none'; base-uri 'none'"}});
  const response = NextResponse.redirect(new URL("/staff/login", request.url));
  const config = staffAuthConfig();
  if (config) {
    const client = createServerClient(config.url, config.anonKey, { cookieOptions: { name: "keyflow_staff_auth", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" }, cookies: { getAll: () => request.cookies.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
    await client.auth.signOut();
  }
  return response;
}

export async function POST(request:NextRequest) {
  if(!localSsoEnabled())return new NextResponse('Not found',{status:404});
  try {
    const c=ssoConfig();if(request.headers.get('origin')!==c.origin)return new NextResponse('Request rejected',{status:403});
    await logoutSsoSession(request.cookies.get(SESSION_COOKIE)?.value);
    const response=NextResponse.redirect(c.hubOrigin+'/login',303);response.cookies.set(SESSION_COOKIE,'',cookieOptions(0));return response;
  }catch{const response=new NextResponse('Global sign-out could not be confirmed. Retry from the Hub.',{status:503,headers:{'Cache-Control':'no-store'}});response.cookies.set(SESSION_COOKIE,'',cookieOptions(0));return response;}
}
