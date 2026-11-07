import { EncryptJWT, jwtDecrypt, jwtVerify, createRemoteJWKSet, base64url, type JWTVerifyGetKey } from 'jose';

import {app,config,allowedUser,coordinator,isHandle} from './hub-sso-session';
export * from './hub-sso-session';
export const random = () => base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
export async function seal(payload: Record<string,unknown>, purpose: string, ttl: number) {
  const c = config();
  return new EncryptJWT(payload).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuer(c.origin).setAudience(purpose).setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000)+ttl).encrypt(c.secret);
}
export async function open(value: string, purpose: string) {
  const c=config(); return (await jwtDecrypt(value,c.secret,{issuer:c.origin,audience:purpose,keyManagementAlgorithms:['dir'],contentEncryptionAlgorithms:['A256GCM']})).payload;
}
async function provider(path: string, options: RequestInit={}) {
  const c=config();const r=await fetch(c.issuer+path,{...options,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{apikey:c.key,...options.headers}});
  if(!r.ok) throw Error('Local identity request failed');return r.json();
}
export async function startFlow() {
  const c=config(),state=random(),nonce=random(),verifier=random();
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const url=new URL(c.issuer+'/oauth/authorize');url.search=new URLSearchParams({client_id:c.clientId,redirect_uri:c.redirectUri,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:base64url.encode(new Uint8Array(digest)),code_challenge_method:'S256'}).toString();
  return {url:c.authorizeThroughHub?await authorizationUi(url,c):url.href,cookie:await seal({state,nonce,verifier},app+'-oauth-flow',300)};
}
// The provider's Site URL continues to govern its existing invitation/recovery flows.
// Create the standard authorization request server-side, then route its opaque ID to
// the registered Hub UI. Never visit the returned Location or forward credentials there.
export async function authorizationUi(url:URL,c:{issuer:string;hubOrigin:string;key:string}){
 if(url.origin+url.pathname!==c.issuer+'/oauth/authorize')throw Error('Unexpected authorization endpoint');
 const r=await fetch(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{apikey:c.key}});
 if(![302,303,307,308].includes(r.status))throw Error('Authorization request could not be created');
 const location=r.headers.get('location');if(!location)throw Error('Missing authorization response');
 const target=new URL(location,c.issuer),ids=target.searchParams.getAll('authorization_id');
 if(target.pathname!=='/oauth/consent'||target.username||target.password||target.hash||ids.length!==1||!/^[a-zA-Z0-9_-]{10,200}$/.test(ids[0])||target.searchParams.has('code')||target.searchParams.has('access_token'))throw Error('Unexpected authorization response');
 const hub=new URL('/oauth/consent',c.hubOrigin);hub.searchParams.set('authorization_id',ids[0]);return hub.href;
}
export async function finishFlow(params: URLSearchParams, cookie: string) {
  const c=config(),flow=await open(cookie,app+'-oauth-flow');
  if(params.getAll('state').length!==1 || params.getAll('code').length!==1 || params.has('error') || !params.get('code') || flow.state!==params.get('state') || typeof flow.verifier!=='string' || typeof flow.nonce!=='string') throw Error('Invalid OAuth callback');
  const tokens=await provider('/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:c.clientId,redirect_uri:c.redirectUri,code:params.get('code')!,code_verifier:flow.verifier})});
  if(typeof tokens.access_token!=='string'||typeof tokens.id_token!=='string'||tokens.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(tokens.expires_in)||tokens.expires_in<=0)throw Error('Invalid token response');
  const jwks=createRemoteJWKSet(new URL(c.issuer+'/.well-known/jwks.json'),{timeoutDuration:8000});
  const {id,access}=await verifyTokens(tokens,flow.nonce,c,jwks);
  const user=await provider('/user',{headers:{Authorization:'Bearer '+tokens.access_token}});
  if(!allowedUser(user)||user.id!==id.sub)throw Error('Hub membership required');
  const ttl=Math.min(tokens.expires_in,Number(id.exp)-Math.floor(Date.now()/1000),Number(access.exp)-Math.floor(Date.now()/1000));
  if(ttl<=0)throw Error('Expired identity');
  if(typeof tokens.refresh_token!=='string'||!tokens.refresh_token)throw Error('Refresh capability required');
  const linked=await coordinator('link',{code:params.get('code'),tokens:{access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_in:ttl}});
  if(typeof linked.handle!=='string'||!isHandle(linked.handle)||!Number.isInteger(linked.ttl)||linked.ttl<=0||linked.ttl>8*3600)throw Error('Invalid app session');
  return {cookie:linked.handle,ttl:linked.ttl};
}
export async function verifyTokens(tokens:{id_token:string;access_token:string},nonce:string,c:{issuer:string;clientId:string},jwks:JWTVerifyGetKey) {
  const id=(await jwtVerify(tokens.id_token,jwks,{issuer:c.issuer,audience:c.clientId,algorithms:['ES256'],requiredClaims:['sub','exp','iat','nonce']})).payload;
  const access=(await jwtVerify(tokens.access_token,jwks,{issuer:c.issuer,audience:'authenticated',algorithms:['ES256'],requiredClaims:['sub','exp','iat','client_id']})).payload;
  if(id.nonce!==nonce||access.client_id!==c.clientId||id.sub!==access.sub)throw Error('Token binding mismatch');
  return {id,access};
}
