-- Run the complete file in Supabase SQL Editor. Safe to run again.
-- Dedicated tables preserve any earlier practice schema. No credentials here.
begin;
create table if not exists public.fi_employees(id text primary key,name text not null,role text not null check(role in ('sales','expense','manager')));
insert into public.fi_employees values
('richard','Richard “Call Me Dick” Darling','sales'),('anastasia','Anastasia Ferrari','sales'),('jean_claude','Jean-Claude Bērziņš','sales'),('kevin','Kevin von Whatever','expense'),('svetlana','Svetlana de Monte Carlo','manager') on conflict(id) do nothing;
create table if not exists public.fi_chats(user_id text primary key,chat_id text not null,started_at timestamptz not null default now());
create table if not exists public.fi_mappings(employee_id text primary key references public.fi_employees(id),user_id text unique not null references public.fi_chats(user_id));
create sequence if not exists public.fi_sale_rows start 2;
create sequence if not exists public.fi_expense_rows start 2;
create table if not exists public.fi_transactions(
 reference text primary key,kind text not null check(kind in ('sale','expense')),actor text not null references public.fi_employees(id),
 proposal jsonb not null,decision jsonb,created_at timestamptz not null default now(),approved_at timestamptz,
 source text not null check(source in ('website','telegram')),original_chat_id text,telegram_update_id bigint unique,
 sheet_row bigint not null,sync_status text not null default 'Sync pending',sync_error text,
 check(source<>'telegram' or (original_chat_id is not null and telegram_update_id is not null)),unique(kind,sheet_row));
create table if not exists public.fi_notifications(
 id bigint generated always as identity primary key,reference text not null references public.fi_transactions(reference) on delete cascade,
 event text not null check(event in ('submitted','approved')),status text not null default 'Pending',error text,
 recipient text,message_id bigint,lease_until timestamptz,lease_token uuid,attempts int not null default 0,unique(reference,event));
create table if not exists public.fi_locks(name text primary key,token uuid not null,until_at timestamptz not null);

create or replace function public.fi_create(p_actor text,p_kind text,p_proposal jsonb,p_source text,p_chat text default null,p_update bigint default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t fi_transactions; r text; ref text:=p_proposal->>'reference'; d jsonb:=null; n bigint;
begin
 perform pg_advisory_xact_lock(818120);
 -- Replay before mapping checks preserves the original submitter on webhook retries.
 if p_update is not null then select * into t from fi_transactions where telegram_update_id=p_update; if found then return to_jsonb(t); end if; end if;
 select role into r from fi_employees where id=p_actor;
 if r is distinct from (case p_kind when 'sale' then 'sales' when 'expense' then 'expense' else '' end) then raise exception 'This role cannot submit this transaction'; end if;
 if ref is null or ref !~ '^[A-Z0-9][A-Z0-9_-]{0,39}$' then raise exception 'Invalid reference'; end if;
 if coalesce((p_proposal->>'amount')::numeric,0)<=0 then raise exception 'Amount must be greater than zero'; end if;
 if exists(select 1 from fi_transactions where reference=ref) then raise exception 'Reference already exists'; end if;
 if p_kind='expense' and p_proposal->>'allocation'='Company overhead' then d:=jsonb_build_object('allocation','Company overhead');end if;
 n:=case p_kind when 'sale' then nextval('fi_sale_rows') else nextval('fi_expense_rows') end;
 insert into fi_transactions(reference,kind,actor,proposal,decision,approved_at,source,original_chat_id,telegram_update_id,sheet_row)
 values(ref,p_kind,p_actor,p_proposal,d,case when d is not null then now() end,p_source,p_chat,p_update,n) returning * into t;
 insert into fi_notifications(reference,event) values(ref,'submitted');return to_jsonb(t);
end $$;
create or replace function public.fi_decide(p_actor text,p_reference text,p_decision jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t fi_transactions;
begin
 if not exists(select 1 from fi_employees where id=p_actor and role='manager') then raise exception 'Only Svetlana can approve';end if;
 select * into t from fi_transactions where reference=p_reference for update;
 if not found then raise exception 'Transaction not found';end if;
 if t.decision is not null then return to_jsonb(t);end if;
 update fi_transactions set decision=p_decision,approved_at=now(),sync_status='Sync pending',sync_error=null where reference=p_reference returning * into t;
 insert into fi_notifications(reference,event) values(p_reference,'approved') on conflict do nothing;return to_jsonb(t);
end $$;
create or replace function public.fi_map(p_actor text,p_employee text,p_user text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from fi_employees where id=p_actor and role='manager') then raise exception 'Only Svetlana can manage mappings';end if;
 perform pg_advisory_xact_lock(818121);
 if not exists(select 1 from fi_chats where user_id=p_user) then raise exception 'Start the bot first using this Telegram account';end if;
 delete from fi_mappings where employee_id=p_employee or user_id=p_user;
 insert into fi_mappings(employee_id,user_id) values(p_employee,p_user);
end $$;
create or replace function public.fi_lock(p_name text,p_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 insert into fi_locks values(p_name,p_token,now()+interval '3 minutes') on conflict(name) do update set token=excluded.token,until_at=excluded.until_at where fi_locks.until_at<now();
 return found;
end $$;
create or replace function public.fi_claim_notification(p_id bigint,p_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 update fi_notifications set lease_until=now()+interval '90 seconds',lease_token=p_token,status='Sending',attempts=attempts+1 where id=p_id and status<>'Sent' and (lease_until is null or lease_until<now());return found;
end $$;
-- The website and bot access these only from server-side code. No public table access.
do $$ declare n text; begin
 foreach n in array array['fi_employees','fi_chats','fi_mappings','fi_transactions','fi_notifications','fi_locks'] loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on public.%I from anon,authenticated',n);
 execute format('grant all on public.%I to service_role',n);
 end loop;
end $$;
grant usage,select on all sequences in schema public to service_role;
revoke all on function public.fi_create(text,text,jsonb,text,text,bigint),public.fi_decide(text,text,jsonb),public.fi_map(text,text,text),public.fi_lock(text,uuid),public.fi_claim_notification(bigint,uuid) from public,anon,authenticated;
grant execute on function public.fi_create(text,text,jsonb,text,text,bigint),public.fi_decide(text,text,jsonb),public.fi_map(text,text,text),public.fi_lock(text,uuid),public.fi_claim_notification(bigint,uuid) to service_role;
commit;
