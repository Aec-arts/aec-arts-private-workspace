import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

class FakeDB {
  constructor(){ this.catalogue=null; this.attempts=new Map(); }
  prepare(sql){
    let values=[];
    const q={bind:(...v)=>{values=v;return q;},first:async()=>{
      if(sql.includes('SELECT attempts')) return this.attempts.get(values[0])||null;
      if(sql.includes('SELECT payload')) return this.catalogue;
      if(sql.includes('SELECT updated_at')) return this.catalogue?{updated_at:this.catalogue.updated_at}:null;
      return null;
    },run:async()=>{
      if(sql.includes('INSERT INTO login_attempts')) this.attempts.set(values[0],{ip_key:values[0],attempts:values[1],window_started:values[2]});
      else if(sql.includes('UPDATE login_attempts')) {const r=this.attempts.get(values[0]);if(r)r.attempts++;}
      else if(sql.includes('DELETE FROM login_attempts')) this.attempts.delete(values[0]);
      else if(sql.includes('UPDATE catalogue')) {if(this.catalogue && this.catalogue.updated_at===values[3]){this.catalogue={id:1,payload:values[0],updated_at:values[1],updated_by:values[2]};return {success:true,meta:{changes:1}}}return {success:true,meta:{changes:0}};}
      else if(sql.includes('INSERT OR IGNORE INTO catalogue')) {if(!this.catalogue){this.catalogue={id:1,payload:values[0],updated_at:values[1],updated_by:values[2]};return {success:true,meta:{changes:1}}}return {success:true,meta:{changes:0}};}
      return {success:true,meta:{changes:1}};
    }};return q;
  }
}
let lastAssetPath='';const env={DB:new FakeDB(),ASSETS:{fetch:async request=>{lastAssetPath=new URL(request.url).pathname;return new Response('asset')}},AEC_OWNER_PASSWORD:'Owner test password 2026!',AEC_PARTNER_PASSWORD:'Partner test password 2026!',AEC_SESSION_SECRET:'long-test-only-session-secret-that-is-not-for-production'};
const req=(path,{method='GET',body,cookie,origin='https://workspace.example'}={})=>new Request('https://workspace.example'+path,{method,headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(origin?{origin}:{})},body:body===undefined?undefined:JSON.stringify(body)});
async function call(path,opts){const response=await worker.fetch(req(path,opts),env);let body={};try{body=await response.json()}catch{}return {response,body};}
test('login succeeds and creates a secure HttpOnly session cookie',async()=>{const {response,body}=await call('/api/login',{method:'POST',body:{username:'owner',password:env.AEC_OWNER_PASSWORD}});assert.equal(response.status,200);assert.equal(body.user,'owner');const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);});
test('catalogue is private until authenticated',async()=>{const {response,body}=await call('/api/catalogue');assert.equal(response.status,401);assert.match(body.error,/sign in/i);});
test('shared catalogue saves, reloads, and blocks stale overwrite',async()=>{const login=await call('/api/login',{method:'POST',body:{username:'partner',password:env.AEC_PARTNER_PASSWORD}});const cookie=login.response.headers.get('set-cookie').split(';')[0];assert.equal(login.response.status,200);const first=await call('/api/catalogue',{cookie});assert.equal(first.response.status,200);assert.deepEqual(first.body.products,[]);const product={id:'test-1',name:'Healing Pad',price:12.5,category:'Wellbeing',description:'Test item',tag:'',image:'',art:0};const saved=await call('/api/catalogue',{method:'PUT',cookie,body:{products:[product],expectedUpdatedAt:first.body.updatedAt}});assert.equal(saved.response.status,200);assert.equal(saved.body.count,1);const loaded=await call('/api/catalogue',{cookie});assert.equal(loaded.body.products[0].name,'Healing Pad');const stale=await call('/api/catalogue',{method:'PUT',cookie,body:{products:[],expectedUpdatedAt:first.body.updatedAt}});assert.equal(stale.response.status,409);assert.equal(stale.body.conflict,true);});
test('invalid product price is rejected without saving',async()=>{const login=await call('/api/login',{method:'POST',body:{username:'owner',password:env.AEC_OWNER_PASSWORD}});const cookie=login.response.headers.get('set-cookie').split(';')[0];const current=await call('/api/catalogue',{cookie});const result=await call('/api/catalogue',{method:'PUT',cookie,body:{products:[{id:'bad',name:'Bad price',price:-1}],expectedUpdatedAt:current.body.updatedAt}});assert.equal(result.response.status,400);assert.match(result.body.error,/price/i);});
test('wrong password is rejected',async()=>{const {response,body}=await call('/api/login',{method:'POST',body:{username:'owner',password:'wrong'}});assert.equal(response.status,401);assert.match(body.error,/not recognised/i);});
test('cross-origin API request is rejected',async()=>{const {response}=await call('/api/login',{method:'POST',body:{username:'owner',password:env.AEC_OWNER_PASSWORD},origin:'https://attacker.example'});assert.equal(response.status,403);});

test('private storefront preview redirects unauthenticated visitors',async()=>{const {response}=await call('/preview');assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/');});
test('private storefront preview serves the app shell to an authenticated user',async()=>{const login=await call('/api/login',{method:'POST',body:{username:'owner',password:env.AEC_OWNER_PASSWORD}});const cookie=login.response.headers.get('set-cookie').split(';')[0];const response=await worker.fetch(req('/preview',{cookie,origin:null}),env);assert.equal(response.status,200);assert.equal(await response.text(),'asset');assert.equal(lastAssetPath,'/index.html');assert.equal(response.headers.get('cache-control'),'no-store');});
