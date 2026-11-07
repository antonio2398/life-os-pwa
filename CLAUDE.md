# Shark Life (life-os-pwa)

Next.js 14 + Supabase PWA. Toda la documentación vive en `docs/` (índice en `docs/README.md`).

## Reglas del proyecto
- Responder y documentar en español.
- Fechas de calendario siempre con `lib/dates.ts` (`toLocalDate`, `toLocalMonth`); nunca `toISOString()` para "hoy".
- Colores solo de la paleta de marca (`ocean`, `brand`, `gold` en `tailwind.config.ts`); logo con `components/brand/SharkLogo.tsx`.
- Tabla nueva ⇒ RLS + política `auth.uid() = user_id`, migración idempotente en `sql/AAAA-MM-DD_*.sql`.
- No subir `.env*` ni datos personales (`*.xlsx`).

## Documentación obligatoria en cada cambio
- Actualizar en el **mismo cambio**: `docs/MANUAL_USUARIO.md` (comportamiento), `docs/ARQUITECTURA.md` (tablas, rutas,
  variables, flujos), `docs/DECISIONES.md` (decisiones de diseño), `docs/PENDIENTES.md` (nuevos pendientes con
  evidencia; resueltos a la sección *Resueltos* con fecha y commit).
- Antes de dar algo por terminado, pasar `docs/REVISION.md` y actualizar su sección *Última auditoría* cuando se audite.
- Solo hechos verificados: cada pendiente con evidencia (archivo:línea, comando o prueba); lo no verificado se marca
  *"por verificar"*.
