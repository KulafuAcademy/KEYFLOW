import { NextRequest, NextResponse } from 'next/server';
import { config, finishFlow, FLOW_COOKIE, SESSION_COOKIE, cookieOptions } from '@/lib/hub-sso';
export async function GET(request:NextRequest) {
  try {
    const c=config();if(request.headers.get('host')!==new URL(c.origin).host)throw Error('Invalid host');
    const flow=request.cookies.get(FLOW_COOKIE)?.value;if(!flow)throw Error('Missing browser binding');
    const session=await finishFlow(request.nextUrl.searchParams,flow);
    const r=NextResponse.redirect(new URL('/',c.origin),303);r.cookies.set(FLOW_COOKIE,'',cookieOptions(0));r.cookies.set(SESSION_COOKIE,session.cookie,cookieOptions(session.ttl));r.headers.set('Cache-Control','no-store');r.headers.set('Referrer-Policy','no-referrer');return r;
  }catch{
    const r=new NextResponse('Hub sign-in could not be completed. Return to the Hub and try again.',{status:401,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});r.cookies.set(FLOW_COOKIE,'',cookieOptions(0));return r;
  }
}
