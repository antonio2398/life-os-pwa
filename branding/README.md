# Shark Life — Identidad visual

## Idea

**Doble Aleta.** Dos aletas opuestas forman una **S**. El espacio entre ellas es la línea del agua: arriba, la aleta;
abajo, su reflejo. El tiburón nunca deja de moverse para vivir: **Shark Life es avanzar todos los días.**

Lema: *Nunca dejes de avanzar.*

Carácter: enfocado, disciplinado, sereno pero poderoso. Nunca agresivo (sin dientes ni mandíbulas).

## Archivos

| Archivo | Uso |
|---|---|
| `logo/shark-life-horizontal-on-dark.svg` | Logo principal sobre fondos oscuros |
| `logo/shark-life-horizontal-on-light.svg` | Logo principal sobre fondos claros |
| `logo/shark-life-stacked-*.svg` | Versión vertical (espacios cuadrados, portadas) |
| `logo/shark-life-symbol-*.svg` | Solo símbolo (avatar, ícono, marca de agua) |
| `logo/*-black.svg` / `*-white.svg` | Un solo color (impresión, sellos, bordado) |
| `logo/shark-life-symbol-small*.svg` | Dibujo simplificado para tamaños menores a 24 px |
| `export/` | Favicon, íconos PWA (192, 512, maskable), apple-touch-icon |

Los logotipos están construidos en trazos (no dependen de fuentes instaladas).

## Color

| Nombre | HEX | Tailwind | Uso |
|---|---|---|---|
| Aqua (aleta) | `#2CC7D5` | `brand-400` | Aleta superior, acentos, estados activos, enlaces |
| Profundo (reflejo) | `#0B7F8F` | `brand-600` | Aleta inferior, botones principales (texto blanco 4.7:1) |
| Abismo | `#081523` | `ocean-950` | Fondo de la app |
| Océano | `#0F2133` | `ocean-900` | Tarjetas y superficies; color del logotipo en fondo claro |
| Marea | `#1A3045` | `ocean-800` | Bordes, separadores, inputs |
| Espuma | `#8DA7BA` | `ocean-400` | Texto secundario (6.5:1 sobre ocean-900) |
| Oro | `#E8B84A` | `gold-400` | Solo logros y celebraciones — con moderación |

Colores de estado (verde éxito, rojo alerta, amarillo/naranja advertencia) se mantienen semánticos; no usar aqua para
"éxito" ni rojo como color de marca.

## Tipografía

**Geist** (licencia OFL, libre para logos), la misma del logotipo y de la app (`app/fonts/GeistVF.woff`).
Títulos en Bold 700 con tracking ligeramente cerrado; texto en Regular 400.

## Reglas de uso

- **Espacio libre:** alrededor del logo, como mínimo la altura de la separación entre aletas × 3 (≈ la mitad de una aleta).
- **Tamaño mínimo:** símbolo 16 px (usar la versión `small` por debajo de 24 px); logo horizontal 96 px de ancho.
- **Fondos:** oscuros → versión `on-dark` o `white`; claros → `on-light` o `black`. Nunca sobre fotos con mucho detalle.
- **No hacer:** rotar, estirar, cambiar el orden de los colores de las aletas, unir las aletas (la línea del agua es la
  idea), añadir sombras o degradados, poner el logotipo en otra fuente, ni añadir dientes/ojos al símbolo.

## Pendiente

- Búsqueda de marca registrada para "Shark Life" antes de uso comercial.
