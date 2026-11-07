# Revisión (checklist del revisor)

Usar en cada cambio (PR o commit a `main`). Un cambio está **listo** solo si todo lo aplicable está marcado.
Quien revisa actúa como juez: no se aceptan afirmaciones sin evidencia (comando ejecutado, captura, línea de código).

## 1. Funciona

- [ ] Se probó el flujo en la app real (no solo que compile): escritorio y celular (~390 px).
- [ ] Casos borde: lista vacía, montos negativos, fechas en fin de mes / de noche (hora local), usuario nuevo sin datos.
- [ ] Sin errores en la consola del navegador.

## 2. Datos y seguridad

- [ ] Toda tabla nueva tiene **RLS** y política `auth.uid() = user_id`; verificado que la anon key no ve filas.
- [ ] La *service role key* solo se usa en rutas de servidor y nunca llega al cliente.
- [ ] Rutas `/api/*` verifican sesión (`getUser`) o secreto (`CRON_SECRET`).
- [ ] Migración guardada en `sql/AAAA-MM-DD_*.sql`, idempotente, aplicada en Supabase.
- [ ] Operaciones que mueven dinero/valores no se pueden duplicar (restricción única o equivalente).
- [ ] No se suben secretos ni datos personales.

## 3. Código

- [ ] `npx tsc --noEmit` y `npx next build` pasan.
- [ ] Sin errores de lint nuevos.
- [ ] Fechas con `lib/dates.ts` (nunca `toISOString()` para "hoy").
- [ ] Sigue el estilo del archivo vecino (nombres, densidad de comentarios, Tailwind con paleta `ocean`/`brand`).
- [ ] Textos en español con tildes.

## 4. Diseño

- [ ] Usa la paleta y componentes de marca (`branding/README.md`, `components/brand/`).
- [ ] Contraste de texto ≥ 4.5:1 (texto secundario mínimo `ocean-400`/`ocean-500` sobre `ocean-900`).
- [ ] Estados vacíos, de carga y de error definidos.

## 5. Documentación

- [ ] `docs/MANUAL_USUARIO.md` refleja el comportamiento nuevo.
- [ ] `docs/PENDIENTES.md`: ítems resueltos movidos a *Resueltos*; ítems nuevos con evidencia.
- [ ] `docs/ARQUITECTURA.md` si cambian tablas, rutas, variables de entorno o flujos.
- [ ] Decisiones de diseño relevantes en `docs/DECISIONES.md`.

---

## Última auditoría — 2026-11-06

| Revisión | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ sin errores |
| Build de producción | ✅ compila |
| Lint | ⚠️ 17 errores, 9 avisos heredados (DEUDA-01) |
| `npm audit --omit=dev` | ⚠️ 16 vulnerabilidades: 1 crítica, 8 altas (SEC-04) |
| RLS con anon key (22 tablas) | ✅ ninguna tabla de usuario expone filas |
| Rutas API | ⚠️ `/api/ai` sin límite de uso (SEC-03); `/api/currency` rota (BUG-01) |
| Pruebas automáticas / CI | ❌ no existen (DEUDA-05) |
| Capturas revisadas | ✅ login/registro (escritorio y 390 px), dashboard, finanzas, riqueza, hábitos |
