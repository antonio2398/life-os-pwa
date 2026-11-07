# Arquitectura

> Fuente de verdad técnica. Los documentos `../0X-*.md` son el diseño original y describen tecnologías que no se
> usaron (ver PENDIENTES → DEUDA-09).

## Stack

| Capa | Tecnología | Dónde |
|---|---|---|
| App | Next.js 14 (App Router), React 18, TypeScript | `app/` |
| Estilos | Tailwind CSS con paleta de marca (`ocean`, `brand`, `gold`) y fuente Geist local | `tailwind.config.ts`, `app/globals.css` |
| PWA | `@ducanh2912/next-pwa` (service worker, instalación) | `next.config.js`, `public/manifest.json`, `public/icons/` |
| Datos y Auth | Supabase (Postgres + Auth + RLS) vía `@supabase/ssr` | `lib/supabase/` |
| Tareas programadas | Supabase **pg_cron** → llama a `/api/push/cron` cada minuto | `sql/2026-11-03_tasks_daily_cancel_push.sql` |
| Notificaciones | Web Push (VAPID) con `web-push` | `app/api/push/*`, `lib/push.ts` |
| IA | Google Gemini (`gemini-2.0-flash`), **API key de cada usuario** | `app/api/ai/route.ts`, `lib/ai/prompts.ts` |
| Hosting | Vercel (deploy automático al hacer push a `main`) | `.vercel/` |

## Módulos (pantallas)

| Ruta | Módulo | Tablas |
|---|---|---|
| `/auth/*` | Login, registro, olvidé / restablecer contraseña | Supabase Auth |
| `/dashboard` | Life Score y scorecard semanal | `diagnostic_scores`, `weekly_scorecards` |
| `/dashboard/areas` | Diagnóstico de las 7 áreas de vida | `life_areas`, `diagnostic_scores` |
| `/dashboard/ikigai` | IKIGAI (4 listas + declaración) | `ikigai_profiles` |
| `/dashboard/dofa` | DOFA + estrategias FO/DO/FA/DA (+ IA) | `swot_items`, `ai_recommendations` |
| `/dashboard/goals` | Sueños → Metas | `dreams`, `goals` |
| `/dashboard/tasks` | Proyectos, tareas generales y diarias, calendario, recordatorios push | `projects`, `tasks`, `push_subscriptions` |
| `/dashboard/habits` | Hábitos diarios/semanales/mensuales y registro | `habits`, `habit_logs` |
| `/dashboard/finances` | Ingresos, egresos, presupuesto, historial, **cierre de mes** | `incomes`, `expenses`, `budgets`, `weekly_scorecards`, `month_closings` |
| `/dashboard/wealth` | Activos, pasivos, patrimonio neto, plan de deuda | `assets`, `liabilities` |
| `/dashboard/settings/ai` | API key de Gemini del usuario | `users.gemini_api_key` |

## Flujos importantes

- **Sesión:** `middleware.ts` redirige a `/auth/login` si no hay sesión (excepto assets PWA y `/api/push/cron`).
- **Seguridad de datos:** cada tabla de usuario tiene RLS `auth.uid() = user_id`. El cliente usa la anon key; solo
  `/api/push/cron` usa la *service role key* (servidor).
- **Finanzas → Riqueza:** son independientes salvo el **cierre de mes** (`components/finances/MonthCloseCard.tsx`):
  el balance del mes se asigna a uno o varios activos (`assets.current_value += monto`) y se registra en
  `month_closings` (único por usuario+mes; reabrir revierte). Solo mes actual y anterior.
- **Fechas:** siempre en hora local del dispositivo con `lib/dates.ts` (`toLocalDate`, `toLocalMonth`). No usar
  `toISOString()` para "hoy"/"este mes".
- **Recordatorios:** al guardar una tarea se calcula `remind_at` (10 min antes, `lib/tasks/reminders.ts`); pg_cron
  llama `/api/push/cron` (protegido con `CRON_SECRET`), que envía el push y reprograma las diarias.

## Variables de entorno

| Variable | Uso | Pública |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (respeta RLS) | sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave de servicio (ignora RLS) — **solo servidor** | **no** |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (CORS) | sí |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push | pública / **no** / no |
| `CRON_SECRET` | Autoriza a pg_cron a llamar `/api/push/cron` | **no** |

## Base de datos

- Migraciones aplicadas a mano en el SQL Editor de Supabase, guardadas en `sql/AAAA-MM-DD_descripcion.sql`.
- El esquema completo **no** está en el repo todavía (PENDIENTES → INFRA-04).

## Identidad visual

Ver `branding/README.md` (logo, paleta, tipografía, reglas). Componente de logo: `components/brand/SharkLogo.tsx`.
