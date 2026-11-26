#!/usr/bin/env python3
"""Rule-matrix test for the ACC1 accounts database, on a local Postgres 16 with a Supabase stand-in.
Usage: python3 -I run_db_tests.py <socket dir>. Builds a fresh database each run."""
import subprocess, sys, os, uuid, time, json
SOCK = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
MIG = os.path.join(HERE, '..', 'supabase', 'migrations')
DB = 'acc_test'

def psql(sql, db=DB, vars=None):
    cmd = ['psql', '-h', SOCK, '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At', '-q']
    for k, v in (vars or {}).items():
        cmd += ['-v', f'{k}={v}']
    r = subprocess.run(cmd, input=sql, capture_output=True, text=True)
    return r.returncode == 0, r.stdout.strip(), r.stderr.strip()

def as_user(role, sub, sql, signed_in_ago=60, method='password'):
    """Run as a Supabase API role. signed_in_ago: seconds since the sign-in (the token's amr time).
    method: how they signed in ('password', 'oauth', or 'recovery'/'otp'/'magiclink' for an emailed code)."""
    claims = ''
    if sub:
        amr = [{'method': method, 'timestamp': int(time.time()) - signed_in_ago}]
        claims = (f"set local \"request.jwt.claim.sub\" = '{sub}';"
                  f"set local \"request.jwt.claims\" = '{json.dumps({'sub': sub, 'amr': amr})}';")
    return psql(f"begin; set local role {role}; {claims}\n{sql};\ncommit;")

psql(f'drop database if exists {DB}', db='postgres'); psql(f'create database {DB}', db='postgres')
for f in [os.path.join(HERE, '00_supabase_stub.sql'), os.path.join(MIG, '0001_accounts.sql')]:
    ok, out, err = psql(open(f).read()); assert ok, (f, err)

def hook(email, provider, role='supabase_auth_admin'):
    """Supabase calls the Before User Created hook as supabase_auth_admin."""
    ev = json.dumps({'user': {'email': email, 'app_metadata': {'provider': provider}}})
    ok, out, err = as_user(role, None, f"select public.hook_before_user_created('{ev}'::jsonb)")
    return out if ok else 'ERROR'

def signup(email, provider, name=''):
    """What Supabase does on sign-up: run the hook, then create the user and its identity only if allowed."""
    if hook(email, provider) != '{}':
        return None
    meta = json.dumps({'full_name': name})
    pw = "'hash'" if provider == 'email' else 'null'
    ok, out, err = psql(f"""with u as (insert into auth.users (email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
        values ('{email}', {pw}, '{{"provider":"{provider}"}}', '{meta}') returning id),
        i as (insert into auth.identities (user_id, provider) select id, '{provider}' from u)
        select id from u""")
    assert ok, err
    return out

results = []
def check(name, got, want):
    results.append((name, got == want, got, want))

O = signup('austin@example.com', 'email', 'Austin')
ok, out, err = psql(open(os.path.join(MIG, '0002_bootstrap_owner.sql')).read(), vars={'owner_id': O}); assert ok, err
M1 = signup('pat@example.com', 'email', 'Pat')
M2 = signup('sam.lee@gmail.com', 'google', 'Sam Lee')
S = signup('kim@example.org', 'email', 'Kim')

def q(role, sub, sql, **kw):
    ok, out, err = as_user(role, sub, sql, **kw)
    return out if ok else 'ERROR'
def cnt(role, sub, sql, **kw):
    return q(role, sub, f"with x as ({sql} returning 1) select count(*) from x", **kw)
def pg(sql):
    ok, out, err = psql(sql)
    return out if ok else 'ERROR'
STALE = {'signed_in_ago': 3600}

# Sign-up hook
check('Supabase (supabase_auth_admin) can run the sign-up hook', hook('pat9@example.com', 'email'), '{}')
check('signed-in people cannot call the sign-up hook', hook('x@example.com', 'email', role='authenticated'), 'ERROR')
check('signed-out visitors cannot call the sign-up hook', hook('x@example.com', 'email', role='anon'), 'ERROR')
check('gmail.com with a password is refused', 'For a Gmail address' in hook('someone@gmail.com', 'email'), True)
check('GoogleMail.com with a password is refused (any case)', 'Gmail' in hook('Someone@GoogleMail.com', 'email'), True)
check('Google sign-up with a Gmail address is allowed', hook('x@gmail.com', 'google'), '{}')
check('phone sign-up is refused', 'email and password or Google' in hook('', 'phone'), True)
check('Apple sign-up is refused for now', 'email and password or Google' in hook('a@privaterelay.appleid.com', 'apple'), True)
# Email: only a temporary password the person asks for; nothing else can be set off from the database side
check('the old send-nothing hook is gone (Gmail sends temporary passwords now)', pg("select count(*) from pg_proc where proname='hook_send_email'"), '0')
# New rows
check('new email account is active at once, no approval', pg(f"select status||','||role from app_accounts where uid='{M1}'"), 'active,member')
check('new Google account is active at once, name from Google', pg(f"select status||','||display_name||','||provider from app_accounts where uid='{M2}'"), 'active,Sam Lee,google')
check('new account gets the default switches', pg(f"select perms = (select default_perms from app_settings) from app_accounts where uid='{M1}'"), 't')
check('exactly one Owner after bootstrap', pg("select count(*)||','||max(uid::text) from app_accounts where role='owner'"), f'1,{O}')
check('sign-up is logged', pg("select count(*) from account_events where action='account_created'"), '4')
# The Gmail rule can't be dodged
check('a sign-in email can never be changed (Gmail rule bypass)', pg(f"update auth.users set email='victim@gmail.com' where id='{M1}'"), 'ERROR')
# Google joining a password account
pg(f"insert into auth.sessions (user_id) values ('{M1}'); insert into auth.refresh_tokens (user_id, token) values ('{M1}','t')")
pg(f"insert into auth.identities (user_id, provider) values ('{M1}','google')")
check('Google joining a password account removes the password', pg(f"select encrypted_password is null from auth.users where id='{M1}'"), 't')
check('and signs out every old session', pg(f"select (select count(*) from auth.sessions where user_id='{M1}') + (select count(*) from auth.refresh_tokens where user_id='{M1}')"), '0')
check('and flags it for the Owner screen and history', pg(f"select (password_removed_at is not null)::text || ',' || (select count(*) from account_events where action='google_linked_password_removed' and target_uid='{M1}') from app_accounts where uid='{M1}'"), 'true,1')
check('a password can never be put back after Google took over', pg(f"update auth.users set encrypted_password='new' where id='{M1}'"), 'ERROR')
check('asking to change a sign-in email is refused before anything is emailed', pg(f"update auth.users set email_change='other@example.com' where id='{S}'"), 'ERROR')
check('a Google account can never get a password, even from an emailed temporary password', (pg(f"insert into auth.identities (user_id, provider) values ('{M2}','google')"), pg(f"update auth.users set encrypted_password='temp' where id='{M2}'"))[1], 'ERROR')
check('a Google-only account signing in again changes nothing', pg(f"select password_removed_at is null from app_accounts where uid='{M2}'"), 't')
# Reading
check('a Member reads only their own row', q('authenticated', M1, 'select count(*) from app_accounts'), '1')
check('the Owner reads every row', q('authenticated', O, 'select count(*) from app_accounts'), '4')
check('signed-out visitors read nothing', q('anon', None, 'select count(*) from app_accounts'), 'ERROR')
# Member writes
check('a Member can rename themselves', cnt('authenticated', M1, f"update app_accounts set display_name='Patrick' where uid='{M1}'"), '1')
check('a Member cannot call themselves the Owner', cnt('authenticated', M1, f"update app_accounts set display_name='Austin (Owner)' where uid='{M1}'"), 'ERROR')
check('a Member cannot change their own switches', cnt('authenticated', M1, f"""update app_accounts set perms='{{"assets":false}}' where uid='{M1}'"""), 'ERROR')
check('a Member cannot make themselves Owner', cnt('authenticated', M1, f"update app_accounts set role='owner' where uid='{M1}'"), 'ERROR')
check('a Member cannot change their own status', cnt('authenticated', M1, f"update app_accounts set status='suspended' where uid='{M1}'"), 'ERROR')
check('a Member cannot touch another row', cnt('authenticated', M1, f"update app_accounts set display_name='x' where uid='{M2}'"), '0')
check('a Member cannot change their email', cnt('authenticated', M1, f"update app_accounts set email='a@b.c' where uid='{M1}'"), 'ERROR')
check('nobody can insert an account row', q('authenticated', M1, f"insert into app_accounts (uid, provider, perms) values ('{uuid.uuid4()}','email','{{}}')"), 'ERROR')
check('signed-in people cannot delete an account row', q('authenticated', O, f"delete from app_accounts where uid='{M1}'"), 'ERROR')
check('a Member cannot read the change history', q('authenticated', M1, 'select count(*) from account_events'), '0')
check('a Member cannot close new accounts', cnt('authenticated', M1, 'update app_settings set allow_new_accounts=false'), '0')
# Owner writes (a full sign-in in the last 15 minutes)
check('the Owner can change a Member\'s switches', cnt('authenticated', O, f"""update app_accounts set perms=jsonb_set(perms,'{{assets}}','false') where uid='{M1}'"""), '1')
check('switches must be the known true/false switches', cnt('authenticated', O, f"""update app_accounts set perms='"x"' where uid='{M1}'"""), 'ERROR')
check('an unknown switch is refused', cnt('authenticated', O, f"""update app_accounts set perms='{{"admin":true}}' where uid='{M1}'"""), 'ERROR')
check('the Owner can ask a Member to redo setup', cnt('authenticated', O, f"update app_accounts set require_setup=true where uid='{M2}'"), '1')
check('the Owner cannot make anyone else Owner', cnt('authenticated', O, f"update app_accounts set role='owner' where uid='{M1}'"), 'ERROR')
check('the Owner cannot set status directly (goes through owner-admin)', cnt('authenticated', O, f"update app_accounts set status='suspended' where uid='{M1}'"), 'ERROR')
check('the Owner cannot demote himself', cnt('authenticated', O, f"update app_accounts set role='member' where uid='{O}'"), 'ERROR')
check('the Owner cannot turn off his own switches', cnt('authenticated', O, f"""update app_accounts set perms='{{}}' where uid='{O}'"""), 'ERROR')
check('the Owner can rename himself', cnt('authenticated', O, f"update app_accounts set display_name='Austin L' where uid='{O}'"), '1')
check('the Owner reads the change history', q('authenticated', O, "select count(*) > 0 from account_events where action='account_changed'"), 't')
# Owner on a saved session only (last full sign-in an hour ago)
check('on a saved session the Owner can still read every account', q('authenticated', O, 'select count(*) from app_accounts', **STALE), '4')
check('on a saved session the Owner cannot change switches', cnt('authenticated', O, f"""update app_accounts set perms=jsonb_set(perms,'{{learn}}','false') where uid='{M2}'""", **STALE), '0')
check('on a saved session the Owner cannot send a notice', q('authenticated', O, "insert into notices (title, body, audience) values ('Hi','x','all') returning id", **STALE), 'ERROR')
check('on a saved session the Owner cannot close new accounts', cnt('authenticated', O, 'update app_settings set allow_new_accounts=false', **STALE), '0')
# owner-admin first asks the database, with the caller's own token, whether this is the Owner with a fresh sign-in
check('owner-admin\'s check passes for the Owner 10 minutes after a full sign-in', q('authenticated', O, 'select public.owner_fresh()', signed_in_ago=600), 't')
check('owner-admin\'s check refuses the Owner 16 minutes after a full sign-in', q('authenticated', O, 'select public.owner_fresh()', signed_in_ago=960), 'f')
check('owner-admin\'s check refuses a Member', q('authenticated', M1, 'select public.owner_fresh()'), 'f')
# owner-admin (service key)
check('owner-admin can suspend a Member', cnt('service_role', None, f"update app_accounts set status='suspended' where uid='{S}'"), '1')
check('owner-admin cannot suspend the Owner', cnt('service_role', None, f"update app_accounts set status='suspended' where uid='{O}'"), 'ERROR')
check('a suspended person cannot rename themselves', cnt('authenticated', S, f"update app_accounts set display_name='y' where uid='{S}'"), '0')
pg(f"update app_accounts set must_change_password=true where uid='{S}'")
check('an emailed temporary password is stored as must change', pg(f"select must_change_password from app_accounts where uid='{S}'"), 't')
check('the person cannot clear must change themselves', cnt('authenticated', S, f"update app_accounts set must_change_password=false where uid='{S}'"), 'ERROR')
pg(f"update auth.users set encrypted_password='their own' where id='{S}'")
check('choosing their own password clears must change', pg(f"select must_change_password from app_accounts where uid='{S}'"), 'f')
# The Owner account can't be deleted
check('the Owner\'s sign-in user cannot be deleted', pg(f"delete from auth.users where id='{O}'"), 'ERROR')
check('the Owner\'s account row cannot be deleted', q('service_role', None, f"delete from app_accounts where uid='{O}'"), 'ERROR')
# Notices
nid_all = q('authenticated', O, "insert into notices (title, body, audience) values ('Welcome','Thanks for trying the app.','all') returning id")
check('the Owner can send a notice to everyone', nid_all.isdigit(), True)
check('a Member cannot send a notice', q('authenticated', M1, "insert into notices (title, body, audience) values ('Hi','x','all') returning id"), 'ERROR')
check('the Owner cannot send a notice in someone else\'s name', q('authenticated', O, f"insert into notices (title, body, audience, sent_by) values ('Hi','x','all','{M1}') returning id"), 'ERROR')
check('a notice title over 80 characters is refused', q('authenticated', O, "insert into notices (title, body, audience) values ('" + 'x'*81 + "','x','all') returning id"), 'ERROR')
nid_some = q('authenticated', O, f"with n as (insert into notices (title, body, audience) values ('For Pat','Only you see this.','some') returning id), r as (insert into notice_recipients (notice_id, uid) select id, '{M1}' from n) select id from n")
check('the Owner can send a notice to chosen people', nid_some.isdigit(), True)
check('a chosen person sees both notices', q('authenticated', M1, 'select count(*) from notices'), '2')
# A session made from an emailed temporary password can only set a new password
REC = {'method': 'recovery'}
check('a temporary-password session cannot read its own account row', q('authenticated', M1, 'select count(*) from app_accounts', **REC), '0')
check('a temporary-password session cannot rename itself', cnt('authenticated', M1, f"update app_accounts set display_name='X' where uid='{M1}'", **REC), '0')
check('a temporary-password session reads nothing from app_settings', q('authenticated', M1, 'select count(*) from app_settings', **REC), '0')
check('a password session reads app_settings', q('authenticated', M1, 'select count(*) from app_settings'), '1')
check('a temporary-password session cannot read notices', q('authenticated', M1, 'select count(*) from notices', **REC), '0')
check('a sign-in code session cannot read notices either', q('authenticated', M1, 'select count(*) from notices', method='otp'), '0')
check('an Owner temporary-password session cannot read accounts or history', q('authenticated', O, 'select (select count(*) from app_accounts) + (select count(*) from account_events)', **REC), '0')
check('an Owner magic-link session cannot change settings, even just signed in', cnt('authenticated', O, 'update app_settings set allow_new_accounts = true', method='magiclink'), '0')
check('an Owner Google sign-in reads every account', q('authenticated', O, 'select count(*) > 1 from app_accounts', method='oauth'), 't')
pg(f"update auth.users set recovery_sent_at = now() where id = '{M1}'")
check('asking for a temporary password is written to the history, with no address', pg(f"select count(*)::text || ',' || bool_and(coalesce(after::text,'') not like '%@%')::text from account_events where action='temp_password_requested' and target_uid='{M1}'"), '1,true')
check('someone not chosen sees only the one for everyone', q('authenticated', M2, 'select count(*) from notices'), '1')
check('nobody sees who else a notice went to', q('authenticated', M2, 'select count(*) from notice_recipients'), '0')
check('a suspended person sees no notices', q('authenticated', S, 'select count(*) from notices'), '0')
check('signed-out visitors see no notices', q('anon', None, 'select count(*) from notices'), 'ERROR')
LATE = signup('lee@example.net', 'email', 'Owner (Austin)')
check('a sign-up name claiming to be the Owner is left blank', pg(f"select display_name from app_accounts where uid='{LATE}'"), '')
check('someone who joins later doesn\'t get older notices for everyone', q('authenticated', LATE, 'select count(*) from notices'), '0')
check('a Member can mark a notice read', q('authenticated', M1, f"insert into notice_reads (notice_id) values ({nid_some}) returning notice_id"), nid_some)
check('a Member cannot mark it read for someone else', q('authenticated', M1, f"insert into notice_reads (notice_id, uid) values ({nid_all}, '{M2}') returning notice_id"), 'ERROR')
check('a Member cannot mark a notice they can\'t see', q('authenticated', M2, f"insert into notice_reads (notice_id) values ({nid_some}) returning notice_id"), 'ERROR')
check('the Owner sees who has read it', q('authenticated', O, f"select count(*) from notice_reads where notice_id={nid_some}"), '1')
check('a Member cannot delete a notice', cnt('authenticated', M1, f"delete from notices where id={nid_all}").replace('ERROR', '0'), '0')
check('the Owner can take a notice back', cnt('authenticated', O, f"delete from notices where id={nid_some}"), '1')
check('taking it back removes it for the person', q('authenticated', M1, 'select count(*) from notices'), '1')
# Delete my account (the delete-me function deletes the person's own sign-in user with the service key)
q('authenticated', LATE, f"insert into notice_reads (notice_id) select id from notices limit 0")
pg(f"delete from auth.users where id='{LATE}'")
check('deleting an account removes its row', pg(f"select count(*) from app_accounts where uid='{LATE}'"), '0')
check('and leaves only one bare line in the history', pg(f"select string_agg(action, ',') || ',' || bool_and(before is null and after is null) from account_events where target_uid='{LATE}' or actor_uid='{LATE}'"), 'account_deleted,true')
# Closing new accounts
check('the Owner can close new accounts', cnt('authenticated', O, 'update app_settings set allow_new_accounts=false'), '1')
check('with new accounts closed, even Google sign-up is refused', 'closed' in hook('new@gmail.com', 'google'), True)

bad = [r for r in results if not r[1]]
for name, passed, got, want in results:
    print(('PASS ' if passed else 'FAIL ') + name + ('' if passed else f'  (got {got!r}, want {want!r})'))
print(f'\n{len(results) - len(bad)} of {len(results)} passed')
sys.exit(1 if bad else 0)
