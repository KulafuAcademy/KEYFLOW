export const applicationProfiles:Record<string,{origin:string;local:string;callback:string}>={
 atlas:{origin:'https://atlas.aica.academy',local:'http://127.0.0.1:4185',callback:'/auth/callback'},
 keyflow:{origin:'https://keyflow.aica.academy',local:'http://127.0.0.1:4186',callback:'/auth/hub-callback'},
 amplify:{origin:'https://amplify.aica.academy',local:'http://127.0.0.1:4187',callback:'/auth/hub-callback'},
 'typing-hunter':{origin:'https://typing-hunter.aica.academy',local:'http://127.0.0.1:4188',callback:'/auth/hub-callback'},
};
export function exactHttpsOrigin(value:string|undefined){
 try{const u=new URL(value!);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||u.origin!==value)throw Error();return u.origin;}catch{throw Error('An exact HTTPS origin is required');}
}
export function previewOrigin(value:string|undefined){const origin=exactHttpsOrigin(value);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*-kulafuacademys-projects\.vercel\.app$/.test(new URL(origin).hostname))throw Error('Unregistered Preview origin');return origin;}
export function resolveSsoConfig(env:Record<string,string|undefined>){
 const mode=env.HUB_SSO_MODE??'local',app=env.HUB_APP??env.HUB_LOCAL_APP??'atlas',profile=applicationProfiles[app];
 if(!profile)throw Error('Unregistered Hub application');
 if(mode==='local'){
  if(env.HUB_SSO_LOCAL!=='true'||env.NODE_ENV==='production')throw Error('Local SSO is not deployable');
  const origin=env.HUB_LOCAL_APP_ORIGIN??env.ATLAS_LOCAL_ORIGIN,issuer=env.HUB_LOCAL_ISSUER;
  if(origin!==profile.local||issuer!=='http://127.0.0.1:55431/auth/v1')throw Error('Invalid local SSO configuration');
  return validateSecrets({mode,app,origin,issuer,hubOrigin:'http://127.0.0.1:4184',secure:false,authorizeThroughHub:env.HUB_LOCAL_AUTHORIZATION_PROXY==='true',clientId:env.HUB_LOCAL_CLIENT_ID,key:env.HUB_LOCAL_ANON_KEY,secret:env.HUB_LOCAL_COOKIE_KEY,coordinationKey:env.HUB_LOCAL_COORDINATION_KEY,redirectUri:origin+profile.callback});
 }
 if(!['preview','production'].includes(mode)||env.HUB_SSO_LOCAL==='true')throw Error('Invalid Hub SSO mode');
 const origin=exactHttpsOrigin(env.HUB_APP_ORIGIN),hubOrigin=exactHttpsOrigin(env.HUB_ORIGIN),issuer=env.HUB_AUTH_ISSUER;
 if(!env.HUB_AUTH_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw Error('A publishable identity key is required');
 if(!issuer||!/^https:\/\/[a-z]{20}\.supabase\.co\/auth\/v1$/.test(issuer))throw Error('Invalid hosted identity issuer');
 if(mode==='production'){
  if(env.VERCEL_ENV!=='production'||origin!==profile.origin||hubOrigin!=='https://hub.aica.academy')throw Error('Invalid production origins');
 }else{
  if(env.VERCEL_ENV!=='preview')throw Error('Preview SSO requires a Preview deployment');
  previewOrigin(origin);previewOrigin(hubOrigin);
 }
 if(origin===hubOrigin)throw Error('Hub and applications must use separate hosts');
 return validateSecrets({mode,app,origin,issuer,hubOrigin,secure:true,authorizeThroughHub:true,clientId:env.HUB_CLIENT_ID,key:env.HUB_AUTH_PUBLISHABLE_KEY,secret:env.HUB_FLOW_ENCRYPTION_KEY,coordinationKey:env.HUB_COORDINATION_KEY,redirectUri:origin+profile.callback});
}
function validateSecrets<T extends {clientId?:string;key?:string;secret?:string;coordinationKey?:string}>(c:T){
 if(!c.clientId||!c.key||!c.secret||!/^[a-f0-9]{64}$/.test(c.secret)||!c.coordinationKey||! /^[\w-]{43}$/.test(c.coordinationKey))throw Error('Incomplete Hub SSO configuration');
 return {...c,clientId:c.clientId,key:c.key,coordinationKey:c.coordinationKey,secret:Uint8Array.from(c.secret.match(/../g)!,x=>parseInt(x,16))};
}
