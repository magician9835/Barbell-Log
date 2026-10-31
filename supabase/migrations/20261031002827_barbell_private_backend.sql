-- Private, account-owned records. Variable movement structures stay lossless JSONB;
-- searchable dates, types, weights and sessions have typed/indexed columns.
create schema if not exists barbell_private;
revoke all on schema barbell_private from public, anon, authenticated;

create table public.barbell_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('lift','meet','bodyweight','accessory')),
  id text not null check (length(id) between 1 and 200),
  record_date date,
  base text,
  session text,
  weight numeric(9,3),
  data jsonb not null check (jsonb_typeof(data)='object'),
  revision bigint not null default 1 check (revision>0),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id,kind,id),
  check (weight is null or weight>0)
);
create index barbell_records_history_idx on public.barbell_records(owner_id,kind,record_date desc) where not deleted;
create index barbell_records_lift_idx on public.barbell_records(owner_id,base,record_date desc) where kind='lift' and not deleted;

create table public.barbell_documents (
  owner_id uuid not null references auth.users(id) on delete cascade,
  namespace text not null,
  id text not null,
  data jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (owner_id,namespace,id)
);
create table public.barbell_snapshots (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  device_key text not null check (length(device_key) between 1 and 160),
  data jsonb not null check (jsonb_typeof(data)='object'),
  created_at timestamptz not null default now(),
  primary key (owner_id,id)
);
create index barbell_snapshots_device_idx on public.barbell_snapshots(owner_id,device_key,created_at desc);
create table public.barbell_mutations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  token uuid not null,
  action text not null,
  payload jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id,token)
);
create table barbell_private.legacy_imports (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null unique check (owner_email=lower(owner_email)),
  source text not null,
  data jsonb not null,
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table barbell_private.legacy_imports enable row level security;
revoke all on barbell_private.legacy_imports from public, anon, authenticated;

do $$ declare t text; begin
 foreach t in array array['barbell_records','barbell_documents','barbell_snapshots','barbell_mutations'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=owner_id)',t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=owner_id)',t);
  if t in ('barbell_records','barbell_documents') then
   execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',t);
  end if;
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select,insert on public.%I to authenticated',t);
  if t in ('barbell_records','barbell_documents') then execute format('grant update on public.%I to authenticated',t); end if;
 end loop;
end $$;

create function public.barbell_apply_change(p_token uuid,p_action text,p_payload jsonb,p_expected_revision bigint default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); k text; rid text; previous public.barbell_records; saved public.barbell_records; result jsonb; deleting boolean;
begin
 if u is null then raise exception 'Sign in to Barbell Log' using errcode='28000'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||p_token::text,0));
 select response into result from public.barbell_mutations where owner_id=u and token=p_token;
 if found then return result; end if;
 k:=case p_action when 'updateEntry' then 'lift' when 'deleteEntry' then 'lift' when 'saveMeet' then 'meet' when 'deleteMeet' then 'meet' when 'logBW' then 'bodyweight' when 'saveAccessory' then 'accessory' when 'deleteAccessory' then 'accessory' else null end;
 if k is null then raise exception 'Unsupported record action'; end if;
 rid:=p_payload->>'id'; if rid is null or length(rid) not between 1 and 200 then raise exception 'Record ID required'; end if;
 deleting:=p_action in ('deleteEntry','deleteMeet','deleteAccessory');
 perform pg_advisory_xact_lock(hashtextextended(u::text||k||rid,1));
 select * into previous from public.barbell_records where owner_id=u and kind=k and id=rid for update;
 if found then
  if deleting and previous.deleted or not deleting and not previous.deleted and (previous.data-'revision')=(p_payload-'revision') then
   result:=jsonb_build_object('success',true,'id',rid,'revision',previous.revision,'deleted',previous.deleted);
   insert into public.barbell_mutations values(u,p_token,p_action,p_payload,result,now());return result;
  end if;
  if p_expected_revision is distinct from previous.revision and p_expected_revision is distinct from -1::bigint then
   return jsonb_build_object('success',false,'conflict',true,'id',rid,'current',previous.data||jsonb_build_object('revision',previous.revision,'deleted',previous.deleted));
  end if;
 end if;
 if not deleting and (p_payload->>'date' is null or (k='lift' and (coalesce((p_payload->>'weight')::numeric,0)<=0 or coalesce(p_payload->>'base','')=''))) then raise exception 'Date, movement and positive weight required'; end if;
 insert into public.barbell_records(owner_id,kind,id,record_date,base,session,weight,data,deleted)
 values(u,k,rid,case when deleting then previous.record_date else (p_payload->>'date')::date end,p_payload->>'base',p_payload->>'session',nullif(p_payload->>'weight','')::numeric,p_payload-'revision',deleting)
 on conflict(owner_id,kind,id) do update set record_date=excluded.record_date,base=excluded.base,session=excluded.session,weight=excluded.weight,data=excluded.data,deleted=excluded.deleted,revision=barbell_records.revision+1,updated_at=now()
 returning * into saved;
 result:=jsonb_build_object('success',true,'id',rid,'revision',saved.revision,'deleted',saved.deleted);
 insert into public.barbell_mutations values(u,p_token,p_action,p_payload,result,now());
 return result;
end $$;

create function public.barbell_save_snapshot(p_id uuid,p_key text,p_value jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); item jsonb; pair record;
begin
 if u is null then raise exception 'Sign in to Barbell Log' using errcode='28000'; end if;
 if octet_length(p_value::text)>2000000 then raise exception 'Snapshot exceeds 2 MB'; end if;
 -- Retry must not reapply an older snapshot over newer materialized documents.
 insert into public.barbell_snapshots(owner_id,id,device_key,data) values(u,p_id,p_key,p_value) on conflict do nothing;
 if not found then return jsonb_build_object('saved',true,'id',p_id); end if;
 for pair in select * from jsonb_each(coalesce(p_value->'data','{}')) loop
  if pair.value<>'null'::jsonb then
   insert into public.barbell_documents(owner_id,namespace,id,data) values(u,'device/'||p_key,pair.key,pair.value)
   on conflict(owner_id,namespace,id) do update set data=excluded.data,revision=barbell_documents.revision+1,updated_at=now();
  end if;
 end loop;
 return jsonb_build_object('saved',true,'id',p_id);
end $$;

create function public.barbell_get_all()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'Sign in to Barbell Log' using errcode='28000'; end if;
 select jsonb_build_object(
  'entries',coalesce(jsonb_agg(data||jsonb_build_object('revision',revision) order by record_date desc) filter(where kind='lift'),'[]'),
  'meets',coalesce(jsonb_agg(data||jsonb_build_object('revision',revision) order by record_date desc) filter(where kind='meet'),'[]'),
  'bw',coalesce(jsonb_agg(data||jsonb_build_object('revision',revision) order by record_date desc) filter(where kind='bodyweight'),'[]'),
  'accessories',coalesce(jsonb_agg(data||jsonb_build_object('revision',revision) order by record_date desc) filter(where kind='accessory'),'[]')
 ) into result from public.barbell_records where owner_id=u and not deleted;
 return result||jsonb_build_object('apiVersion',4,'appState',coalesce((select jsonb_object_agg(device_key,jsonb_build_object('id',id,'key',device_key,'updatedAt',created_at,'value',data)) from (select distinct on(device_key) * from public.barbell_snapshots where owner_id=u order by device_key,created_at desc) latest),'{}'::jsonb));
end $$;

create function public.barbell_import_legacy(p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); item jsonb; arr jsonb; k text; rid text; imported integer:=0;
begin
 if u is null then raise exception 'Sign in to Barbell Log' using errcode='28000'; end if;
 if octet_length(p_data::text)>2000000 then raise exception 'Import exceeds 2 MB'; end if;
 foreach k in array array['lift','meet','bodyweight'] loop
  arr:=coalesce(p_data->case k when 'lift' then 'entries' when 'meet' then 'meets' else 'bw' end,'[]');
  for item in select * from jsonb_array_elements(arr) loop
   rid:=item->>'id';if rid is null or rid='' then raise exception 'Imported records need stable IDs';end if;
   insert into public.barbell_records(owner_id,kind,id,record_date,base,session,weight,data)
   values(u,k,rid,(item->>'date')::date,item->>'base',item->>'session',nullif(item->>'weight','')::numeric,item-'revision') on conflict do nothing;
   if found then imported:=imported+1;end if;
  end loop;
 end loop;
 if p_data->'settings' is not null then
  insert into public.barbell_documents values(u,'preferences','legacy',p_data->'settings',1,now()) on conflict do nothing;
 end if;
 return jsonb_build_object('success',true,'imported',imported);
end $$;

-- Privilege elevation is confined to this unexposed function, solely to attach
-- the administrator-staged import to its verified email owner on first sign-in.
create function barbell_private.claim_legacy_import()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); email text; staged barbell_private.legacy_imports; result jsonb;
begin
 if u is null then raise exception 'Sign in first' using errcode='28000';end if;
 select lower(users.email) into email from auth.users where users.id=u and email_confirmed_at is not null;
 if email is null then raise exception 'Verify your email before importing history';end if;
 select * into staged from barbell_private.legacy_imports where owner_email=email for update;
 if not found then return jsonb_build_object('success',true,'imported',0);end if;
 if staged.claimed_at is not null then
  if staged.claimed_by=u then return jsonb_build_object('success',true,'alreadyClaimed',true);end if;
  raise exception 'History already belongs to another account';
 end if;
 result:=public.barbell_import_legacy(staged.data);
 update barbell_private.legacy_imports set claimed_by=u,claimed_at=now() where id=staged.id;
 return result;
end $$;
create function public.barbell_claim_history()
returns jsonb language sql security invoker set search_path='' as $$select barbell_private.claim_legacy_import()$$;

revoke all on function barbell_private.claim_legacy_import() from public,anon,authenticated;
grant usage on schema barbell_private to authenticated;
grant execute on function barbell_private.claim_legacy_import() to authenticated;
revoke all on function public.barbell_apply_change(uuid,text,jsonb,bigint),public.barbell_save_snapshot(uuid,text,jsonb),public.barbell_get_all(),public.barbell_import_legacy(jsonb),public.barbell_claim_history() from public,anon;
grant execute on function public.barbell_apply_change(uuid,text,jsonb,bigint),public.barbell_save_snapshot(uuid,text,jsonb),public.barbell_get_all(),public.barbell_import_legacy(jsonb),public.barbell_claim_history() to authenticated;
