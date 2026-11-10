"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDate } from "@/lib/dates";
import { AREA_NAMES, WEEKDAYS, dayMatches, describeRepeat, formatDate, formatDateTime, monthGrid, normalizeDays } from "@/lib/agenda";
import DetailModal, { type DetailInfo } from "./DetailModal";

interface AgendaTask {
  id: string; title: string; description: string | null; priority: string; status: string;
  task_type: "daily" | "general"; repeat_days: number[] | null; due_date: string | null; due_time: string | null;
  life_area_id: number; created_at: string | null; completed_at: string | null;
}
interface AgendaHabit {
  id: string; title: string; description: string | null; color: string; frequency: string; target_per_week: number;
  repeat_days?: number[] | null; life_area_id: number; created_at: string | null; is_active: boolean;
}

type Selected = { kind: "task"; item: AgendaTask } | { kind: "habit"; item: AgendaHabit };

const PRIORITY_DOT: Record<string, string> = { high: "bg-red-500", medium: "bg-yellow-500", low: "bg-green-500" };
const PRIORITY_LABEL: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };
const STATUS_LABEL: Record<string, string> = { pending: "Pendiente", in_progress: "En progreso", completed: "Completada", cancelled: "Cancelada" };
const FREQ_LABEL: Record<string, string> = { daily: "Diario", weekly: "Semanal", monthly: "Mensual" };

const byTime = (a: AgendaTask, b: AgendaTask) => (a.due_time || "99").localeCompare(b.due_time || "99");
const createdDay = (iso: string | null) => (iso ? toLocalDate(new Date(iso)) : "");

/**
 * Calendario mensual compartido por Tareas y Hábitos: muestra en cada día las tareas generales con fecha,
 * las tareas diarias según sus días de repetición y los hábitos activos según los suyos.
 * Carga sus propios datos, así ambas pantallas ven siempre lo mismo.
 */
export default function AgendaCalendar({
  focus, onEditTask, onEditHabit, onNewTask, onChange,
}: {
  focus: "tasks" | "habits";
  onEditTask?: (id: string) => void;
  onEditHabit?: (id: string) => void;
  onNewTask?: (day: string) => void;
  onChange?: () => void;
}) {
  const supabase = createClient();
  const todayStr = toLocalDate();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [tasks, setTasks] = useState<AgendaTask[]>([]);
  const [habits, setHabits] = useState<AgendaHabit[]>([]);
  const [logs, setLogs] = useState<Set<string>>(new Set()); // `${habit_id}|${fecha}`
  const [selected, setSelected] = useState<Selected | null>(null);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => monthGrid(month), [month]);
  const from = toLocalDate(days[0]);
  const to = toLocalDate(days[days.length - 1]);

  useEffect(() => { load(); }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: t }, { data: h }, { data: l }] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).neq("status", "cancelled"),
      supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: true }),
      supabase.from("habit_logs").select("habit_id, logged_date, completed").eq("user_id", user.id).gte("logged_date", from).lte("logged_date", to),
    ]);
    setTasks((t ?? []).map(x => ({ ...x, task_type: x.task_type ?? "general", due_time: x.due_time?.slice(0, 5) ?? null })));
    setHabits(h ?? []);
    setLogs(new Set((l ?? []).filter(x => x.completed).map(x => `${x.habit_id}|${x.logged_date}`)));
  }

  // Lo que aparece cada día. Diarias y hábitos solo desde el día en que se crearon.
  const generalOn = (day: string) => tasks.filter(t => t.task_type === "general" && t.due_date === day).sort(byTime);
  const dailyOn = (day: string) => tasks.filter(t => t.task_type === "daily" && day >= createdDay(t.created_at) && dayMatches(t.repeat_days, day)).sort(byTime);
  const habitsOn = (day: string) => habits.filter(h => day >= createdDay(h.created_at) && dayMatches(h.repeat_days, day));

  const habitDone = (id: string, day: string) => logs.has(`${id}|${day}`);
  // El estado de una diaria solo se conoce para hoy (se reinicia cada día)
  const taskDone = (t: AgendaTask, day: string) => t.task_type === "daily" ? day === todayStr && t.status === "completed" : t.status === "completed";

  async function toggleHabit(habit: AgendaHabit, day: string) {
    if (day > todayStr || busy) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const key = `${habit.id}|${day}`;
    const done = logs.has(key);
    const { error } = done
      ? await supabase.from("habit_logs").delete().eq("habit_id", habit.id).eq("logged_date", day).eq("user_id", user.id)
      : await supabase.from("habit_logs").upsert({ habit_id: habit.id, user_id: user.id, logged_date: day, completed: true });
    if (error) alert(`No se pudo guardar: ${error.message}`);
    else {
      setLogs(prev => { const next = new Set(prev); if (done) next.delete(key); else next.add(key); return next; });
      onChange?.();
    }
    setBusy(false);
  }

  function detailOf(sel: Selected): DetailInfo {
    if (sel.kind === "habit") {
      const h = sel.item;
      return {
        title: h.title, kind: "Hábito", color: h.color, description: h.description, done: habitDone(h.id, selectedDay),
        meta: [
          ["Área", AREA_NAMES[h.life_area_id] ?? "—"],
          ["Frecuencia", `${FREQ_LABEL[h.frequency] ?? h.frequency} · meta ${h.target_per_week}x/${h.frequency === "monthly" ? "mes" : "sem"}`],
          ["Días", describeRepeat(normalizeDays(h.repeat_days))],
          ["Creado", h.created_at ? formatDate(h.created_at) : "—"],
        ],
      };
    }
    const t = sel.item;
    return {
      title: t.title, kind: t.task_type === "daily" ? "Tarea diaria" : "Tarea general", description: t.description, done: taskDone(t, selectedDay),
      meta: [
        ["Estado", STATUS_LABEL[t.status] ?? t.status],
        ["Prioridad", PRIORITY_LABEL[t.priority] ?? t.priority],
        ["Área", AREA_NAMES[t.life_area_id] ?? "—"],
        t.task_type === "daily"
          ? ["Se repite", `${describeRepeat(normalizeDays(t.repeat_days))}${t.due_time ? ` · ${t.due_time}` : ""}`]
          : ["Fecha", t.due_date ? `${t.due_date}${t.due_time ? ` ${t.due_time}` : ""}` : "Sin fecha"],
        ["Creada", t.created_at ? formatDateTime(t.created_at) : "—"],
      ],
    };
  }

  const btn = "text-sm px-4 py-2 rounded-lg border border-ocean-700 text-ocean-300 hover:text-white";
  const primary = "text-sm px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium";

  function detailActions(sel: Selected) {
    if (sel.kind === "habit") {
      const h = sel.item;
      const done = habitDone(h.id, selectedDay);
      return (
        <>
          {onEditHabit
            ? <button onClick={() => { setSelected(null); onEditHabit(h.id); }} className={btn}>Editar</button>
            : <Link href="/dashboard/habits" className={btn}>Ir a Hábitos</Link>}
          {selectedDay <= todayStr && (
            <button disabled={busy} onClick={() => toggleHabit(h, selectedDay)} className={primary}>
              {done ? "Desmarcar" : `Marcar hecho${selectedDay === todayStr ? " hoy" : ""}`}
            </button>
          )}
        </>
      );
    }
    const t = sel.item;
    return onEditTask
      ? <button onClick={() => { setSelected(null); onEditTask(t.id); }} className={primary}>Editar</button>
      : <Link href="/dashboard/tasks" className={btn}>Ir a Tareas</Link>;
  }

  const sections = [
    { key: "habits", title: "Hábitos", empty: "Ningún hábito este día", items: habitsOn(selectedDay).map(h => ({ sel: { kind: "habit", item: h } as Selected, done: habitDone(h.id, selectedDay), dot: <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />, time: "" })) },
    { key: "general", title: "Tareas generales", empty: "Sin tareas este día", items: generalOn(selectedDay).map(t => ({ sel: { kind: "task", item: t } as Selected, done: taskDone(t, selectedDay), dot: <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] ?? "bg-ocean-500"}`} />, time: t.due_time ?? "" })) },
    { key: "daily", title: "Tareas diarias", empty: "Ninguna se repite este día", items: dailyOn(selectedDay).map(t => ({ sel: { kind: "task", item: t } as Selected, done: taskDone(t, selectedDay), dot: <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] ?? "bg-ocean-500"}`} />, time: t.due_time ?? "" })) },
  ];
  if (focus === "tasks") sections.push(sections.shift()!); // en Tareas, los hábitos al final

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {selected && <DetailModal info={detailOf(selected)} onClose={() => setSelected(null)} actions={detailActions(selected)} />}

      <div className="bg-ocean-900 border border-ocean-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="text-ocean-400 hover:text-white px-3 py-1 rounded-lg border border-ocean-700">‹</button>
          <div className="text-white font-semibold capitalize">{month.toLocaleDateString("es", { month: "long", year: "numeric" })}</div>
          <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="text-ocean-400 hover:text-white px-3 py-1 rounded-lg border border-ocean-700">›</button>
        </div>
        <div className="flex items-center justify-center gap-3 text-[10px] text-ocean-500 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-ocean-700" />Tarea general</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500/60" />Tarea diaria</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-400" />Hábito (color propio)</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-ocean-500 mb-1">
          {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const key = toLocalDate(day);
            const general = generalOn(key);
            const daily = dailyOn(key);
            const dayHabits = habitsOn(key);
            const chips = [
              ...general.map(t => ({ id: t.id, label: `${t.due_time ? `${t.due_time} ` : ""}${t.title}`, cls: "bg-ocean-800 text-ocean-200", done: taskDone(t, key), style: undefined as CSSProperties | undefined })),
              ...daily.map(t => ({ id: t.id, label: `${t.due_time ? `${t.due_time} ` : ""}${t.title}`, cls: "bg-sky-500/15 text-sky-200", done: taskDone(t, key), style: undefined })),
              ...dayHabits.map(h => ({ id: h.id, label: h.title, cls: "text-ocean-100", done: habitDone(h.id, key), style: { backgroundColor: `${h.color}30`, borderLeft: `2px solid ${h.color}` } })),
            ];
            if (focus === "habits") chips.sort((a, b) => Number(!!b.style) - Number(!!a.style));
            const total = chips.length;
            const inMonth = day.getMonth() === month.getMonth();
            const hasOverdue = key < todayStr && general.some(t => t.status !== "completed");
            const habitsDone = dayHabits.filter(h => habitDone(h.id, key)).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`min-h-[64px] sm:min-h-[96px] rounded-lg border p-1 text-left align-top transition-colors ${key === selectedDay ? "border-brand-500 bg-brand-500/10" : "border-ocean-800 hover:border-ocean-600"} ${inMonth ? "" : "opacity-40"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${key === todayStr ? "bg-brand-600 text-white rounded-full w-5 h-5 flex items-center justify-center" : "text-ocean-400"}`}>{day.getDate()}</span>
                  {dayHabits.length > 0 && key <= todayStr && <span className="text-[9px] text-ocean-500 hidden sm:inline">{habitsDone}/{dayHabits.length}</span>}
                </div>
                <div className="space-y-0.5 hidden sm:block">
                  {chips.slice(0, 3).map(c => (
                    <div key={c.id} className={`text-[10px] truncate rounded px-1 ${c.cls} ${c.done ? "line-through opacity-60" : ""}`} style={c.style}>{c.label}</div>
                  ))}
                  {total > 3 && <div className="text-[10px] text-ocean-500">+{total - 3} más</div>}
                </div>
                {total > 0 && (
                  <div className="flex gap-0.5 flex-wrap sm:hidden">
                    {general.slice(0, 2).map(t => <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority] ?? "bg-ocean-500"}`} />)}
                    {daily.slice(0, 2).map(t => <span key={t.id} className="w-1.5 h-1.5 rounded-full bg-sky-400" />)}
                    {dayHabits.slice(0, 3).map(h => <span key={h.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.color }} />)}
                  </div>
                )}
                {hasOverdue && <div className="text-[10px] text-red-400 hidden sm:block">vencida</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Día seleccionado */}
      <div className="bg-ocean-900 border border-ocean-800 rounded-2xl p-4 space-y-4 h-fit">
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold capitalize">
            {new Date(`${selectedDay}T00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          {onNewTask && <button onClick={() => onNewTask(selectedDay)} className="text-xs text-brand-400 hover:text-brand-300">+ Tarea</button>}
        </div>
        {sections.map(s => (
          <div key={s.key} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-ocean-500">{s.title}</div>
            {s.items.length === 0 ? (
              <div className="text-sm text-ocean-600">{s.empty}</div>
            ) : s.items.map(({ sel, done, dot, time }) => (
              <div key={sel.item.id} className="flex items-center gap-2">
                {sel.kind === "habit" && selectedDay <= todayStr && (
                  <button
                    onClick={() => toggleHabit(sel.item, selectedDay)}
                    disabled={busy}
                    title={done ? "Desmarcar" : "Marcar hecho"}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? "border-transparent" : "border-ocean-600 hover:border-brand-500"}`}
                    style={done ? { backgroundColor: sel.item.color } : {}}
                  >
                    {done && <Check size={12} className="text-white" />}
                  </button>
                )}
                <button onClick={() => setSelected(sel)} className="flex-1 min-w-0 flex items-center gap-2 text-left text-sm bg-ocean-800/60 hover:bg-ocean-800 rounded-lg px-3 py-2">
                  {dot}
                  {sel.kind === "task" && <span className="text-xs text-ocean-500 w-10 shrink-0">{time || "—"}</span>}
                  <span className="flex-1 min-w-0">
                    <span className={`block truncate ${done ? "line-through text-ocean-500" : "text-ocean-200"}`}>{sel.item.title}</span>
                    {sel.item.description && <span className="block truncate text-[11px] text-ocean-500">{sel.item.description}</span>}
                  </span>
                </button>
              </div>
            ))}
          </div>
        ))}
        <p className="text-[11px] text-ocean-600">Toca un elemento para ver su descripción.</p>
      </div>
    </div>
  );
}
