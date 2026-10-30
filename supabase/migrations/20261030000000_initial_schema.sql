create extension if not exists pgcrypto;

create type public.account_status as enum ('active', 'blocked');
create type public.listing_status as enum ('pending', 'approved', 'rejected', 'changes_requested');
create type public.media_kind as enum ('image', 'video', 'youtube');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  email_verified boolean not null default false,
  full_name text not null check (char_length(full_name) between 2 and 100),
  account_status public.account_status not null default 'active',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  can_submit_websites boolean not null default false,
  can_submit_apps boolean not null default false,
  website_limit integer not null default 0 check (website_limit >= 0),
  app_limit integer not null default 0 check (app_limit >= 0),
  unlimited_websites boolean not null default false,
  unlimited_apps boolean not null default false,
  starts_at timestamptz,
  expires_at timestamptz,
  lifetime_access boolean not null default false,
  updated_at timestamptz not null default now(),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  destination_url text not null check (destination_url ~* '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#]|$)'),
  description text not null check (char_length(description) between 10 and 3000),
  logo_path text,
  developer_name text not null check (char_length(developer_name) between 2 and 120),
  contact_information text not null check (char_length(contact_information) between 2 and 300),
  category_id uuid references public.categories(id) on delete set null,
  approval_status public.listing_status not null default 'pending',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.android_apps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  description text not null check (char_length(description) between 10 and 3000),
  logo_path text,
  apk_path text,
  external_download_url text check (external_download_url is null or external_download_url ~* '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#]|$)'),
  google_play_url text check (google_play_url is null or google_play_url ~* '^https://(play\.google\.com|market\.android\.com)/'),
  developer_name text not null check (char_length(developer_name) between 2 and 120),
  version text not null check (char_length(version) between 1 and 40),
  package_name text not null check (package_name ~ '^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$'),
  category_id uuid references public.categories(id) on delete set null,
  approval_status public.listing_status not null default 'pending',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, package_name),
  check ((apk_path is not null) <> (external_download_url is not null))
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  media_type public.media_kind not null,
  object_path text,
  youtube_url text check (youtube_url is null or youtube_url ~* '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (media_type = 'youtube' and youtube_url is not null and object_path is null)
    or (media_type in ('image', 'video') and object_path is not null and youtube_url is null)
  )
);

create table public.download_events (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.android_apps(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null check (char_length(action) between 1 and 100),
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.admin_login_attempts (
  ip_fingerprint text primary key,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

create index websites_public_idx on public.websites (created_at desc)
  where approval_status = 'approved' and is_published = true;
create index websites_owner_idx on public.websites (owner_id, created_at desc);
create index android_apps_public_idx on public.android_apps (created_at desc)
  where approval_status = 'approved' and is_published = true;
create index android_apps_owner_idx on public.android_apps (owner_id, created_at desc);
create index media_items_public_idx on public.media_items (display_order, created_at)
  where is_published = true;
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index download_events_app_idx on public.download_events (app_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger permissions_set_updated_at before update on public.user_permissions
for each row execute function public.set_updated_at();
create trigger websites_set_updated_at before update on public.websites
for each row execute function public.set_updated_at();
create trigger android_apps_set_updated_at before update on public.android_apps
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_name text;
begin
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  insert into public.profiles (id, email, email_verified, full_name)
  values (
    new.id,
    new.email,
    new.email_confirmed_at is not null,
    coalesce(left(requested_name, 100), 'New member')
  );
  insert into public.user_permissions (user_id)
  values (new.id);
  return new;
end;
$$;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set email = new.email,
      email_verified = new.email_confirmed_at is not null
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
create trigger on_auth_user_updated
after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_auth_user_profile();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$;

create or replace function public.has_active_permission(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_user_id is distinct from (select auth.uid()) and not public.is_admin() then false
    else exists (
      select 1
      from public.user_permissions up
      where up.user_id = p_user_id
        and (up.starts_at is null or up.starts_at <= now())
        and (
          up.lifetime_access
          or up.expires_at is null
          or up.expires_at > now()
        )
    )
  end;
$$;
revoke all on function public.has_active_permission(uuid) from public, anon;
grant execute on function public.has_active_permission(uuid) to authenticated;

create or replace function public.validate_listing_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  permission public.user_permissions%rowtype;
  profile_state public.account_status;
  used_count integer;
  allowed boolean;
  unlimited boolean;
  allowed_count integer;
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if auth.uid() is null or new.owner_id <> auth.uid() then
    raise exception 'Listing owner does not match the authenticated user';
  end if;

  select account_status into profile_state
  from public.profiles where id = auth.uid();
  if profile_state is distinct from 'active'::public.account_status then
    raise exception 'Account is not active';
  end if;

  select * into permission
  from public.user_permissions
  where user_id = auth.uid()
  for update;

  if not found
    or (permission.starts_at is not null and permission.starts_at > now())
    or (not permission.lifetime_access and permission.expires_at is not null and permission.expires_at <= now()) then
    raise exception 'Submission access is not active';
  end if;

  if tg_table_name = 'websites' then
    allowed := permission.can_submit_websites;
    unlimited := permission.unlimited_websites;
    allowed_count := permission.website_limit;
    select count(*) into used_count from public.websites
    where owner_id = auth.uid()
      and approval_status in ('pending', 'approved', 'changes_requested');
  else
    allowed := permission.can_submit_apps;
    unlimited := permission.unlimited_apps;
    allowed_count := permission.app_limit;
    select count(*) into used_count from public.android_apps
    where owner_id = auth.uid()
      and approval_status in ('pending', 'approved', 'changes_requested');
  end if;

  if not allowed then
    raise exception 'Submission type is not enabled for this account';
  end if;
  if tg_op = 'INSERT' and not unlimited and used_count >= allowed_count then
    raise exception 'Submission limit reached';
  end if;

  if tg_table_name = 'android_apps'
    and new.apk_path is not null
    and split_part(new.apk_path, '/', 1) <> auth.uid()::text then
    raise exception 'APK files must be stored in the account owner folder';
  end if;

  if tg_op = 'UPDATE' then
    new.approval_status := 'pending';
    new.is_published := false;
  end if;
  return new;
end;
$$;

create trigger websites_validate_write before insert or update on public.websites
for each row execute function public.validate_listing_write();
create trigger android_apps_validate_write before insert or update on public.android_apps
for each row execute function public.validate_listing_write();

create or replace function public.consume_admin_login_attempt(p_fingerprint text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempts public.admin_login_attempts%rowtype;
begin
  if p_fingerprint !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  insert into public.admin_login_attempts (ip_fingerprint)
  values (p_fingerprint)
  on conflict (ip_fingerprint) do nothing;

  select * into attempts
  from public.admin_login_attempts
  where ip_fingerprint = p_fingerprint
  for update;

  if attempts.locked_until is not null and attempts.locked_until > now() then
    return false;
  end if;

  if attempts.window_started_at < now() - interval '15 minutes' then
    update public.admin_login_attempts
    set attempt_count = 1, window_started_at = now(), locked_until = null
    where ip_fingerprint = p_fingerprint;
    return true;
  end if;

  if attempts.attempt_count >= 5 then
    update public.admin_login_attempts
    set locked_until = now() + interval '15 minutes'
    where ip_fingerprint = p_fingerprint;
    return false;
  end if;

  update public.admin_login_attempts
  set
    attempt_count = attempt_count + 1,
    locked_until = case
      when attempt_count + 1 >= 5 then now() + interval '15 minutes'
      else locked_until
    end
  where ip_fingerprint = p_fingerprint;
  return true;
end;
$$;

create or replace function public.record_admin_login_attempt(p_fingerprint text, p_succeeded boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid rate-limit key';
  end if;

  if p_succeeded then
    update public.admin_login_attempts
    set attempt_count = 0, window_started_at = now(), locked_until = null
    where ip_fingerprint = p_fingerprint;
  end if;
end;
$$;

revoke all on function public.consume_admin_login_attempt(text) from public, anon, authenticated;
revoke all on function public.record_admin_login_attempt(text, boolean) from public, anon, authenticated;
grant execute on function public.consume_admin_login_attempt(text) to service_role;
grant execute on function public.record_admin_login_attempt(text, boolean) to service_role;

alter table public.profiles enable row level security;
alter table public.user_permissions enable row level security;
alter table public.categories enable row level security;
alter table public.websites enable row level security;
alter table public.android_apps enable row level security;
alter table public.media_items enable row level security;
alter table public.download_events enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_login_attempts enable row level security;

create policy "Profiles are visible to their owner or admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());
create policy "Admins manage profiles"
on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "Owners can update their profile"
on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "Permission is visible to owner or admin"
on public.user_permissions for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());
create policy "Admins manage permissions"
on public.user_permissions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Active categories are public"
on public.categories for select to anon, authenticated
using (is_active = true or public.is_admin());
create policy "Admins manage categories"
on public.categories for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Public and owned websites are visible"
on public.websites for select to anon, authenticated
using (
  (approval_status = 'approved' and is_published)
  or owner_id = (select auth.uid())
  or public.is_admin()
);
create policy "Owners submit websites"
on public.websites for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy "Owners edit websites"
on public.websites for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners or admins delete websites"
on public.websites for delete to authenticated
using (owner_id = (select auth.uid()) or public.is_admin());
create policy "Admins manage websites"
on public.websites for all to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke insert, update on public.websites from authenticated;
grant insert (owner_id, name, destination_url, description, logo_path, developer_name, contact_information, category_id) on public.websites to authenticated;
grant update (name, destination_url, description, logo_path, developer_name, contact_information, category_id) on public.websites to authenticated;

create policy "Public and owned apps are visible"
on public.android_apps for select to anon, authenticated
using (
  (approval_status = 'approved' and is_published)
  or owner_id = (select auth.uid())
  or public.is_admin()
);
create policy "Owners submit apps"
on public.android_apps for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy "Owners edit apps"
on public.android_apps for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners or admins delete apps"
on public.android_apps for delete to authenticated
using (owner_id = (select auth.uid()) or public.is_admin());
create policy "Admins manage apps"
on public.android_apps for all to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke insert, update on public.android_apps from authenticated;
grant insert (owner_id, name, description, logo_path, apk_path, external_download_url, google_play_url, developer_name, version, package_name, category_id) on public.android_apps to authenticated;
grant update (name, description, logo_path, apk_path, external_download_url, google_play_url, developer_name, version, package_name, category_id) on public.android_apps to authenticated;

create policy "Published media is visible"
on public.media_items for select to anon, authenticated
using (is_published = true or public.is_admin());
create policy "Admins manage media"
on public.media_items for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Public can record published app downloads"
on public.download_events for insert to anon, authenticated
with check (exists (
  select 1 from public.android_apps
  where id = app_id and approval_status = 'approved' and is_published = true
));
create policy "Admins view download events"
on public.download_events for select to authenticated
using (public.is_admin());

create policy "Admins view audit logs"
on public.admin_audit_logs for select to authenticated
using (public.is_admin());
create policy "Admins create audit logs"
on public.admin_audit_logs for insert to authenticated
with check (public.is_admin() and admin_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('apks', 'apks', false, 104857600, array['application/vnd.android.package-archive', 'application/octet-stream']),
  ('media', 'media', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners upload APKs to their folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'apks'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    join public.user_permissions up on up.user_id = p.id
    where p.id = (select auth.uid())
      and p.account_status = 'active'
      and up.can_submit_apps = true
      and (up.starts_at is null or up.starts_at <= now())
      and (up.lifetime_access or up.expires_at is null or up.expires_at > now())
  )
);
create policy "APK downloads are limited to published apps"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'apks'
  and exists (
    select 1 from public.android_apps a
    where a.apk_path = name
      and a.approval_status = 'approved'
      and a.is_published = true
  )
);
create policy "Published media objects can be read"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'media'
  and exists (
    select 1 from public.media_items m
    where m.object_path = name and m.is_published = true
  )
);

-- Owner bootstrap is intentionally performed with the Supabase service role,
-- never from public registration. See README for the one-time setup procedure.
