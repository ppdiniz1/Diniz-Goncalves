-- Finança a Dois — schema inicial
-- Rode este arquivo no SQL Editor do seu projeto Supabase (https://app.supabase.com)

-- ============================================================
-- EXTENSÕES
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- HOUSEHOLDS (o "casal" / grupo que compartilha os dados)
-- ============================================================
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nosso Orçamento',
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES (1 por usuário autenticado, ligado a um household)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text not null default 'Usuário',
  color text not null default '#3a63f5',
  created_at timestamptz not null default now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')) default 'expense',
  color text not null default '#3a63f5',
  icon text not null default '💸',
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRANSACTIONS (gastos e receitas)
-- ============================================================
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('expense', 'income')) default 'expense',
  amount numeric(12,2) not null check (amount >= 0),
  description text not null default '',
  occurred_on date not null default current_date,
  source text not null default 'manual' check (source in ('manual', 'nubank_csv', 'nubank_api')),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_household on transactions(household_id, occurred_on desc);

-- ============================================================
-- INVESTMENT ACCOUNTS (ex: Tesouro Direto, XP, Nubank Investimentos)
-- ============================================================
create table if not exists investment_accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category text not null default 'Renda Fixa',
  broker text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- INVESTMENT MOVEMENTS (aportes, resgates, atualizações de saldo)
-- ============================================================
create table if not exists investment_movements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references investment_accounts(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  movement_type text not null check (movement_type in ('aporte', 'resgate', 'saldo_atual')),
  amount numeric(12,2) not null check (amount >= 0),
  occurred_on date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_investment_movements_account on investment_movements(account_id, occurred_on desc);

-- ============================================================
-- BUDGETS (orçamento planejado por categoria/mês)
-- ============================================================
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month date not null, -- sempre dia 1 do mês, ex: 2026-07-01
  planned_amount numeric(12,2) not null check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  unique (household_id, category_id, month)
);

-- ============================================================
-- FUNÇÃO: criar household + profile automaticamente no signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table households enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table investment_accounts enable row level security;
alter table investment_movements enable row level security;
alter table budgets enable row level security;

-- helper: household do usuário logado
create or replace function public.current_household_id()
returns uuid as $$
  select household_id from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- profiles: usuário vê/edita o próprio perfil e vê perfis do mesmo household
create policy "profiles_select_own_household" on profiles
  for select using (id = auth.uid() or household_id = public.current_household_id());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- households: membros podem ver e atualizar o próprio household
create policy "households_select_member" on households
  for select using (id = public.current_household_id());

create policy "households_update_member" on households
  for update using (id = public.current_household_id());

create policy "households_insert_any_authenticated" on households
  for insert with check (auth.uid() is not null);

-- categories / transactions / investment_accounts / investment_movements / budgets:
-- qualquer membro do household pode ler e escrever os dados do household
create policy "categories_all_household" on categories
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "transactions_all_household" on transactions
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "investment_accounts_all_household" on investment_accounts
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "investment_movements_all_household" on investment_movements
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

create policy "budgets_all_household" on budgets
  for all using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- ============================================================
-- CATEGORIAS PADRÃO (função para popular ao criar household)
-- ============================================================
create or replace function public.seed_default_categories(p_household_id uuid)
returns void as $$
begin
  insert into categories (household_id, name, kind, color, icon) values
    (p_household_id, 'Moradia', 'expense', '#3a63f5', '🏠'),
    (p_household_id, 'Alimentação', 'expense', '#ef4444', '🍽️'),
    (p_household_id, 'Transporte', 'expense', '#f59e0b', '🚗'),
    (p_household_id, 'Lazer', 'expense', '#a855f7', '🎉'),
    (p_household_id, 'Saúde', 'expense', '#10b981', '💊'),
    (p_household_id, 'Educação', 'expense', '#0ea5e9', '📚'),
    (p_household_id, 'Compras', 'expense', '#ec4899', '🛍️'),
    (p_household_id, 'Assinaturas', 'expense', '#6366f1', '📱'),
    (p_household_id, 'Outros', 'expense', '#6b7280', '📦'),
    (p_household_id, 'Salário', 'income', '#10b981', '💰'),
    (p_household_id, 'Outras receitas', 'income', '#22c55e', '➕');
end;
$$ language plpgsql security definer set search_path = public;
