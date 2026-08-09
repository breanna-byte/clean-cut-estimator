-- Clean & Cut OS Supabase setup
-- Run this entire script once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.quotes (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key default 'clean-cut',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Public-safe estimator settings only. Never store the dashboard PIN here.
create table if not exists public.public_estimator_settings (
  id text primary key default 'clean-cut',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.quotes enable row level security;
alter table public.jobs enable row level security;
alter table public.customers enable row level security;
alter table public.settings enable row level security;
alter table public.public_estimator_settings enable row level security;

-- Customers can submit quote requests but cannot read anyone's data.
drop policy if exists "anon insert quotes" on public.quotes;
create policy "anon insert quotes" on public.quotes
for insert to anon
with check (true);

-- Everyone may read only the sanitized estimator settings.
drop policy if exists "public read estimator settings" on public.public_estimator_settings;
create policy "public read estimator settings" on public.public_estimator_settings
for select to anon, authenticated
using (true);

-- Signed-in business users can fully manage business data.
drop policy if exists "auth manage quotes" on public.quotes;
create policy "auth manage quotes" on public.quotes for all to authenticated using (true) with check (true);
drop policy if exists "auth manage jobs" on public.jobs;
create policy "auth manage jobs" on public.jobs for all to authenticated using (true) with check (true);
drop policy if exists "auth manage customers" on public.customers;
create policy "auth manage customers" on public.customers for all to authenticated using (true) with check (true);
drop policy if exists "auth manage settings" on public.settings;
create policy "auth manage settings" on public.settings for all to authenticated using (true) with check (true);
drop policy if exists "auth manage public estimator settings" on public.public_estimator_settings;
create policy "auth manage public estimator settings" on public.public_estimator_settings for all to authenticated using (true) with check (true);

grant insert on public.quotes to anon;
grant select on public.public_estimator_settings to anon;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.settings to authenticated;
grant select, insert, update, delete on public.public_estimator_settings to authenticated;

-- Private photo bucket. Customers may upload but not browse/download.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clean-cut-photos', 'clean-cut-photos', false, 6291456, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=false;

drop policy if exists "anon upload quote photos" on storage.objects;
create policy "anon upload quote photos" on storage.objects
for insert to anon
with check (bucket_id='clean-cut-photos' and (storage.foldername(name))[1]='quotes');

drop policy if exists "auth manage clean cut photos" on storage.objects;
create policy "auth manage clean cut photos" on storage.objects
for all to authenticated
using (bucket_id='clean-cut-photos')
with check (bucket_id='clean-cut-photos');
