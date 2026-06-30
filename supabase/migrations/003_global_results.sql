-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: resultados globales para España y Premios FIFA
-- Estos datos son hechos objetivos del Mundial real — un solo admin de
-- plataforma los introduce una vez y se aplican a TODAS las porras.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabla de "super admins" de la plataforma (quién puede tocar los resultados globales)
create table public.platform_admins (
  id uuid references public.users on delete cascade primary key,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create policy "Anyone can check platform admins"
  on public.platform_admins for select using (true);

-- 2. Resultados globales de premios FIFA (reemplaza award_results por-pool)
create table public.global_award_results (
  id uuid primary key default gen_random_uuid(),
  award_id text unique not null,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.global_award_results enable row level security;

create policy "Anyone can read global award results"
  on public.global_award_results for select using (true);

create policy "Platform admins can manage global award results"
  on public.global_award_results for all
  using (exists (select 1 from public.platform_admins where id = auth.uid()));

-- 3. Resultados globales de España (reemplaza spain_results por-pool)
create table public.global_spain_results (
  id uuid primary key default gen_random_uuid(),
  field_id text unique not null,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.global_spain_results enable row level security;

create policy "Anyone can read global spain results"
  on public.global_spain_results for select using (true);

create policy "Platform admins can manage global spain results"
  on public.global_spain_results for all
  using (exists (select 1 from public.platform_admins where id = auth.uid()));

-- 4. Realtime para que todas las porras vean los cambios al instante
alter publication supabase_realtime add table public.global_award_results;
alter publication supabase_realtime add table public.global_spain_results;

-- 5. Insértate a ti mismo como platform admin
-- Primero averigua tu user_id con: select id from public.users where username = 'tu_nombre';
-- Luego ejecuta (sustituyendo el UUID):
-- insert into public.platform_admins (id) values ('TU_USER_ID_AQUI');
