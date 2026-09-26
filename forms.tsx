"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {employees} from '@/lib/rules.mjs';
export function ActionForm({actor,action,reference,children,label}:{actor:string;action:string;reference?:string;children:React.ReactNode;label:string}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <form className="entry-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');const form=e.currentTarget,data=new FormData(form),input:any=Object.fromEntries(data.entries());
 if(data.has('richard'))input.split=['richard','anastasia','jean_claude'].map(k=>data.get(k));
 try{const response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor,action,reference,input})});const result=await response.json();if(!response.ok)throw new Error(result.error);setMessage('Saved. Check the sync and Telegram statuses below.');if(action==='sale'||action==='expense')form.reset();router.refresh();}
 catch(error){setMessage(error instanceof Error?error.message:'Request failed. Refresh records before retrying.');}finally{setBusy(false);}
 }}><fieldset disabled={busy}>{children}<button className="primary" type="submit">{busy?'Saving…':label}</button></fieldset><p role="status" aria-live="polite" className="form-message">{message}</p></form>;
}
export function Field({name,label,type='text',value,required=true}:{name:string;label:string;type?:string;value?:string|number;required?:boolean}){return <label>{label}<input name={name} type={type} defaultValue={value} required={required} {...(type==='number'?{min:'0',step:'0.01'}:{maxLength:name==='description'?1000:name==='reference'?40:200})}/></label>;}
export function Split({values=[100,0,0]}:{values?:number[]}){return <div className="split">{['richard','anastasia','jean_claude'].map((k,i)=><label key={k}>{['Richard','Anastasia','Jean-Claude'][i]} %<input required name={k} type="number" min="0" max="100" step="0.01" defaultValue={values[i]}/></label>)}</div>;}
export function Allocation({value='A'}:{value?:string}){return <label>Allocation<select name="allocation" defaultValue={value}><option value="A">Project A · Respectable Relatives</option><option value="B">Project B · Drunk University Friends</option><option>Company overhead</option></select></label>;}
export function Mapping({actor}:{actor:string}){return <ActionForm actor={actor} action="mapping" label="Link Telegram account"><label>Employee<select name="employee">{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><Field name="user" label="Numeric Telegram user ID"/></ActionForm>;}
