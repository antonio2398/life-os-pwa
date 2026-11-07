import { toLocalDate } from "@/lib/dates";
export const REMIND_BEFORE_MIN = 10;
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_MS = 86400000;
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

interface RemindableTask {
  task_type: string;
  status: string;
  due_date: string | null;
  due_time: string | null;
  repeat_days?: number[] | null;
}

/** Día de la semana (0 = domingo) de un instante en la zona horaria dada (o la local si no hay). */
export function weekdayIn(date: Date, timeZone?: string | null) {
  if (!timeZone) return date.getDay();
  return WEEKDAY_INDEX[new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date)];
}

export function repeatsOn(task: { repeat_days?: number[] | null }, date: Date, timeZone?: string | null) {
  const days = task.repeat_days?.length ? task.repeat_days : ALL_DAYS;
  return days.includes(weekdayIn(date, timeZone));
}

/**
 * Siguiente aviso de una tarea diaria a partir de uno anterior: avanza de 24 h en 24 h
 * hasta pasar `now` y caer en un día de repetición. Lo usa también el cron (servidor en UTC).
 */
export function nextDailyRemind(remindAt: number, now: number, repeatDays: number[] | null | undefined, timeZone?: string | null) {
  let t = remindAt;
  for (let i = 0; i < 400; i++) {
    // El día que cuenta es el de la tarea, no el del aviso (pueden diferir cerca de medianoche)
    if (t > now && repeatsOn({ repeat_days: repeatDays }, new Date(t + REMIND_BEFORE_MIN * 60000), timeZone)) return t;
    t += DAY_MS;
  }
  return null;
}

/** Calcula el próximo aviso (10 min antes) en hora local del dispositivo. null = sin aviso. */
export function computeRemindAt(task: RemindableTask, now = new Date()): string | null {
  if (!task.due_time || task.status === "cancelled") return null;
  const time = task.due_time.slice(0, 5);

  if (task.task_type === "daily") {
    const at = new Date(`${toLocalDate(now)}T${time}`);
    at.setMinutes(at.getMinutes() - REMIND_BEFORE_MIN);
    // Si ya se completó hoy, el siguiente aviso es desde mañana
    if (task.status === "completed") at.setDate(at.getDate() + 1);
    const next = nextDailyRemind(at.getTime(), now.getTime(), task.repeat_days);
    return next === null ? null : new Date(next).toISOString();
  }

  if (!task.due_date || task.status === "completed") return null;
  const at = new Date(`${task.due_date}T${time}`);
  at.setMinutes(at.getMinutes() - REMIND_BEFORE_MIN);
  return at > now ? at.toISOString() : null;
}

export { toLocalDate };
