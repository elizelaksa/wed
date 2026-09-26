import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {submit,approve,retry,db} from '../src/lib/server.ts';
import {totals} from '../src/lib/rules.mjs';
// In-process API adapters, not live integration evidence. No external requests.
test('shared server preserves saves on integration failures and retries same reference',async()=>{
 const originalFetch=global.fetch,oldEnv={...process.env};
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 Object.assign(process.env,{SUPABASE_URL:'https://database.test',SUPABASE_SERVICE_ROLE_KEY:'test-server-key',GOOGLE_SPREADSHEET_ID:'test-sheet',TELEGRAM_BOT_TOKEN:'test-bot',GOOGLE_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})}),TEST_SHEETS_FAILURE:'1',TEST_TELEGRAM_FAILURE:'0'});
 const records=new Map(),notices=[],sheet=new Map(),messages=[],mappings=new Map([['richard','123']]);let id=0;
 const response=(data,status=200)=>new Response(data===null?'':JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 const match=(url,row)=>[...url.searchParams].every(([k,v])=>!v.startsWith('eq.')&&!v.startsWith('neq.')||v.startsWith('eq.')?(!v.startsWith('eq.')||String(row[k])===v.slice(3)):String(row[k])!==v.slice(4));
 global.fetch=async(url,init={})=>{
 const u=new URL(url),body=init.body&&typeof init.body==='string'?JSON.parse(init.body):null,method=init.method??'GET';
 if(u.hostname==='oauth2.googleapis.com')return response({access_token:'test-access'});
 if(u.hostname==='sheets.googleapis.com'){
 if(!u.pathname.includes('/values/'))return response({sheets:[{properties:{title:'Sales',sheetId:0,gridProperties:{rowCount:1000}}}]});
 if(method==='PUT'){const row=Number(u.pathname.match(/!A(\d+)/)[1]);sheet.set(row,body.values[0]);return response({});}
 const last=Math.max(1,...sheet.keys());return response({values:Array.from({length:last-1},(_,i)=>sheet.has(i+2)?[sheet.get(i+2)[0]]:[])});
 }
 if(u.hostname==='api.telegram.org'){messages.push(body);return response({ok:true,result:{message_id:messages.length}});}
 assert.equal(u.hostname,'database.test','No unmocked network request');
 const route=u.pathname.replace('/rest/v1/','');
 if(route==='rpc/fi_create'){
 if(records.has(body.p_proposal.reference))return response({message:'Reference already exists'},400);
 const row={reference:body.p_proposal.reference,kind:body.p_kind,actor:body.p_actor,proposal:body.p_proposal,decision:null,source:body.p_source,original_chat_id:body.p_chat,created_at:'2026-09-26T00:00:00Z',sheet_row:records.size+2,sync_status:'Sync pending'};
 records.set(row.reference,row);notices.push({id:++id,reference:row.reference,event:'submitted',status:'Pending'});return response(row);
 }
 if(route==='rpc/fi_decide'){
 const row=records.get(body.p_reference);if(!row.decision){row.decision=body.p_decision;row.sync_status='Sync pending';notices.push({id:++id,reference:row.reference,event:'approved',status:'Pending'});}return response(row);
 }
 if(route==='rpc/fi_lock')return response(true);
 if(route==='rpc/fi_claim_notification'){const n=notices.find(n=>n.id===body.p_id);if(n.status==='Sent')return response(false);n.lease_token=body.p_token;n.status='Sending';return response(true);}
 if(route==='fi_locks')return response(null);
 if(route==='fi_mappings'){const actor=u.searchParams.get('employee_id')?.slice(3);return response(mappings.has(actor)?[{user_id:mappings.get(actor)}]:[]);}
 if(route==='fi_chats')return response([{chat_id:'123'}]);
 const values=route==='fi_transactions'?[...records.values()]:notices;
 const selected=values.filter(row=>match(u,row));
 if(method==='PATCH'){selected.forEach(row=>Object.assign(row,body));return response(null);}
 return response(selected);
 };
 try{
 const input={reference:'NEW99',customer:'Future customer',description:'Future event',amount:'37.91',project:'A',split:[20,30,50]};
 await assert.rejects(submit('sale',input,'kevin','website'));
 await assert.rejects(submit('sale',{...input,split:[60,30,20]},'richard','website'));assert.equal(records.size,0);
 await submit('sale',input,'richard','telegram','original-chat',77);
 assert.equal(records.size,1);assert.equal(records.get('NEW99').sync_status,'Sync failed');assert.equal(messages[0].chat_id,'original-chat');assert.equal(notices[0].status,'Sent');
 await assert.rejects(submit('sale',input,'richard','website'),/Reference already exists/);
 process.env.TEST_SHEETS_FAILURE='0';await retry('NEW99','richard');assert.equal(sheet.size,1);assert.equal(sheet.get(2)[0],'NEW99');assert.equal(sheet.get(2)[10],'');assert.equal(sheet.get(2)[13],0);
 process.env.TEST_TELEGRAM_FAILURE='1';await approve('NEW99',{split:[50,25,25]},'svetlana');assert.equal(notices[1].status,'Failed');assert.ok(records.get('NEW99').decision);const before=totals([...records.values()]);assert.equal(before.result,3412);
 mappings.set('richard','changed-chat');process.env.TEST_TELEGRAM_FAILURE='0';await retry('NEW99','svetlana');assert.equal(messages.at(-1).chat_id,'original-chat');assert.equal(notices[1].status,'Sent');assert.equal(sheet.size,1);assert.equal(sheet.get(2)[10],50);
 await approve('NEW99',{split:[100,0,0]},'svetlana');assert.deepEqual(totals([...records.values()]),before);assert.equal(notices.length,2);assert.equal(messages.length,2);assert.equal(sheet.size,1);
 await assert.rejects(approve('NEW99',{split:[100,0,0]},'richard'));assert.deepEqual(totals([...records.values()]),before);
 }finally{global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in oldEnv))delete process.env[key];Object.assign(process.env,oldEnv);}
});
