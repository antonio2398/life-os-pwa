# Manual de usuario

Shark Life es tu sistema operativo de vida: propósito, metas, ejecución diaria, finanzas y patrimonio en un solo lugar.

## Instalar la app

- **Android (Chrome):** abre la app → menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** botón Compartir → *Agregar a pantalla de inicio*. Para recibir notificaciones abre la app desde
  ese ícono (iOS 16.4 o superior).
- La app se actualiza sola. Si no ves un cambio, ciérrala por completo y ábrela de nuevo.

## Cuenta

Regístrate con correo y contraseña (mínimo 8 caracteres) y confirma el correo. Si olvidas la contraseña usa
*¿Olvidaste tu contraseña?* en el inicio de sesión.

## Orden recomendado para empezar

1. **Áreas de Vida** → evalúa las 7 áreas. Esto calcula tu *Life Score*.
2. **IKIGAI** → qué amas, en qué eres bueno, qué necesita el mundo, por qué te pagan.
3. **DOFA** → fortalezas, debilidades, oportunidades, amenazas y estrategias.
4. **Sueños & Metas** → sueños de largo plazo y metas con fecha.
5. **Proyectos & Tareas** y **Hábitos** → la ejecución diaria.
6. **Finanzas** y **Riqueza** → tu dinero mes a mes y tu patrimonio.

## Módulos

### Dashboard

Resumen: Life Score (promedio ponderado de tus áreas) y scorecard semanal.

### Áreas de Vida

Evalúa cada área (salud, finanzas, carrera, relaciones, espiritualidad, aprendizaje, impacto) respondiendo 4 preguntas;
puedes fijar una meta a 90 días. Las evaluaciones anteriores quedan en el historial.

### IKIGAI

Completa las cuatro listas. Con IA (si la configuraste) puedes generar tu declaración de propósito.

### DOFA

Agrega elementos a cada cuadrante y estrategias (FO crecer, DO mejorar, FA defender, DA evitar riesgo). La IA puede
proponer un DOFA a partir de tu diagnóstico.

### Sueños & Metas

Un **sueño** es el destino (con prioridad y estado). Una **meta** tiene fecha y % de avance; al llegar a 100% se marca
completada.

### Proyectos & Tareas

- **Tareas generales:** tienen fecha de vencimiento y hora opcional.
- **Tareas diarias:** se repiten los días que elijas; al completarlas vuelven a pendiente al día siguiente.
- **Recordatorio:** si la tarea tiene hora y aceptaste notificaciones, recibes un aviso 10 minutos antes.
- Búsqueda por título, descripción o proyecto y **por fecha de creación** (campos *Creada: desde – a*).
- Vista de canceladas (con restaurar).
- Toca el título de una tarea para ver su **descripción completa** y sus datos (incluida la fecha de creación).
- **Calendario** mensual compartido con Hábitos: muestra las tareas generales en su fecha, las **tareas diarias en
  cada día que se repiten** (incluidos sábados y domingos si los elegiste) y los hábitos activos. Toca un día y luego
  un elemento para ver su descripción.

### Hábitos

- Frecuencia **diaria, semanal o mensual** con una meta de veces por periodo.
- **Días del hábito:** elige qué días de la semana se muestra (L–D, "L-V" o "Fin de semana"), igual que las tareas
  diarias. Solo esos días aparecen en el calendario, en *Check de hoy* y se pueden marcar en la tabla (los demás
  muestran "—"). En hábitos diarios la meta semanal se ajusta sola al número de días.
- Marca cada día en la tabla semanal, en *Check de hoy* o en el **Calendario**. Los mensuales se miden contra el mes.
- Vistas: **Semana**, **Calendario** (compartido con Tareas: también ves tus tareas del día) y **Lista**.
- Cada hábito tiene botones para **activar/desactivar**, **convertir en tarea diaria**, **editar** y **eliminar**
  (en Semana y en Lista). Toca su nombre para ver la **descripción**.
- Buscador por nombre o descripción, filtro **Activos / Inactivos / Todos** y filtro por **fecha de creación**.
- **¿Creaste tareas como hábitos?** Usa *Convertir en tarea diaria* (uno) o *Convertir todos en tareas diarias*
  (aviso azul arriba). Se crean en Tareas → Diarias con los mismos días, área y descripción, y se quitan de Hábitos
  (se pierde su historial de marcas). Los hábitos inactivos pasan como tareas *canceladas* (puedes recuperarlas).

### Finanzas

- Registra **ingresos** y **egresos** por categoría; elige el mes arriba a la derecha.
- *Resumen*: gastos por categoría y presupuesto. *Historial*: fotos guardadas con *Guardar snapshot*.
- **Cierre de mes:** al terminar el mes, pulsa *Cerrar mes* y asigna el sobrante (o el faltante) a tus cuentas de
  Riqueza. Cada mes se cierra una sola vez; *Reabrir* revierte el movimiento. Solo se pueden cerrar el mes actual y el
  anterior. Si registras algo después de cerrar, la tarjeta te avisa para reabrir y volver a cerrar.
- ⚠️ El conversor de divisas no funciona por ahora (PENDIENTES → BUG-01).

### Riqueza

- **Activos** (cuentas, inversiones, bienes raíces, negocios, cripto) y **pasivos** (tarjetas, préstamos).
- Patrimonio neto = activos − pasivos. Los botones *+ Nuevo Activo* / *+ Nuevo Pasivo* están dentro de sus pestañas.
- *Plan deuda*: orden sugerido de pago según prioridad.

### Configurar IA

Pega tu API key de Google Gemini (gratis en aistudio.google.com). Se usa para DOFA, IKIGAI y coaching.

## Privacidad

Tus datos solo son visibles para tu cuenta (seguridad a nivel de fila en la base de datos). Por ahora no hay opción
para exportar o borrar la cuenta desde la app (PENDIENTES → SEC-06).
