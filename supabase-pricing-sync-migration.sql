-- Run this once in Supabase SQL Editor if you already ran the original setup.

create table if not exists public.public_estimator_settings (
  id text primary key default 'clean-cut',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.public_estimator_settings enable row level security;

drop policy if exists "public read estimator settings" on public.public_estimator_settings;
create policy "public read estimator settings" on public.public_estimator_settings
for select to anon, authenticated
using (true);

drop policy if exists "auth manage public estimator settings" on public.public_estimator_settings;
create policy "auth manage public estimator settings" on public.public_estimator_settings
for all to authenticated
using (true)
with check (true);

grant select on public.public_estimator_settings to anon;
grant select, insert, update, delete on public.public_estimator_settings to authenticated;
