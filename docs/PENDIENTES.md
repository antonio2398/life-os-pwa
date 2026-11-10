# Pendientes y mejoras futuras

> Cada ítem fue **verificado** contra el código o con una prueba real antes de entrar aquí. La columna *Evidencia*
> dice dónde comprobarlo. Si un ítem se resuelve, se mueve a "Resueltos" con la fecha y el commit.
> Última auditoría: **2026-11-06**.

Prioridad: **P0** bloquea o rompe algo hoy · **P1** antes de abrir a más usuarios · **P2** antes de escalar · **P3** deseable.

---

## 1. Errores confirmados

| ID | P | Problema | Evidencia | Acción |
|---|---|---|---|---|
| BUG-01 | P0 | **El conversor de divisas de Finanzas nunca funciona.** La UI llama `/api/currency?amount=…&from=…&to=…` y espera `{converted, rate}`, pero esa ruta es un stub de cron que exige `Authorization: Bearer CRON_SECRET` y responde 401. | `app/dashboard/finances/page.tsx:62` (fetch en `CurrencyConverter`) vs `app/api/currency/route.ts:3-4` | Implementar la conversión real (p. ej. API de tasas con caché diaria) y quitar la verificación de cron de esa ruta. |
| BUG-02 | P1 | **Las rachas de hábitos siempre muestran 0.** `current_streak` y `best_streak` se leen pero ningún código los calcula. | `grep current_streak` solo aparece en lectura (`app/dashboard/habits/page.tsx`) | Calcular la racha a partir de `habit_logs` al marcar/desmarcar (o con una vista SQL). |
| BUG-03 | P2 | Las tareas diarias completadas solo vuelven a "pendiente" cuando el usuario **abre la página de Tareas**; el dashboard o las notificaciones pueden verlas como completadas al día siguiente. | `app/dashboard/tasks/page.tsx:132` (reseteo en el cliente al cargar) | Resetear en el servidor (pg_cron diario o calcular el estado por fecha). |
| BUG-05 | P2 | En el calendario, el estado de una **tarea diaria** solo se conoce para hoy (no hay historial por día): los días pasados se ven sin tachar aunque se hayan hecho. | `components/agenda/AgendaCalendar.tsx` (`taskDone`) y reseteo en `app/dashboard/tasks/page.tsx` | Tabla `task_logs` (como `habit_logs`) para guardar cada día completado. |
| BUG-04 | P3 | Página de Configuración de IA sin tildes ("Configuracion"). | `app/dashboard/settings/ai/page.tsx:25` | Revisar textos de toda la app. |

## 2. Seguridad y privacidad

| ID | P | Pendiente | Evidencia | Acción |
|---|---|---|---|---|
| SEC-01 | P0 | **Rotar la contraseña de la base de datos de Supabase.** Se compartió en texto plano en una conversación el 2026-10-08. | Historial de la sesión de soporte | Project Settings → Database → Reset password. Actualizar cualquier lugar donde se use. |
| SEC-02 | P1 | La **API key de Gemini de cada usuario se guarda en texto plano** en `users.gemini_api_key`. RLS impide que otros la lean, pero cualquier fuga de la BD la expone. | `app/api/ai/route.ts:10` | Cifrarla (Supabase Vault / pgsodium) o pasar a una key del servidor con límites por usuario. |
| SEC-03 | P1 | **Sin límite de uso en `/api/ai`.** Un usuario (o un script con su sesión) puede llamar sin parar. | `app/api/ai/route.ts` (sin rate limit) | Límite por usuario/día (tabla de uso o Upstash Ratelimit). |
| SEC-04 | P1 | **16 vulnerabilidades en dependencias** (1 crítica en `next` — DoS del Image Optimizer, aplica solo con `remotePatterns`, que no usamos; 8 altas, varias de build). | `npm audit --omit=dev` (2026-11-06) | `npm audit fix` para las compatibles; planear subida de Next 14 → 15/16 (ver DEUDA-02). |
| SEC-05 | P2 | `Life OS.xlsx` (datos personales y financieros reales) está en la carpeta del repo **sin** estar en `.gitignore`. | `git status` → `?? "Life OS.xlsx"` | Moverlo fuera del repo o añadir `*.xlsx` a `.gitignore`. |
| SEC-06 | P2 | Sin **política de privacidad ni términos**, y sin opción para **exportar o borrar la cuenta**. Obligatorio para datos financieros y para publicar en tiendas. | `grep -i privacidad\|eliminar cuenta app/` → sin resultados | Redactar documentos legales; añadir "Exportar mis datos" y "Eliminar mi cuenta" en Ajustes. |
| ✔ | — | RLS activo: con la llave pública ninguna tabla con datos de usuario devuelve filas. | Prueba con anon key, 22 tablas (2026-11-06) | Mantener: toda tabla nueva necesita RLS + política. |

## 3. Marca y legal

| ID | P | Pendiente | Acción |
|---|---|---|---|
| MARCA-01 | P0 | **Decidir el nombre definitivo.** "Shark Life" ya aparece en juegos de tiburones (itch.io, App Store). Opciones con S para conservar el logo: **Squalo** (recomendado), Sharkline, Sharkmind, Selah. | Elegir; luego cambiar nombre en app, manifest, logos (`branding/`) y docs. |
| MARCA-02 | P1 | **Registrar la marca.** Búsqueda en USPTO (EE. UU., clases 9 software y 42 SaaS; 36 si hay servicios financieros) y en la **SIC** (Colombia). Considerar WIPO/Madrid si se expande. | Búsqueda profesional antes de invertir en marketing. |
| MARCA-03 | P1 | Comprar **dominio** (.com / .app) y handles de redes con el nombre elegido. | — |
| MARCA-04 | P2 | Constituir/usar una **entidad legal** dueña de la app (p. ej. una LLC) para contratos, cobros y la marca. | Asesoría legal/contable. |
| MARCA-05 | P2 | La tipografía Geist (OFL) permite uso en logos; documentado en `branding/README.md`. Verificar licencias si se cambia de fuente. | — |

## 4. Infraestructura y escala

Estado actual: **Next.js en Vercel + Supabase** (Postgres, Auth, pg_cron) + Gemini (key del usuario) + Web Push (VAPID).

| ID | P | Pendiente | Por qué | Acción |
|---|---|---|---|---|
| INFRA-01 | P1 | **Verificar planes de Vercel y Supabase.** Vercel Hobby no permite uso comercial; Supabase Free pausa el proyecto tras 1 semana sin actividad, sin backups diarios ni PITR. | Plan actual no verificado desde el código | Pasar a Vercel Pro y Supabase Pro antes de cobrar o de tener usuarios reales. |
| INFRA-02 | P1 | **Backups** de la base de datos y prueba de restauración. | Datos financieros irrecuperables si se pierden | Supabase Pro (backups diarios) + PITR; dump semanal adicional fuera de Supabase. |
| INFRA-03 | P1 | **Monitoreo de errores** (no hay ninguno). | Hoy un error en producción pasa desapercibido | Sentry (Next.js SDK) + alertas. |
| INFRA-04 | P2 | **El esquema de la BD no está completo en el repo.** `schema.sql` es un stub; solo existen migraciones parciales en `sql/`. | No se puede recrear el entorno desde cero | Exportar el esquema actual (`supabase db dump`) y pasar a migraciones con Supabase CLI. |
| INFRA-05 | P2 | **Entornos separados** (desarrollo / staging / producción). Hoy todo apunta a un solo proyecto Supabase. | Probar contra datos reales es riesgoso | Proyecto Supabase de staging + Preview Deployments de Vercel. |
| INFRA-06 | P2 | El cron de recordatorios corre **cada minuto** (pg_cron → `/api/push/cron`): ~43 200 invocaciones/mes. | Costo y límites al crecer | Agrupar o pasar a cola (Supabase Queues / QStash) cuando haya muchos usuarios. |
| INFRA-07 | P2 | **Costo de IA a escala.** Hoy cada usuario trae su API key de Gemini (fricción alta). | Para un producto masivo la IA debe venir incluida | Key del servidor + cuota por plan + caché de respuestas. Modelo actual: `gemini-2.0-flash` (revisar vigencia). |
| INFRA-08 | P3 | **Distribución en tiendas.** Android vía TWA (Bubblewrap/PWABuilder); iOS tiene límites para PWA (push solo iOS 16.4+ instalada). | Alcance | Evaluar tras validar el producto. |
| INFRA-09 | P3 | **Pagos/suscripción** si se vuelve SaaS. | Modelo de negocio | Stripe (USD) + alternativa local (Wompi/MercadoPago) para Colombia. |

## 5. Deuda técnica

| ID | P | Pendiente | Evidencia | Acción |
|---|---|---|---|---|
| DEUDA-01 | P1 | **El build ignora errores de TypeScript y ESLint** (`ignoreBuildErrors`, `ignoreDuringBuilds`). Hoy hay 17 errores y 9 avisos de lint. | `next.config.js`, `npx next lint` | Corregir los 17 errores y quitar esos flags. |
| DEUDA-02 | P2 | Next.js 14.2 → planear subida a 15/16 (parches de seguridad, ver SEC-04). | `package.json` | Rama dedicada + pruebas manuales de todas las pantallas. |
| DEUDA-03 | P2 | **Dos archivos de configuración** `next.config.js` y `next.config.mjs` (el `.mjs` está vacío y confunde). | `ls next.config.*` | Borrar `next.config.mjs`. |
| DEUDA-04 | P2 | **Archivos generados por el build versionados** (`public/sw.js`, `public/workbox-*.js`, `public/worker-*.js`). | `git ls-files public` | Añadirlos a `.gitignore` y quitarlos del índice. |
| DEUDA-05 | P2 | **Sin pruebas automáticas ni CI.** | No hay `*.test.*` ni `.github/workflows` | Vitest para lógica (`lib/`), Playwright para flujos clave (login, registrar gasto, cerrar mes); GitHub Actions con lint + typecheck + build. |
| DEUDA-06 | P2 | **Montos sin moneda.** El conversor marca moneda en `notes` como `[COP]`, pero `amount` no guarda la moneda; mezcla USD/COP en los totales. | `app/dashboard/finances/page.tsx:211` | Columna `currency` en `incomes`/`expenses` + conversión a moneda base al sumar. |
| DEUDA-07 | P3 | `habits.target_per_week` también se usa como meta **mensual** para hábitos mensuales (nombre engañoso). | `app/dashboard/habits/page.tsx` | Renombrar a `target_per_period` en una migración. |
| DEUDA-08 | P3 | Código muerto de presupuestos (formulario quitado, funciones sin uso) y carpeta vacía `app/api/webhook/cron/`. | Lint `no-unused-vars` en `finances/page.tsx` | Decidir si vuelve el editor de presupuestos o borrar. |
| DEUDA-09 | P3 | Los documentos de diseño en `../0X-*.md` describen otra arquitectura (Prisma/Drizzle, Redis/BullMQ) que **no** se usa. | `../08-roadmap.md.md` | Actualizarlos o marcarlos como históricos; la verdad está en `docs/ARQUITECTURA.md`. |

## 6. Mejoras futuras del producto

| ID | P | Mejora | Valor |
|---|---|---|---|
| PROD-01 | P2 | **Historial de patrimonio neto + gráfica** en Riqueza (foto automática al cerrar mes y botón manual). El Excel de Santiago tiene 9 fotos (mar-2024 → may-2026) listas para cargar. | En espera de la opinión de Santiago. |
| PROD-02 | P2 | **Importador de Excel/CSV** dentro de la app (hoy la importación de Santiago se hizo con un script). | Onboarding de usuarios con historial. |
| PROD-03 | P2 | **Conectar pagos de deuda con Riqueza** (un egreso "Deuda" reduce el saldo del pasivo), igual que el cierre de mes con activos. | Coherencia Finanzas ↔ Riqueza. |
| PROD-04 | P2 | Apartado para **misión, visión y valores** (hoja "Direccionamiento" del Excel no tiene lugar en la app). | Completar IKIGAI/propósito. |
| PROD-05 | P3 | Hojas del Excel sin módulo: Biblioteca, Frases, Contactos/Mentores, Lista de logros, Proyección anual, Net Worth histórico, simuladores. | Evaluar cuáles valen como módulo. |
| PROD-06 | P3 | Botones "+ Activo / + Pasivo" visibles en el **Resumen** de Riqueza (hoy solo dentro de sus pestañas). | Descubribilidad. |
| PROD-07 | P3 | Tema claro (la paleta ya tiene versión para fondo claro). | Accesibilidad / preferencia. |
| PROD-08 | P3 | Modo offline real (lectura de datos en caché, cola de escritura). | PWA más robusta. |

## 7. Pendientes de datos (cuenta de Santiago)

| ID | Pendiente |
|---|---|
| DATA-01 | "Fondo de emergencia" quedó en $0 (fórmula `#REF!` en el Excel). Santiago debe poner el valor real en Riqueza. |
| DATA-02 | Sus 6 hábitos originales siguen inactivos; activarlos si los usa (o convertirlos en tareas diarias desde Hábitos). |
| DATA-04 | **Aplicar `sql/2026-11-10_habits_repeat_days.sql` en Supabase** antes de usar los días de repetición de hábitos. *Por verificar* que se aplicó. |
| DATA-03 | IDs de lo importado: guardados fuera del repo (scratchpad de la sesión del 2026-10-07); los primeros 400 ingresos no tienen ID registrado. |

---

## Resueltos

| Fecha | ID | Qué | Commit |
|---|---|---|---|
| 2026-11-10 | — | Las tareas diarias no aparecían en la cuadrícula del calendario (ni fines de semana ni ningún día; solo en el panel lateral). Ahora salen cada día de repetición. | `8aba12e` |
| 2026-11-10 | — | Hábitos: días de repetición, calendario compartido con Tareas, detalle con descripción, editar/eliminar/activar desde la vista Semana, buscador con fecha de creación y conversión a tareas diarias. Tareas: detalle con descripción y filtro por fecha de creación. | `8aba12e` |
| 2026-11-06 | — | Fechas en UTC: hábitos y finanzas registraban el día siguiente después de las 6–7 pm (América). Nuevo `lib/dates.ts`. | `0d917be` |
| 2026-11-06 | — | La PWA no tenía íconos (`public/icons/` vacío); ahora 192/512/maskable/apple-touch/favicon. | `0d917be` |
| 2026-10-08 | — | Estrategias DOFA (FO/DO/FA/DA) no se podían guardar (enum). | `29b91b0` |
| 2026-10-08 | — | Hábitos mensuales mostrados como "Semanal"; falta categoría "Viajes". | `f0bbd14` |
