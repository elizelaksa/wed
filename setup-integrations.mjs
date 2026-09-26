// Run locally after copying .env.example to .env.local. Never upload .env.local.
import {createSign,randomBytes} from 'node:crypto';
try{process.loadEnvFile('.env.local');}catch{}
const env=n=>{if(!process.env[n])throw new Error(`Missing ${n}`);return process.env[n];};
const mode=process.argv[2];
async function call(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});const data=await r.json();if(!r.ok||data.ok===false)throw new Error('API request failed; check credentials, sharing and configuration.');return data;}
async function token(){const a=JSON.parse(env('GOOGLE_SERVICE_ACCOUNT_JSON')),now=Math.floor(Date.now()/1000),b=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),s=b({alg:'RS256',typ:'JWT'})+'.'+b({iss:a.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}),sign=createSign('RSA-SHA256');sign.update(s);sign.end();return (await call('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:s+'.'+sign.sign(a.private_key,'base64url')})})).access_token;}
try{
if(mode==='secret'){console.log(randomBytes(32).toString('hex'));}
else if(mode==='webhook'){
 const url=new URL(process.argv[3]);if(url.protocol!=='https:')throw new Error('Use the public HTTPS Vercel URL.');
 await call(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/setWebhook`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.origin+'/api/telegram',secret_token:env('TELEGRAM_WEBHOOK_SECRET'),allowed_updates:['message'],drop_pending_updates:false})});
 const info=await call(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/getWebhookInfo`);if(info.result.url!==url.origin+'/api/telegram')throw new Error('Webhook verification failed');console.log('Webhook registered and URL verified. Send /start to the bot.');
}else if(mode==='sheets'){
 const access=await token(),base=`https://sheets.googleapis.com/v4/spreadsheets/${env('GOOGLE_SPREADSHEET_ID')}`,headers={Authorization:`Bearer ${access}`,'Content-Type':'application/json'};
 const meta=await call(base,{headers});
 const titles=['Sales','Expenses'];for(const title of titles)if(!meta.sheets.some(s=>s.properties.title===title))await call(base+':batchUpdate',{method:'POST',headers,body:JSON.stringify({requests:[{addSheet:{properties:{title,gridProperties:{rowCount:1000,columnCount:20,frozenRowCount:1}}}}]})});
 const columns={Sales:['Reference','Submission time','Salesperson','Customer','Project','Description','Amount','Proposed Richard %','Proposed Anastasia %','Proposed Jean-Claude %','Approved Richard %','Approved Anastasia %','Approved Jean-Claude %','Richard earned commission €','Anastasia earned commission €','Jean-Claude earned commission €','Status'],Expenses:['Reference','Submission time','Reporter','Description','Category','Amount','Proposed allocation','Final allocation','Status']};
 for(const title of titles)await call(base+`/values/${title}!A1?valueInputOption=RAW`,{method:'PUT',headers,body:JSON.stringify({values:[columns[title]]})});
 const updated=await call(base,{headers});const requests=[];
 for(const {properties:p} of updated.sheets.filter(s=>titles.includes(s.properties.title))){
 requests.push({updateSheetProperties:{properties:{sheetId:p.sheetId,gridProperties:{frozenRowCount:1}},fields:'gridProperties.frozenRowCount'}},{repeatCell:{range:{sheetId:p.sheetId,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:.09,green:.24,blue:.19},textFormat:{bold:true,foregroundColor:{red:1,green:1,blue:1}},wrapStrategy:'WRAP'}},fields:'userEnteredFormat'}},{updateDimensionProperties:{range:{sheetId:p.sheetId,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:64},fields:'pixelSize'}},{updateDimensionProperties:{range:{sheetId:p.sheetId,dimension:'COLUMNS',startIndex:0,endIndex:p.title==='Sales'?17:9},properties:{pixelSize:155},fields:'pixelSize'}});
 for(const [start,end] of p.title==='Sales'?[[6,7],[13,16]]:[[5,6]])requests.push({repeatCell:{range:{sheetId:p.sheetId,startRowIndex:1,startColumnIndex:start,endColumnIndex:end},cell:{userEnteredFormat:{numberFormat:{type:'CURRENCY',pattern:'€#,##0.00'}}},fields:'userEnteredFormat.numberFormat'}});
 }
 await call(base+':batchUpdate',{method:'POST',headers,body:JSON.stringify({requests})});console.log('Sales and Expenses headers and formatting configured. Existing transaction rows preserved.');
}else throw new Error('Use: node scripts/setup-integrations.mjs sheets | secret | webhook https://your-app.vercel.app');
}catch(e){console.error(e.message);process.exitCode=1;}
