import {timingSafeEqual} from 'node:crypto';
import {db,env,sendTelegram,submit,sync,deliver} from '@/lib/server';
import {parseSaleCommand,parseExpenseCommand} from '@/lib/rules.mjs';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){
 const supplied=Buffer.from(request.headers.get('x-telegram-bot-api-secret-token')??''),expected=Buffer.from(env('TELEGRAM_WEBHOOK_SECRET'));
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return new Response('Unauthorized',{status:401});
 const update=await request.json(),m=update.message;
 if(!m?.from||m.chat?.type!=='private'||typeof m.text!=='string')return Response.json({ok:true});
 const chat=String(m.chat.id),user=String(m.from.id);
 try{
 if(/^\/(start|help)(?:\s|$)/.test(m.text)){
 await db('fi_chats?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:user,chat_id:chat})});
 await sendTelegram(chat,`Friends Included\nYour Telegram user ID: ${user}\nAsk Svetlana to link it in Manager setup. You cannot assign your role here.\n\n/sale | reference | customer | A or B | description | amount | Richard%,Anastasia%,Jean-Claude%\n\n/expense | reference | description | amount | Materials, Travel or Other | A, B or Company overhead`);
 return Response.json({ok:true});}
 const existing=await db(`fi_transactions?telegram_update_id=eq.${update.update_id}&select=reference`);
 if(existing.length){await sync(existing[0].reference);await deliver(existing[0].reference);return Response.json({ok:true});}
 const mappings=await db(`fi_mappings?user_id=eq.${user}&select=employee_id`);
 if(mappings.length!==1)throw new Error('Your Telegram user ID is not linked. Ask Svetlana to link your ID in Manager setup.');
 const kind=m.text.startsWith('/expense')?'expense':'sale';
 await submit(kind,kind==='sale'?parseSaleCommand(m.text):parseExpenseCommand(m.text),mappings[0].employee_id,'telegram',chat,update.update_id);
 }catch(e){
 // A persisted transaction must never be reported as unsaved after a downstream failure.
 const saved=await db(`fi_transactions?telegram_update_id=eq.${update.update_id}&select=reference`).catch(()=>null);
 if(saved?.length)return Response.json({ok:true});
 if(saved===null)return new Response('Please retry later',{status:503});
 await sendTelegram(chat,`Not recorded. ${e instanceof Error?e.message:'Please check your submission.'}`).catch(()=>{});
 }
 return Response.json({ok:true});
}
