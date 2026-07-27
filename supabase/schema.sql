create table if not exists public.seteuk_records (
  id uuid primary key,
  student text not null,
  grade text not null,
  subject text not null check (subject in ('국어', '수학', '과학')),
  content text not null,
  created_at timestamptz not null default now(),
  owner_id uuid references auth.users(id) default auth.uid()
);

alter table public.seteuk_records enable row level security;

drop policy if exists "allow anon read" on public.seteuk_records;
drop policy if exists "allow anon insert" on public.seteuk_records;
drop policy if exists "authenticated users can read own records" on public.seteuk_records;
drop policy if exists "authenticated users can insert own records" on public.seteuk_records;

create policy "authenticated users can read own records"
  on public.seteuk_records for select to authenticated
  using (auth.uid() = owner_id);

create policy "authenticated users can insert own records"
  on public.seteuk_records for insert to authenticated
  with check (auth.uid() = owner_id);
