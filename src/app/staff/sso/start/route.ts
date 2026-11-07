import { NextRequest, NextResponse } from 'next/server';
import { config, startFlow, FLOW_COOKIE, cookieOptions } from '@/lib/hub-sso';
export async function GET(request:NextRequest) {
  try {
    const c=config();if(request.headers.get('host')!==new URL(c.origin).host)return new NextResponse('Invalid host',{status:400});
    const flow=await startFlow();const r=NextResponse.redirect(flow.url,303);r.cookies.set(FLOW_COOKIE,flow.cookie,cookieOptions(300));r.headers.set('Cache-Control','no-store');r.headers.set('Referrer-Policy','no-referrer');return r;
  }catch{return new NextResponse('Hub SSO is unavailable.',{status:503});}
}
