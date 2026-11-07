# Despliegue

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar valores (ver ARQUITECTURA.md → Variables de entorno)
npm run dev                  # http://localhost:3000  (el service worker está desactivado en desarrollo)
```

## Producción (Vercel)

1. Push a `main` → Vercel construye y publica automáticamente.
2. Variables de entorno configuradas en Vercel → Settings → Environment Variables (las mismas de `.env.local`).
3. Cambios de base de datos: ejecutar el archivo nuevo de `sql/` en Supabase → SQL Editor **antes** de publicar el
   código que lo necesita. Las migraciones deben ser idempotentes (`if not exists`, `drop policy if exists`).
4. Después del deploy, la PWA instalada se actualiza sola (`skipWaiting`); puede requerir cerrar y abrir la app 1–2 veces.

## Checklist antes de cada deploy

- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx next build` compila.
- [ ] `npx next lint` sin errores **nuevos** (hay 17 heredados: PENDIENTES → DEUDA-01).
- [ ] Migraciones SQL aplicadas en Supabase y probadas (RLS: la anon key no debe ver filas de usuarios).
- [ ] Probado en escritorio y en celular (390 px) las pantallas tocadas.
- [ ] No se suben secretos ni datos personales (`.env*`, `*.xlsx`, dumps).
- [ ] `docs/PENDIENTES.md` y `docs/MANUAL_USUARIO.md` actualizados si cambió el comportamiento.

## Checklist antes de abrir a usuarios reales / cobrar

- [ ] Nombre definitivo y búsqueda de marca (MARCA-01, MARCA-02) y dominio propio (MARCA-03).
- [ ] Planes pagos: Vercel Pro y Supabase Pro con backups (INFRA-01, INFRA-02).
- [ ] Monitoreo de errores (INFRA-03).
- [ ] Política de privacidad, términos, exportar/borrar cuenta (SEC-06).
- [ ] Rotar secretos expuestos (SEC-01) y limitar uso de IA (SEC-03).
- [ ] Corregir BUG-01 (conversor de divisas).
- [ ] Entorno de staging (INFRA-05) y esquema de BD versionado (INFRA-04).

## Recuperación

- **Revertir un deploy:** Vercel → Deployments → elegir el anterior → *Promote to Production*.
- **Revertir una migración:** escribir la migración inversa en `sql/` (no editar las ya aplicadas).
- **Datos:** hoy no hay backups propios verificados (INFRA-02).
