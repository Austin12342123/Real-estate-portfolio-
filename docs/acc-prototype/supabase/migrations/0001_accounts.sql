-- ACC1 accounts, permissions and in-app notices. Prototype for the plan (v7, Nov 25); tested on a local
-- Postgres 16 with a Supabase stand-in. No portfolio data lives here: each portfolio stays on its own device.

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  allow_new_accounts boolean not null default true,
  default_perms jsonb not null default
    '{"assets":true,"settings":true,"importExport":true,"saved":true,"learn":true}'
);
insert into public.app_settings default values;

-- The permission switches: exactly these keys, each true or false.
create or replace function public.perms_ok(p jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(p) = 'object'
     and (select coalesce(bool_and(k in ('assets','settings','importExport','saved','learn')
                                   and jsonb_typeof(p->k) = 'boolean'), true)
          from jsonb_object_keys(p) k)
$$;
alter table public.app_settings add constraint default_perms_ok check (public.perms_ok(default_perms));

create table public.app_accounts (
  uid uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  email text,
  provider text not null check (provider in ('email','google')),
  role text not null default 'member' check (role in ('owner','member')),
  perms jsonb not null check (public.perms_ok(perms)),
  status text not null default 'active' check (status in ('active','suspended')),
  require_setup boolean not null default false,
  must_change_password boolean not null default false,  -- set by owner-admin with a temporary password
  password_removed_at timestamptz,                       -- set when a Google sign-in joined a password account
  created_at timestamptz not null default now()
);

create table public.account_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_uid uuid,
  action text not null,
  target_uid uuid,
  before jsonb,
  after jsonb
);

-- In-app notices from the Owner, shown only inside the app. (The only email is a temporary password a person asks for.)
create table public.notices (
  id bigserial primary key,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 2000),
  audience text not null check (audience in ('all','some')),
  sent_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.notice_recipients (
  notice_id bigint not null references public.notices(id) on delete cascade,
  uid uuid not null references public.app_accounts(uid) on delete cascade,
  primary key (notice_id, uid)
);
create table public.notice_reads (
  notice_id bigint not null references public.notices(id) on delete cascade,
  uid uuid not null default auth.uid() references public.app_accounts(uid) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, uid)
);

-- A full sign-in: password or Google somewhere in the token's sign-in list. A session made from an emailed
-- temporary password (recovery), a sign-in code (otp) or a link (magiclink) is not one: it can only set a
-- new password, and the app then signs in again with it.
create or replace function public.full_signin() returns boolean language sql stable as $$
  select exists (select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
                 where a->>'method' in ('password','oauth'))
$$;
grant execute on function public.full_signin() to authenticated;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as
$$ select public.full_signin() and exists (select 1 from app_accounts where uid = auth.uid() and status = 'active') $$;

-- 1. Supabase "Before User Created" auth hook. Only email+password and Google; Gmail addresses must use
--    Google; the Owner can close new accounts. Supabase calls it as supabase_auth_admin.
create or replace function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  provider text := coalesce(event->'user'->'app_metadata'->>'provider', 'email');
  addr text := lower(coalesce(event->'user'->>'email', ''));
begin
  if not (select allow_new_accounts from app_settings where id = 1) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'New accounts are closed right now.'));
  end if;
  if provider not in ('email','google') then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Use email and password or Google.'));
  end if;
  if provider = 'email' and split_part(addr, '@', 2) in ('gmail.com','googlemail.com') then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'For a Gmail address, tap Continue with Google.'));
  end if;
  return '{}'::jsonb;
end $$;

-- 2. Email (v7). Supabase sends through the Owner's Gmail (custom SMTP, set in the dashboard, not here). The
--    one email meant to go out is the temporary password (recovery code) to an account's own address. Magic
--    links and email codes are off, sign-up confirmation is off, email change is refused below (Supabase still mails
--    a change notice before the write, so functions/send-email drops every kind but recovery), invites need
--    the service key. Reauthentication can't be switched off: a signed-in person can get a code at their own
--    address (accepted, plan section 12). ACC0 checks the Gmail Sent folder for anything else.
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

-- 3. Every new user gets one row, active straight away (no approval), with the default switches.
create or replace function public.on_auth_user_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into app_accounts (uid, display_name, email, provider, perms)
  values (new.id,
          -- a name that claims to be the Owner is left blank; the app then asks for a name
          (select case when n ~* '\mowner\M' then '' else n end
             from (select left(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''), 60) n) x),
          new.email,
          coalesce(new.raw_app_meta_data->>'provider', 'email'),
          (select default_perms from app_settings where id = 1));
  insert into account_events (actor_uid, action, target_uid, after)
  values (new.id, 'account_created', new.id, jsonb_build_object('provider', coalesce(new.raw_app_meta_data->>'provider','email')));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.on_auth_user_created();

-- 4. A sign-in email never changes once set, so the Gmail rule can't be dodged by changing it later.
create or replace function public.refuse_email_change() returns trigger
language plpgsql as $$
begin
  if old.email is not null and new.email is distinct from old.email then
    raise exception 'Your sign-in email can''t change. Make a new account with the new email.';
  end if;
  -- asking to change it is refused too, before Supabase would email the new address
  if coalesce(new.email_change, '') <> '' and new.email_change is distinct from old.email_change then
    raise exception 'Your sign-in email can''t change. Make a new account with the new email.';
  end if;
  return new;
end $$;
create trigger refuse_email_change before update of email, email_change on auth.users
  for each row execute function public.refuse_email_change();

-- 5. A new password clears "must change" (owner-admin sets it when it emails a temporary password).
create or replace function public.on_password_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update app_accounts set must_change_password = false where uid = new.id and must_change_password;
  end if;
  return new;
end $$;
create trigger on_password_changed after update of encrypted_password on auth.users
  for each row execute function public.on_password_changed();

-- Once Google has taken over an account (step 6), no password can be put back on it.
create or replace function public.refuse_password_after_google() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.encrypted_password is not null and new.encrypted_password is distinct from old.encrypted_password
     and (exists (select 1 from app_accounts where uid = new.id and password_removed_at is not null)
          -- a Google account never gets a password, so an emailed temporary password can't add one
          or exists (select 1 from auth.identities where user_id = new.id and provider = 'google')) then
    raise exception 'This account signs in with Google only.';
  end if;
  return new;
end $$;
create trigger refuse_password_after_google before update of encrypted_password on auth.users
  for each row execute function public.refuse_password_after_google();

-- Each temporary-password request is written to the history, without the address or the code.
create or replace function public.log_temp_password_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.recovery_sent_at is distinct from old.recovery_sent_at and new.recovery_sent_at is not null then
    insert into account_events (action, target_uid) values ('temp_password_requested', new.id);
  end if;
  return new;
end $$;
create trigger log_temp_password_request after update of recovery_sent_at on auth.users
  for each row execute function public.log_temp_password_request();

-- 6. Google joining an existing password account: Supabase links a Google sign-in to the account with the
--    same email. Someone could have made that password account first, so the password is removed, every
--    old session is signed out, and the Owner screen shows it. From then on only Google signs in to it.
create or replace function public.on_identity_linked() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if new.provider = 'google' and exists (
       select 1 from auth.identities i where i.user_id = new.user_id and i.provider = 'email' and i.id <> new.id) then
    update auth.users set encrypted_password = null where id = new.user_id;
    delete from auth.refresh_tokens where user_id = new.user_id;
    delete from auth.sessions where user_id = new.user_id;
    update app_accounts set password_removed_at = now() where uid = new.user_id;
    insert into account_events (action, target_uid, after)
    values ('google_linked_password_removed', new.user_id, jsonb_build_object('provider', 'google'));
  end if;
  return new;
end $$;
create trigger on_identity_linked after insert on auth.identities
  for each row execute function public.on_identity_linked();

-- 7. Deleting an account (the person's "Delete my account", or the Owner's Remove) leaves one bare line
--    in the history and nothing else about them.
create or replace function public.on_account_deleted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from account_events where target_uid = old.uid or actor_uid = old.uid;
  insert into account_events (action, target_uid) values ('account_deleted', old.uid);
  return old;
end $$;
create trigger on_account_deleted after delete on public.app_accounts
  for each row execute function public.on_account_deleted();

-- 8. Every change writes the history.
create or replace function public.log_app_accounts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into account_events (actor_uid, action, target_uid, before, after)
  values (auth.uid(), 'account_changed', new.uid, to_jsonb(old), to_jsonb(new));
  return new;
end $$;
create trigger log_app_accounts after update on public.app_accounts
  for each row execute function public.log_app_accounts();

-- 9. Row rules on, client rights kept to the minimum.
alter table public.app_settings enable row level security;
alter table public.app_accounts enable row level security;
alter table public.account_events enable row level security;
alter table public.notices enable row level security;
alter table public.notice_recipients enable row level security;
alter table public.notice_reads enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, update (allow_new_accounts, default_perms) on public.app_settings to authenticated;
grant select, update (display_name, perms, require_setup) on public.app_accounts to authenticated;
grant select on public.account_events to authenticated;
grant select, insert, delete on public.notices to authenticated;
grant select, insert on public.notice_recipients to authenticated;
grant select, insert on public.notice_reads to authenticated;
grant usage on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to service_role;
