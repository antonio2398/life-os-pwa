// Fechas en la zona horaria del dispositivo.
// No usar toISOString() para "hoy" o "este mes": convierte a UTC y, en América,
// después de las 6–7 pm devuelve el día siguiente.

/** "YYYY-MM-DD" en hora local */
export function toLocalDate(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM" en hora local */
export function toLocalMonth(d: Date = new Date()) {
  return toLocalDate(d).slice(0, 7);
}
