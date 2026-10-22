-- ============================================================================
--  BMI / Body-Composition Tracker — Supabase schema
--  Run this in the Supabase dashboard:  SQL Editor  ->  New query  ->  paste
--  ->  Run.  Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'instructor');
  end if;
  if not exists (select 1 from pg_type where typname = 'sex_type') then
    create type sex_type as enum ('male', 'female');
  end if;
end$$;

-- ---------------------------------------------------------------------------
--  profiles  — one row per staff login (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        user_role not null default 'instructor',
  created_at  timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user an admin?  (used by policies)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
--  members  — the gym clients being tracked
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  sex           sex_type not null,
  date_of_birth date,
  height_cm     numeric(5,1) not null check (height_cm > 0),
  join_date     date not null default current_date,
  phone         text,
  notes         text,
  instructor_id uuid references public.profiles (id) on delete set null,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists members_instructor_idx on public.members (instructor_id);
create index if not exists members_name_idx        on public.members (full_name);

-- ---------------------------------------------------------------------------
--  measurements  — one row per weigh-in on the body-composition machine
-- ---------------------------------------------------------------------------
create table if not exists public.measurements (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.members (id) on delete cascade,
  measured_at    timestamptz not null default now(),
  weight_kg      numeric(5,1) not null check (weight_kg > 0),
  -- impedance metrics (typed in from the machine's display):
  body_fat_pct   numeric(4,1),   -- B-Fat %
  visceral_fat   numeric(4,1),   -- VF
  muscle_mass_kg numeric(5,1),   -- MM
  bmr            numeric(6,1),   -- BMR / RM  (kcal)
  body_age       integer,        -- B-Age (years)
  tsf            numeric(5,1),   -- TSF
  -- derived / recorded:
  bmi            numeric(4,1),   -- stored so history is stable even if height is edited
  recorded_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists measurements_member_idx on public.measurements (member_id, measured_at desc);

-- ---------------------------------------------------------------------------
--  Row Level Security
--  Model: any signed-in staff member can view clients and record readings
--  (realistic for a shared front desk).  Only admins can delete.
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.members      enable row level security;
alter table public.measurements enable row level security;

-- profiles --------------------------------------------------------------
drop policy if exists "profiles readable by staff" on public.profiles;
create policy "profiles readable by staff"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- members ---------------------------------------------------------------
drop policy if exists "members readable by staff" on public.members;
create policy "members readable by staff"
  on public.members for select
  using (auth.role() = 'authenticated');

drop policy if exists "staff can add members" on public.members;
create policy "staff can add members"
  on public.members for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "staff can edit members" on public.members;
create policy "staff can edit members"
  on public.members for update
  using (auth.role() = 'authenticated');

drop policy if exists "admins can delete members" on public.members;
create policy "admins can delete members"
  on public.members for delete
  using (public.is_admin());

-- measurements ----------------------------------------------------------
drop policy if exists "measurements readable by staff" on public.measurements;
create policy "measurements readable by staff"
  on public.measurements for select
  using (auth.role() = 'authenticated');

drop policy if exists "staff can add measurements" on public.measurements;
create policy "staff can add measurements"
  on public.measurements for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "staff can edit measurements" on public.measurements;
create policy "staff can edit measurements"
  on public.measurements for update
  using (auth.role() = 'authenticated');

drop policy if exists "admins can delete measurements" on public.measurements;
create policy "admins can delete measurements"
  on public.measurements for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
--  To make yourself an admin after signing up once in the app, run:
--    update public.profiles set role = 'admin' where id =
--      (select id from auth.users where email = 'you@example.com');
-- ---------------------------------------------------------------------------
