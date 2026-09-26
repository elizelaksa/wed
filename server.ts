import 'server-only';
import { createSign,randomUUID } from 'node:crypto';
import { employee,requireRole,validateSale,validateExpense,decide,notification,status } from './rules.mjs';
// JSON data is validated at the shared business boundary before persistence.
export type Transaction={reference:string;kind:'sale'|'expense';actor:string;proposal:any;decision:any;created_at:string;approved_at:string|null;source:string;original_chat_id:string|null;sheet_row:number;sync_status:string;sync_error:string|null};
export function env(name:string){const value=process.env[name];if(!value)throw new Error(`Server configuration missing: ${name}`);return value;}
export async function db(path:string,init:RequestInit={}){
 const key=env('SUPABASE_SERVICE_ROLE_KEY'),headers=new Headers(init.headers);headers.set('apikey',key);headers.set('Content-Type','application/json');
 if(!key.startsWith('sb_secret_'))headers.set('Authorization',`Bearer ${key}`);
 const response=await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`,{...init,headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok){const e=await response.json().catch(()=>({}));
 const allowed=['Reference already exists','This role cannot submit this transaction','Only Svetlana can approve','Only Svetlana can manage mappings','Start the bot first using this Telegram account','Transaction not found'];
 throw new Error(e.code==='23505'?'Reference already exists':allowed.includes(e.message)?e.message:'Database unavailable. Check environment variables and run supabase/setup.sql.');}
 const body=await response.text();return body?JSON.parse(body):null;
}
const rpc=(name:string,args:object)=>db(`rpc/${name}`,{method:'POST',body:JSON.stringify(args)});
const patch=(table:string,filter:string,values:object)=>db(`${table}?${filter}`,{method:'PATCH',body:JSON.stringify(values)});
export async function getTransaction(ref:string):Promise<Transaction>{const rows=await db(`fi_transactions?reference=eq.${encodeURIComponent(ref)}&select=*`);if(!rows.length)throw new Error('Transaction not found');return rows[0];}
async function allRows(path:string){const result:any[]=[];for(let offset=0;;offset+=500){const page=await db(`${path}&limit=500&offset=${offset}`);result.push(...page);if(page.length<500)return result;}}
export async function load(actor:string){const e=employee(actor),manager=e.role==='manager';
 const records:Transaction[]=await allRows(`fi_transactions?select=*&order=created_at.desc,reference.asc${manager?'':`&actor=eq.${actor}`}`);
 const notices=await allRows(`fi_notifications?select=*,fi_transactions!inner(actor)&order=id.asc${manager?'':`&fi_transactions.actor=eq.${actor}`}`);
 return {records,notices,mappings:manager?await db('fi_mappings?select=*'):[],chats:manager?await db('fi_chats?select=user_id,started_at'):[]};}
async function googleToken(){const account=JSON.parse(env('GOOGLE_SERVICE_ACCOUNT_JSON')),now=Math.floor(Date.now()/1000),part=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const data=part({alg:'RS256',typ:'JWT'})+'.'+part({iss:account.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const signer=createSign('RSA-SHA256');signer.update(data);signer.end();
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:data+'.'+signer.sign(account.private_key,'base64url')}),signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Google authentication failed');return (await r.json()).access_token;}
async function sheets(token:string,path:string,method='GET',body?:object){
 const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env('GOOGLE_SPREADSHEET_ID')}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Google Sheets request failed');return r.json();}
export async function sync(ref:string){const lease=randomUUID();
 if(!await rpc('fi_lock',{p_name:'sheets',p_token:lease}))return;
 try{
 const t=await getTransaction(ref),p=t.proposal,d=t.decision,tab=t.kind==='sale'?'Sales':'Expenses';
 if(process.env.TEST_SHEETS_FAILURE==='1')throw new Error('Simulated failure');
 const token=await googleToken();
 const metadata=await sheets(token,'?fields=sheets.properties');const properties=metadata.sheets.find((s:any)=>s.properties.title===tab)?.properties;
 if(!properties)throw new Error('Required tab missing');
 const existing=await sheets(token,`/values/${tab}!A2:A`);const values:string[][]=existing.values??[];
 const matches=values.map((v,i)=>v[0]===ref?i+2:0).filter(Boolean);
 if(matches.length>1)throw new Error('Duplicate spreadsheet references require review');
 // Look up the reference on every write; use a reserved row or the first free end row.
 let row=matches[0]??t.sheet_row;
 if(!matches.length&&values[row-2]?.[0])row=Math.max(values.length+2,t.sheet_row);
 if(row>properties.gridProperties.rowCount)await sheets(token,':batchUpdate','POST',{requests:[{appendDimension:{sheetId:properties.sheetId,dimension:'ROWS',length:row-properties.gridProperties.rowCount+100}}]});
 const cells=t.kind==='sale'?[ref,t.created_at,employee(t.actor).name,p.customer,p.project,p.description,p.amount,...p.split,...(d?.split??['','','']),...(d?.earned?.map((n:number)=>n/100)??[0,0,0]),status(t)]:[ref,t.created_at,employee(t.actor).name,p.description,p.category,p.amount,p.allocation,d?.allocation??'',status(t)];
 await sheets(token,`/values/${tab}!A${row}:${t.kind==='sale'?'Q':'I'}${row}?valueInputOption=RAW`,'PUT',{values:[cells]});
 // An approval racing this write must remain pending for its newer revision.
 const latest=await getTransaction(ref);
 await patch('fi_transactions',`reference=eq.${ref}`,{sync_status:JSON.stringify(latest.decision)===JSON.stringify(t.decision)?'Synced':'Sync pending',sync_error:null});
 }catch{await patch('fi_transactions',`reference=eq.${ref}`,{sync_status:'Sync failed',sync_error:'Google Sheets update failed. Check setup and Retry.'}).catch(()=>{});}
 finally{await db(`fi_locks?name=eq.sheets&token=eq.${lease}`,{method:'DELETE'}).catch(()=>{});}
}
export async function sendTelegram(chat:string,text:string){
 const r=await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text}),signal:AbortSignal.timeout(12000)});
 const result=await r.json();if(!r.ok||!result.ok)throw new Error('Telegram delivery failed');return result.result.message_id;}
export async function deliver(ref:string){const t=await getTransaction(ref),notices=await db(`fi_notifications?reference=eq.${ref}&status=neq.Sent&order=id.asc`);
 for(const n of notices){const token=randomUUID();if(!await rpc('fi_claim_notification',{p_id:n.id,p_token:token}))continue;
 const filter=`id=eq.${n.id}&lease_token=eq.${token}`;
 try{
 let recipient=t.original_chat_id;
 if(t.source==='website'){
 const mapping=await db(`fi_mappings?employee_id=eq.${t.actor}&select=user_id`);
 recipient=mapping.length?(await db(`fi_chats?user_id=eq.${mapping[0].user_id}&select=chat_id`))[0]?.chat_id:null;
 }
 if(!recipient){await patch('fi_notifications',filter,{status:'No Telegram recipient linked',error:null,lease_until:null});continue;}
 if(process.env.TEST_TELEGRAM_FAILURE==='1')throw new Error('Simulated failure');
 const id=await sendTelegram(recipient,notification(t,n.event));
 await patch('fi_notifications',filter,{status:'Sent',message_id:id,recipient,error:null,lease_until:null});
 }catch{await patch('fi_notifications',filter,{status:'Failed',error:'Telegram delivery failed. Verify the recipient started the bot and Retry.',lease_until:null}).catch(()=>{});}
 }
}
async function integrations(ref:string){await sync(ref).catch(()=>{});await deliver(ref).catch(()=>{});}
export async function submit(kind:'sale'|'expense',input:any,actor:string,source:'website'|'telegram',chat:string|null=null,update:number|null=null){
 const proposal=kind==='sale'?validateSale(input,actor):validateExpense(input,actor);
 const t:Transaction=await rpc('fi_create',{p_actor:actor,p_kind:kind,p_proposal:proposal,p_source:source,p_chat:chat,p_update:update});
 await integrations(t.reference);return getTransaction(t.reference);
}
export async function approve(ref:string,input:any,actor:string){const t=await getTransaction(ref),decision=decide(t,input,actor);
 await rpc('fi_decide',{p_actor:actor,p_reference:ref,p_decision:decision});await integrations(ref);return getTransaction(ref);}
export async function retry(ref:string,actor:string){const t=await getTransaction(ref);if(t.actor!==actor)requireRole(actor,'manager');await integrations(ref);}
export async function mapping(actor:string,employeeId:string,user:string){requireRole(actor,'manager');employee(employeeId);if(!/^\d+$/.test(user))throw new Error('Enter the numeric Telegram user ID.');await rpc('fi_map',{p_actor:actor,p_employee:employeeId,p_user:user});}
