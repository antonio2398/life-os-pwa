// Utilidades compartidas por Tareas y Hábitos (días de repetición, calendario y filtros).
import { ALL_DAYS } from "@/lib/tasks/reminders";
import { toLocalDate } from "@/lib/dates";

export { ALL_DAYS };

export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
/** Orden lunes→domingo con el índice de Date.getDay() (0 = domingo). */
export const REPEAT_DAY_OPTIONS = [[1, "L"], [2, "M"], [3, "X"], [4, "J"], [5, "V"], [6, "S"], [0, "D"]] as const;
export const REPEAT_PRESETS = [["Todos", ALL_DAYS], ["L-V", [1, 2, 3, 4, 5]], ["Fin de semana", [0, 6]]] as const;

export const AREA_NAMES: Record<number, string> = {
  1: "Salud", 2: "Finanzas", 3: "Carrera", 4: "Relaciones", 5: "Espiritualidad", 6: "Aprendizaje", 7: "Impacto",
};

export function normalizeDays(days: number[] | null | undefined) {
  return days?.length ? days : ALL_DAYS;
}

export function describeRepeat(days: number[]) {
  if (days.length === 7) return "Todos los días";
  if (days.length === 0) return "";
  const key = [...days].sort().join(",");
  if (key === "1,2,3,4,5") return "Lunes a viernes";
  if (key === "0,6") return "Fines de semana";
  return REPEAT_DAY_OPTIONS.filter(([d]) => days.includes(d)).map(([d]) => WEEKDAYS[(d + 6) % 7]).join(", ");
}

/** ¿El día "YYYY-MM-DD" cae en uno de los días de repetición? */
export function dayMatches(days: number[] | null | undefined, day: string) {
  return normalizeDays(days).includes(new Date(`${day}T00:00`).getDay());
}

/** 42 días (6 semanas, lunes primero) que cubren el mes de `month`. */
export function monthGrid(month: Date) {
  const offset = (month.getDay() + 6) % 7;
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** Filtro por fecha de creación (fechas locales "YYYY-MM-DD", ambos extremos opcionales e inclusivos). */
export function createdInRange(createdAt: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!createdAt) return false;
  const day = toLocalDate(new Date(createdAt));
  return (!from || day >= from) && (!to || day <= to);
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
