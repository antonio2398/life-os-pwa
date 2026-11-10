# Registro de decisiones

Decisiones de diseño y su porqué, para no reabrirlas sin razón. La más reciente arriba.

### 2026-11-10 — Un solo calendario para Tareas y Hábitos

Santiago pidió que los dos calendarios estuvieran conectados. En vez de dos calendarios sincronizados, hay **un
componente** (`AgendaCalendar`) que ambas pantallas muestran y que lee tareas y hábitos directamente de Supabase:
así nunca se desincronizan. Cambia solo el orden del panel del día (hábitos primero en Hábitos, tareas primero en
Tareas). Los hábitos usan los mismos `repeat_days` que las tareas diarias (columna nueva) para que "qué días se
muestra" funcione igual en los dos lados.

### 2026-11-10 — Convertir hábitos en tareas diarias desde la app (no por SQL)

Santiago registró tareas diarias como hábitos. En lugar de migrarlas con un script sobre su cuenta, se añadió la
acción *Convertir en tarea diaria* (individual y "todos"): él decide cuáles son tareas y no se tocan datos de otros
usuarios. Se pierde el historial de marcas del hábito porque las tareas diarias no guardan historial por día; los
inactivos pasan como tareas canceladas (recuperables) para no activarlos sin querer.

### 2026-11-06 — Fechas siempre en hora local

`toISOString()` convierte a UTC: en América, después de las 6–7 pm "hoy" pasaba a ser mañana (hábitos marcados en el
día equivocado, mes siguiente en Finanzas el último día). Todas las fechas de calendario usan `lib/dates.ts`.

### 2026-11-06 — Identidad visual "Doble Aleta"

Dos aletas forman una S; el espacio entre ellas es la línea del agua. Se descartaron un anillo con aleta (a 16 px se lee
como ♂) y un tiburón completo (literal, ilegible en pequeño). Se evitó lo agresivo (dientes) porque "tiburón" en
finanzas puede leerse como *loan shark*. Paleta aqua/azul profundo en vez del violeta genérico. Tipografía Geist (ya
incluida, OFL). Detalle en `branding/README.md`.

### 2026-10-08 — Cierre de mes (Finanzas → Riqueza)

El sobrante mensual no se refleja solo en Riqueza. Se eligió un **cierre explícito** en vez de sincronización automática
porque el usuario decide a qué cuenta va el dinero. Reglas: un cierre por mes (restricción única, evita duplicar),
reabrir revierte, y solo mes actual y anterior para no volver a sumar historial importado cuyo efecto ya está en el
valor de los activos.

### 2026-10-07 — Importación del Excel de Santiago

Importación **aditiva** (no se borró nada existente), omitiendo duplicados. Hojas sin módulo en la app no se
importaron (ver PENDIENTES → PROD-05). Ingresos negativos (ajustes) se registraron como egresos porque `incomes`
exige monto > 0.

### 2026-10-07 — Historial de patrimonio: en espera

Se propuso una tabla de fotos de patrimonio + gráfica; queda en espera de la opinión de Santiago (PENDIENTES → PROD-01).
