-- Run once, after Austin has signed up: psql -v owner_id=<his auth user id> -f 0002_bootstrap_owner.sql
-- (or paste the id in place in the dashboard). No screen or API can change the Owner; only a new migration can.
select format('create or replace function public.owner_uid() returns uuid language sql immutable as %L',
              format('select %L::uuid', :'owner_id')) \gexec
grant execute on function public.owner_uid() to authenticated, service_role, supabase_auth_admin;
update public.app_accounts set role = 'owner', status = 'active' where uid = public.owner_uid();

-- The Owner acting, with a full sign-in (password or Google, not a saved session) in the last 15 minutes.
-- Supabase puts each sign-in method and its time in the token's "amr" list; a refresh keeps the original time.
create or replace function public.owner_fresh() returns boolean language sql stable as $$
  select auth.uid() = public.owner_uid()
     and coalesce((select max((a->>'timestamp')::bigint) from jsonb_array_elements(auth.jwt()->'amr') a
                   where a->>'method' in ('password','oauth')), 0)
         >= extract(epoch from now())::bigint - 900
$$;
grant execute on function public.owner_fresh() to authenticated;
-- The Owner reading, on any full sign-in (a saved session is fine; a temporary-password session is not).
create or replace function public.owner_signed_in() returns boolean language sql stable as $$
  select auth.uid() = public.owner_uid() and public.full_signin()
$$;
grant execute on function public.owner_signed_in() to authenticated;

-- Column guard. RLS can't limit columns, so this trigger does. Security invoker on purpose:
-- current_user must be the caller's role.
create or replace function public.guard_app_accounts() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  caller uuid := auth.uid();
  is_service boolean := current_user in ('service_role','postgres','supabase_auth_admin');
begin
  if new.uid <> old.uid or new.email is distinct from old.email or new.provider <> old.provider
     or new.created_at <> old.created_at then
    raise exception 'That field can''t change.';
  end if;
  if new.role = 'owner' and new.uid <> owner_uid() then
    raise exception 'Only Austin''s account is the Owner.';
  end if;
  if old.uid = owner_uid() and old.role = 'owner' and (new.role <> old.role or new.status <> old.status
       or new.perms <> old.perms or new.require_setup <> old.require_setup) then
    raise exception 'The Owner account can''t be changed.';
  end if;
  if is_service then
    return new;  -- owner-admin and Supabase itself: status, must_change_password, password_removed_at
  end if;
  if new.status <> old.status or new.must_change_password <> old.must_change_password
     or new.password_removed_at is distinct from old.password_removed_at then
    raise exception 'Status changes go through the Owner screen.';
  end if;
  if caller = owner_uid() then
    return new;  -- Owner: perms, require_setup, names
  end if;
  if new.role <> old.role or new.perms <> old.perms or new.require_setup <> old.require_setup then
    raise exception 'Only the Owner can change permissions.';
  end if;
  if new.display_name ~* '\mowner\M' then
    raise exception 'Pick another name.';
  end if;
  return new;  -- a Member: own display_name only (RLS limits them to their own row)
end $$;
create trigger guard_app_accounts before update on public.app_accounts
  for each row execute function public.guard_app_accounts();

-- The Owner's account can't be deleted, at either level.
create or replace function public.refuse_owner_delete() returns trigger
language plpgsql as $$
begin
  if old.id = public.owner_uid() then raise exception 'The Owner account can''t be deleted.'; end if;
  return old;
end $$;
create trigger refuse_owner_delete before delete on auth.users
  for each row execute function public.refuse_owner_delete();
create or replace function public.refuse_owner_row_delete() returns trigger
language plpgsql as $$
begin
  if old.uid = public.owner_uid() then raise exception 'The Owner account can''t be deleted.'; end if;
  return old;
end $$;
create trigger refuse_owner_row_delete before delete on public.app_accounts
  for each row execute function public.refuse_owner_row_delete();

create policy settings_read on public.app_settings for select to authenticated using (public.is_active());
create policy settings_owner on public.app_settings for update to authenticated
  using (public.owner_fresh()) with check (public.owner_fresh());

create policy accounts_read on public.app_accounts for select to authenticated
  using ((uid = auth.uid() and public.full_signin()) or public.owner_signed_in());
create policy accounts_update on public.app_accounts for update to authenticated
  using ((uid = auth.uid() and public.is_active()) or public.owner_fresh())
  with check ((uid = auth.uid() and public.is_active()) or public.owner_fresh());

create policy events_owner on public.account_events for select to authenticated
  using (public.owner_signed_in());

create policy notices_owner_read on public.notices for select to authenticated
  using (public.owner_signed_in());
create policy notices_owner_send on public.notices for insert to authenticated
  with check (public.owner_fresh() and sent_by = auth.uid());
create policy notices_owner_take_back on public.notices for delete to authenticated
  using (public.owner_fresh());
-- A person sees a notice for everyone only if it was sent after they joined, or one sent to them.
create policy notices_read on public.notices for select to authenticated
  using (public.is_active() and (
    (audience = 'all' and created_at >= (select a.created_at from public.app_accounts a where a.uid = auth.uid()))
    or exists (select 1 from public.notice_recipients r where r.notice_id = notices.id and r.uid = auth.uid())));

create policy recipients_owner_read on public.notice_recipients for select to authenticated
  using (public.owner_signed_in());
create policy recipients_owner_add on public.notice_recipients for insert to authenticated
  with check (public.owner_fresh());
create policy recipients_own on public.notice_recipients for select to authenticated
  using (uid = auth.uid() and public.full_signin());

create policy reads_owner on public.notice_reads for select to authenticated
  using (public.owner_signed_in());
create policy reads_own on public.notice_reads for select to authenticated using (uid = auth.uid() and public.full_signin());
create policy reads_mark on public.notice_reads for insert to authenticated
  with check (uid = auth.uid() and public.is_active()
              and exists (select 1 from public.notices n where n.id = notice_id));
