import {getVercelOidcToken} from '@vercel/oidc';
import {resolveSsoConfig} from './hub-runtime';
export const app=process.env.HUB_APP??process.env.HUB_LOCAL_APP??'atlas';
const hosted=Boolean(process.env.HUB_SSO_MODE&&process.env.HUB_SSO_MODE!=='local');
export const FLOW_COOKIE=hosted?'__Host-aica-'+app+'-flow':app+'_local_oauth_flow';
export const SESSION_COOKIE=hosted?'__Host-aica-'+app+'-session':app+'_local_hub_session';
const roles=new Set(['owner','developer','tester']);
// Keep the exported name for compatibility; invalid/unknown modes enter the guarded branch and fail closed.
export function localSsoEnabled(){return process.env.HUB_SSO_LOCAL==='true'||Boolean(process.env.HUB_SSO_MODE);}
export function config(){return resolveSsoConfig(process.env);}
export function allowedUser(user: {id?:string; email_confirmed_at?:string; app_metadata?:Record<string,unknown>} | null) {
  const mode=process.env.HUB_SSO_MODE;
  const scopeAllowed=!mode||mode==='local'||(['preview','production'].includes(mode)&&Array.isArray(user?.app_metadata?.hub_environments)&&user.app_metadata.hub_environments.includes(mode));
  return Boolean(scopeAllowed&&user?.id && user.email_confirmed_at && user.app_metadata?.staff_access === true && roles.has(String(user.app_metadata?.hub_role)));
}
export function cookieOptions(maxAge: number) { return {httpOnly:true,secure:hosted||process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge}; }
export async function readSsoSession(cookie?: string) {
  if(!cookie||!isHandle(cookie))return null;
  try {
    const session=await coordinator('resolve',{handle:cookie});
    if(!allowedUser(session.user)||typeof session.accessToken!=='string')return null;
    return {user:session.user,accessToken:session.accessToken};
  } catch {return null;}
}
export const isHandle=(value:string)=>/^[\w-]{43}$/.test(value);
export async function coordinator(action:'link'|'resolve'|'logout'|'delegated',payload:Record<string,unknown>) {
  const c=config();const platformToken=c.secure&&process.env.VERCEL==='1'?await getVercelOidcToken():undefined;const r=await fetch(c.hubOrigin+'/internal/sessions/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.coordinationKey,...(platformToken?{'x-vercel-trusted-oidc-idp-token':platformToken}:{})},body:JSON.stringify(payload),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('Hub session unavailable');return r.json();
}
export async function logoutSsoSession(cookie?:string) {if(cookie&&isHandle(cookie))await coordinator('logout',{handle:cookie});}
export function isWritingBankRequest(request:Request){return request.method==='GET'&&/^\/api\/writing-questions(?:\/[0-9a-f-]{36}(?:\/materials\/\d{1,2})?)?$/.test(new URL(request.url).pathname);}
export async function readDelegatedSession(accessToken:string){
  if(app!=='amplify'||!accessToken)return null;
  try{const {user}=await coordinator('delegated',{accessToken});return allowedUser(user)?{user,accessToken}:null;}catch{return null;}
}
