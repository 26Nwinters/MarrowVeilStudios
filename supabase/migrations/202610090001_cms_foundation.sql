-- MarrowVeil Studios CMS foundation
-- Apply in the Supabase SQL Editor before opening employee/cms.html.
-- Content permissions are enforced in Postgres, not by hiding admin controls.

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_cms_admin() from public;
grant execute on function public.is_cms_admin() to authenticated, anon;

create table if not exists public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  slug text not null unique,
  excerpt text not null default '',
  category text not null default 'Devlog',
  cover_image text,
  cover_alt text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  seo_title text not null default '',
  seo_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists cms_posts_publication_idx
  on public.cms_posts (status, published_at desc);
create index if not exists cms_posts_updated_idx
  on public.cms_posts (updated_at desc);

create table if not exists public.cms_post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.cms_posts(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  changed_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique(post_id, version_number)
);

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  sections jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  seo_title text not null default '',
  seo_description text not null default '',
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.cms_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  changed_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique(page_id, version_number)
);

create table if not exists public.cms_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.cms_posts enable row level security;
alter table public.cms_post_versions enable row level security;
alter table public.cms_pages enable row level security;
alter table public.cms_page_versions enable row level security;
alter table public.cms_audit_log enable row level security;

drop policy if exists "Public reads published posts" on public.cms_posts;
create policy "Public reads published posts" on public.cms_posts
  for select to anon, authenticated using (status = 'published');
drop policy if exists "Admins manage posts" on public.cms_posts;
create policy "Admins manage posts" on public.cms_posts
  for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists "Admins manage post versions" on public.cms_post_versions;
create policy "Admins manage post versions" on public.cms_post_versions
  for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists "Public reads published pages" on public.cms_pages;
create policy "Public reads published pages" on public.cms_pages
  for select to anon, authenticated using (status = 'published');
drop policy if exists "Admins manage pages" on public.cms_pages;
create policy "Admins manage pages" on public.cms_pages
  for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists "Admins manage page versions" on public.cms_page_versions;
create policy "Admins manage page versions" on public.cms_page_versions
  for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());

drop policy if exists "Admins read CMS audit log" on public.cms_audit_log;
create policy "Admins read CMS audit log" on public.cms_audit_log
  for select to authenticated using (public.is_cms_admin());
drop policy if exists "Admins write CMS audit log" on public.cms_audit_log;
create policy "Admins write CMS audit log" on public.cms_audit_log
  for insert to authenticated with check (public.is_cms_admin());

grant select on public.cms_posts, public.cms_pages to anon, authenticated;
grant insert, update, delete on public.cms_posts, public.cms_post_versions,
  public.cms_pages, public.cms_page_versions, public.cms_audit_log to authenticated;
grant select on public.cms_post_versions, public.cms_page_versions, public.cms_audit_log to authenticated;

-- Public bucket is for publishable studio imagery only. Do not put employee submissions here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cms-media', 'cms-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "CMS media public read" on storage.objects;
create policy "CMS media public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'cms-media');
drop policy if exists "CMS admins upload media" on storage.objects;
create policy "CMS admins upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'cms-media' and public.is_cms_admin());
drop policy if exists "CMS admins update media" on storage.objects;
create policy "CMS admins update media" on storage.objects
  for update to authenticated using (bucket_id = 'cms-media' and public.is_cms_admin())
  with check (bucket_id = 'cms-media' and public.is_cms_admin());
drop policy if exists "CMS admins delete media" on storage.objects;
create policy "CMS admins delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'cms-media' and public.is_cms_admin());
