import test from 'node:test';
import assert from 'node:assert/strict';
test('keyflow local SSO boundary',async t=>{
 Object.assign(process.env,{HUB_SSO_LOCAL:'true',HUB_LOCAL_APP:'keyflow',HUB_LOCAL_APP_ORIGIN:'http://127.0.0.1:4186',HUB_LOCAL_ISSUER:'http://127.0.0.1:55431/auth/v1',HUB_LOCAL_CLIENT_ID:'fixture-client',HUB_LOCAL_ANON_KEY:'fixture-key',HUB_LOCAL_COOKIE_KEY:'a'.repeat(64),HUB_LOCAL_COORDINATION_KEY:'b'.repeat(43)});
 const sso=await import('../src/lib/hub-sso');
 await t.test('cookies and exact callback are scoped to this app',async()=>{const c=sso.config();assert.equal(c.redirectUri,'http://127.0.0.1:4186/auth/hub-callback');assert.equal(sso.SESSION_COOKIE,'keyflow_local_hub_session');const flow=await sso.startFlow();assert.equal(new URL(flow.url).searchParams.get('redirect_uri'),c.redirectUri);});
 await t.test('wrong app host fails closed',()=>{process.env.HUB_LOCAL_APP_ORIGIN='https://evil.example';assert.throws(sso.config);process.env.HUB_LOCAL_APP_ORIGIN='http://127.0.0.1:4186';});
 await t.test('Hub roles never come from editable user metadata',()=>{assert.equal(sso.allowedUser({id:'fixture',email_confirmed_at:'yes',app_metadata:{staff_access:true}}),false);});
 await t.test('Writing delegation is confined to read-only Writing endpoints',()=>{assert.equal(sso.isWritingBankRequest(new Request('http://127.0.0.1:4186/api/writing-questions')),true);assert.equal(sso.isWritingBankRequest(new Request('http://127.0.0.1:4186/api/admin/questions')),false);assert.equal(sso.isWritingBankRequest(new Request('http://127.0.0.1:4186/api/writing-questions',{method:'POST'})),false);});
});
