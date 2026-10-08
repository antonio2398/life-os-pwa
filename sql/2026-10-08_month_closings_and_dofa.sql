-- Ejecutar en Supabase → SQL Editor

-- 1) Cierre de mes: registra qué meses ya se transfirieron a Riqueza (assets)
create table if not exists public.month_closings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  month         text not null check (month ~ '^\d{4}-\d{2}$'),
  total_income  numeric not null default 0,
  total_expense numeric not null default 0,
  balance       numeric not null,
  allocations   jsonb not null default '[]'::jsonb,  -- [{asset_id, asset_name, amount}]
  closed_at     timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.month_closings enable row level security;

drop policy if exists "month_closings_own" on public.month_closings;
create policy "month_closings_own" on public.month_closings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) DOFA: permitir guardar estrategias FO / DO / FA / DA en swot_items
alter type public.swot_type add value if not exists 'FO';
alter type public.swot_type add value if not exists 'DO';
alter type public.swot_type add value if not exists 'FA';
alter type public.swot_type add value if not exists 'DA';
