-- Ejecutar en Supabase → SQL Editor

-- 1) Tareas: diarias vs generales, hora, cancelación y recordatorios
alter table public.tasks add column if not exists task_type    text not null default 'general'
  check (task_type in ('daily', 'general'));
alter table public.tasks add column if not exists due_time     time;          -- hora local de la tarea
alter table public.tasks add column if not exists cancelled_at timestamptz;
alter table public.tasks add column if not exists remind_at    timestamptz;   -- próximo aviso (10 min antes)
-- Días en que se repite una tarea diaria (0 = domingo … 6 = sábado) y zona horaria del usuario
alter table public.tasks add column if not exists repeat_days  smallint[] not null default '{0,1,2,3,4,5,6}';
alter table public.tasks add column if not exists timezone     text;

-- Canceladas anteriores a esta migración: se usa su última modificación como fecha de cancelación
update public.tasks set cancelled_at = updated_at where status = 'cancelled' and cancelled_at is null;

create index if not exists tasks_remind_at_idx on public.tasks (remind_at) where remind_at is not null;

-- 2) Suscripciones push (una por dispositivo/navegador)
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Cron cada minuto que dispara los avisos.
--    Reemplaza <APP_URL> (ej. https://tu-app.vercel.app) y <CRON_SECRET> (el de .env.local / Vercel).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('task-reminders') where exists (select 1 from cron.job where jobname = 'task-reminders');
select cron.schedule(
  'task-reminders',
  '* * * * *',
  $$ select net.http_get(
       url     := '<APP_URL>/api/push/cron',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
     ); $$
);
