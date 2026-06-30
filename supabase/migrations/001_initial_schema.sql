-- ─────────────────────────────────────────────────────────────────────────────
-- Tipstr — World Cup 2026 Prediction App
-- Complete database schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  locked_matches boolean not null default false,
  locked_spain boolean not null default false,
  locked_awards boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read all approved profiles"
  on public.profiles for select
  using (status = 'approved' or auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── MATCHES ─────────────────────────────────────────────────────────────────
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_number integer unique not null,
  group_name text,
  home text not null,
  away text not null,
  date text not null,
  phase text not null check (phase in ('grupos', '32avos', 'octavos', 'cuartos', 'semis', '3er', 'final')),
  pts_exact integer not null default 3,
  pts_winner integer not null default 1,
  real_home text, -- set by admin when knockout teams are known
  real_away text,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "Anyone can read matches"
  on public.matches for select using (true);

create policy "Admins can update matches"
  on public.matches for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── RESULTS ─────────────────────────────────────────────────────────────────
create table public.results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches on delete cascade not null unique,
  home_score integer not null,
  away_score integer not null,
  source text not null default 'manual' check (source in ('manual', 'api')),
  updated_at timestamptz not null default now()
);

alter table public.results enable row level security;

create policy "Anyone can read results"
  on public.results for select using (true);

create policy "Admins can insert results"
  on public.results for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update results"
  on public.results for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── PREDICTIONS ─────────────────────────────────────────────────────────────
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  match_id uuid references public.matches on delete cascade not null,
  home_score integer not null,
  away_score integer not null,
  created_at timestamptz not null default now(),
  unique(user_id, match_id)
);

alter table public.predictions enable row level security;

create policy "Users can read own predictions"
  on public.predictions for select
  using (auth.uid() = user_id);

create policy "Approved users can read predictions of locked users"
  on public.predictions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
        and p.locked_matches = true
    )
    and exists (
      select 1 from public.profiles p2
      where p2.id = user_id and p2.locked_matches = true
    )
  );

create policy "Users can insert own predictions when not locked"
  on public.predictions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and locked_matches = false
    )
  );

create policy "Users can update own predictions when not locked"
  on public.predictions for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and locked_matches = false
    )
  );

-- ─── AWARD PREDICTIONS ───────────────────────────────────────────────────────
create table public.award_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  award_id text not null,
  value text not null,
  created_at timestamptz not null default now(),
  unique(user_id, award_id)
);

alter table public.award_predictions enable row level security;

create policy "Users can read own award predictions"
  on public.award_predictions for select
  using (auth.uid() = user_id);

create policy "Locked users predictions visible to other locked users"
  on public.award_predictions for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and locked_awards = true)
    and exists (select 1 from public.profiles where id = user_id and locked_awards = true)
  );

create policy "Users can upsert own award predictions when not locked"
  on public.award_predictions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and locked_awards = false)
  );

create policy "Users can update own award predictions when not locked"
  on public.award_predictions for update
  using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and locked_awards = false)
  );

-- ─── AWARD RESULTS ───────────────────────────────────────────────────────────
create table public.award_results (
  id uuid primary key default gen_random_uuid(),
  award_id text unique not null,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.award_results enable row level security;

create policy "Anyone can read award results"
  on public.award_results for select using (true);

create policy "Admins can manage award results"
  on public.award_results for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── SPAIN PREDICTIONS ───────────────────────────────────────────────────────
create table public.spain_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  field_id text not null,
  value text not null,
  created_at timestamptz not null default now(),
  unique(user_id, field_id)
);

alter table public.spain_predictions enable row level security;

create policy "Users can read own spain predictions"
  on public.spain_predictions for select
  using (auth.uid() = user_id);

create policy "Locked users spain predictions visible to other locked users"
  on public.spain_predictions for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and locked_spain = true)
    and exists (select 1 from public.profiles where id = user_id and locked_spain = true)
  );

create policy "Users can upsert spain predictions when not locked"
  on public.spain_predictions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and locked_spain = false)
  );

create policy "Users can update spain predictions when not locked"
  on public.spain_predictions for update
  using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and locked_spain = false)
  );

-- ─── SPAIN RESULTS ───────────────────────────────────────────────────────────
create table public.spain_results (
  id uuid primary key default gen_random_uuid(),
  field_id text unique not null,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.spain_results enable row level security;

create policy "Anyone can read spain results"
  on public.spain_results for select using (true);

create policy "Admins can manage spain results"
  on public.spain_results for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── OPEN PHASES ─────────────────────────────────────────────────────────────
create table public.open_phases (
  id uuid primary key default gen_random_uuid(),
  phase text unique not null,
  is_open boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.open_phases enable row level security;

create policy "Anyone can read open phases"
  on public.open_phases for select using (true);

create policy "Admins can manage open phases"
  on public.open_phases for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── SPAIN SQUAD ─────────────────────────────────────────────────────────────
create table public.spain_squad (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  position text check (position in ('GK', 'DEF', 'MID', 'FWD')),
  created_at timestamptz not null default now()
);

alter table public.spain_squad enable row level security;

create policy "Anyone can read spain squad"
  on public.spain_squad for select using (true);

create policy "Admins can manage spain squad"
  on public.spain_squad for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── SEED DATA ───────────────────────────────────────────────────────────────

-- Open phases (only grupos open at start)
insert into public.open_phases (phase, is_open) values
  ('grupos',   true),
  ('32avos',   false),
  ('octavos',  false),
  ('cuartos',  false),
  ('semis',    false),
  ('3er',      false),
  ('final',    false);

-- Spain squad
insert into public.spain_squad (name, position) values
  ('Unai Simón', 'GK'), ('David Raya', 'GK'), ('Álex Remiro', 'GK'),
  ('Pedro Porro', 'DEF'), ('Alejandro Balde', 'DEF'), ('Marc Cucurella', 'DEF'),
  ('Pau Cubarsí', 'DEF'), ('Aymeric Laporte', 'DEF'), ('Robin Le Normand', 'DEF'),
  ('Dani Vivian', 'DEF'), ('Tete Morente', 'DEF'),
  ('Rodri', 'MID'), ('Pedri', 'MID'), ('Fabián Ruiz', 'MID'),
  ('Mikel Merino', 'MID'), ('Martín Zubimendi', 'MID'), ('Gavi', 'MID'),
  ('Fermín López', 'MID'), ('Pablo Barrios', 'MID'), ('Álex Baena', 'MID'), ('Dani Olmo', 'MID'),
  ('Lamine Yamal', 'FWD'), ('Nico Williams', 'FWD'), ('Mikel Oyarzabal', 'FWD'),
  ('Bryan Gil', 'FWD'), ('Yeremy Pino', 'FWD'), ('Borja Iglesias', 'FWD');

-- ─── REALTIME ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.results;
alter publication supabase_realtime add table public.open_phases;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.award_results;
alter publication supabase_realtime add table public.spain_results;
alter publication supabase_realtime add table public.predictions;
alter publication supabase_realtime add table public.award_predictions;
alter publication supabase_realtime add table public.spain_predictions;
