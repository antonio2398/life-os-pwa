-- Ejecutar en Supabase → SQL Editor (idempotente)

-- Días en que se muestra/mide un hábito en el calendario (0 = domingo … 6 = sábado),
-- igual que tasks.repeat_days. Por defecto, todos los días.
alter table public.habits add column if not exists repeat_days smallint[] not null default '{0,1,2,3,4,5,6}';
