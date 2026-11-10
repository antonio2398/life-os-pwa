"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowRightLeft, Check, Pencil, Search, X } from "lucide-react";
import { toLocalDate } from "@/lib/dates";
import { ALL_DAYS, createdInRange, dayMatches, describeRepeat, formatDate, normalizeDays } from "@/lib/agenda";
import AgendaCalendar from "@/components/agenda/AgendaCalendar";
import CreatedDateFilter from "@/components/agenda/CreatedDateFilter";
import DetailModal from "@/components/agenda/DetailModal";
import RepeatDaysPicker from "@/components/agenda/RepeatDaysPicker";

const LIFE_AREAS = [
  { id: 1, name: "Salud / Bienestar" },
  { id: 2, name: "Finanzas / Inversiones" },
  { id: 3, name: "Carrera / Negocios" },
  { id: 4, name: "Relaciones / Redes" },
  { id: 5, name: "Espiritualidad / Propósito" },
  { id: 6, name: "Aprendizaje / Crecimiento" },
  { id: 7, name: "Impacto / Legado" },
];

const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const COLORS = [
  { label: "Aqua",    value: "#2CC7D5" },
  { label: "Violeta", value: "#7c3aed" },
  { label: "Azul",    value: "#3b82f6" },
  { label: "Verde",   value: "#22c55e" },
  { label: "Rojo",    value: "#ef4444" },
  { label: "Naranja", value: "#f97316" },
  { label: "Cyan",    value: "#06b6d4" },
  { label: "Rosa",    value: "#ec4899" },
  { label: "Amarillo",value: "#eab308" },
];

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow === 0 ? 7 : dow) - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toLocalDate(d);
  });
}

const FREQUENCY_LABELS: Record<string, { label: string; period: string; max: number; defaultTarget: number }> = {
  daily:   { label: "Diario",  period: "sem", max: 7,  defaultTarget: 7 },
  weekly:  { label: "Semanal", period: "sem", max: 7,  defaultTarget: 1 },
  monthly: { label: "Mensual", period: "mes", max: 31, defaultTarget: 1 },
};

function freqInfo(frequency: string) {
  return FREQUENCY_LABELS[frequency] ?? FREQUENCY_LABELS.daily;
}

interface Habit {
  id: string;
  life_area_id: number;
  title: string;
  description: string;
  frequency: string;
  target_per_week: number;
  color: string;
  is_active: boolean;
  current_streak: number;
  best_streak: number;
  repeat_days: number[];
  created_at: string | null;
}

type HabitForm = Omit<Habit, "id" | "created_at">;

interface ConfirmDialog {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

const EMPTY_HABIT: HabitForm = {
  life_area_id: 1,
  title: "",
  description: "",
  frequency: "daily",
  target_per_week: 7,
  color: "#2CC7D5",
  is_active: true,
  current_streak: 0,
  best_streak: 0,
  repeat_days: ALL_DAYS,
};

const MIGRATION_HINT = "Falta aplicar la migración sql/2026-11-10_habits_repeat_days.sql en Supabase; los días de repetición no se guardaron.";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [habitForm, setHabitForm] = useState<HabitForm>(EMPTY_HABIT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"week" | "calendar" | "list">("week");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [search, setSearch] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [detail, setDetail] = useState<Habit | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [converting, setConverting] = useState(false);
  const weekDates = getWeekDates();
  const today = toLocalDate();
  const currentMonth = today.slice(0, 7);
  // Logs from the earliest of (week start, month start) so monthly habits can be measured
  const logsFrom = [weekDates[0], `${currentMonth}-01`].sort()[0];
  const supabase = createClient();

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("habit_logs").select("habit_id, logged_date, completed").eq("user_id", user.id).gte("logged_date", logsFrom).lte("logged_date", weekDates[6]),
    ]);
    setHabits((h ?? []).map(x => ({ ...x, description: x.description ?? "", repeat_days: normalizeDays(x.repeat_days) })));
    const logMap: Record<string, string[]> = {};
    (l ?? []).forEach((log: { habit_id: string; logged_date: string; completed: boolean }) => {
      if (log.completed) {
        if (!logMap[log.habit_id]) logMap[log.habit_id] = [];
        logMap[log.habit_id].push(log.logged_date);
      }
    });
    setLogs(logMap);
    setLoading(false);
  }

  async function toggleLog(habitId: string, date: string) {
    setToggling(`${habitId}-${date}`);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setToggling(null); return; }
    const completedDates = logs[habitId] || [];
    const alreadyDone = completedDates.includes(date);
    if (alreadyDone) {
      await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("logged_date", date).eq("user_id", user.id);
      setLogs(prev => ({ ...prev, [habitId]: prev[habitId].filter(d => d !== date) }));
    } else {
      await supabase.from("habit_logs").upsert({ habit_id: habitId, user_id: user.id, logged_date: date, completed: true });
      setLogs(prev => ({ ...prev, [habitId]: [...(prev[habitId] || []), date] }));
    }
    setToggling(null);
  }

  async function saveHabit() {
    if (!habitForm.title.trim()) return;
    if (habitForm.repeat_days.length === 0) { alert("Elige al menos un día para el hábito."); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const write = (payload: Partial<HabitForm>) => editingId
      ? supabase.from("habits").update(payload).eq("id", editingId)
      : supabase.from("habits").insert({ ...payload, user_id: user.id });
    let { error } = await write(habitForm);
    // Si la columna repeat_days aún no existe, guarda el resto y avisa
    if (error && error.message.includes("repeat_days")) {
      const { repeat_days: _omit, ...rest } = habitForm; // eslint-disable-line @typescript-eslint/no-unused-vars
      ({ error } = await write(rest));
      if (!error) alert(MIGRATION_HINT);
    }
    setSaving(false);
    if (error) { alert(`No se pudo guardar el hábito: ${error.message}`); return; }
    setShowForm(false);
    setEditingId(null);
    setHabitForm(EMPTY_HABIT);
    load();
  }

  function openEditHabit(habit: Habit) {
    setHabitForm({
      life_area_id: habit.life_area_id,
      title: habit.title,
      description: habit.description,
      frequency: habit.frequency,
      target_per_week: habit.target_per_week,
      color: habit.color,
      is_active: habit.is_active,
      current_streak: habit.current_streak,
      best_streak: habit.best_streak,
      repeat_days: habit.repeat_days,
    });
    setEditingId(habit.id);
    setShowForm(true);
    setActiveView(v => v === "calendar" ? "list" : v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setRepeatDays(days: number[]) {
    // En hábitos diarios la meta semanal sigue a los días elegidos
    setHabitForm(p => ({ ...p, repeat_days: days, target_per_week: p.frequency === "daily" ? Math.max(days.length, 1) : p.target_per_week }));
  }

  async function toggleActive(habit: Habit) {
    await supabase.from("habits").update({ is_active: !habit.is_active }).eq("id", habit.id);
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, is_active: !h.is_active } : h));
  }

  function deleteHabit(habit: Habit) {
    setConfirmDialog({
      title: "¿Eliminar este hábito?",
      message: `"${habit.title}" y todo su historial de registros se borrarán. No se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
      onConfirm: async () => {
        await supabase.from("habit_logs").delete().eq("habit_id", habit.id);
        await supabase.from("habits").delete().eq("id", habit.id);
        load();
      },
    });
  }

  /** Pasa hábitos a Tareas como tareas diarias (mismos días, área y descripción) y borra los hábitos. */
  function convertToDailyTasks(list: Habit[]) {
    if (list.length === 0) return;
    const one = list.length === 1;
    setConfirmDialog({
      title: one ? "¿Convertir en tarea diaria?" : `¿Convertir ${list.length} hábitos en tareas diarias?`,
      message: `${one ? `"${list[0].title}"` : "Los hábitos"} se crearán en Tareas como tarea${one ? "" : "s"} diaria${one ? "" : "s"} con los mismos días, área y descripción, y se quitará${one ? "" : "n"} de Hábitos (se pierde su historial de registros).`,
      confirmLabel: "Sí, convertir",
      onConfirm: async () => {
        setConverting(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setConverting(false); return; }
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const { error } = await supabase.from("tasks").insert(list.map(h => ({
          user_id: user.id,
          title: h.title,
          description: h.description,
          life_area_id: h.life_area_id,
          priority: "medium",
          status: h.is_active ? "pending" : "cancelled",
          cancelled_at: h.is_active ? null : new Date().toISOString(),
          task_type: "daily",
          repeat_days: h.repeat_days,
          timezone,
        })));
        if (error) { setConverting(false); alert(`No se pudo convertir: ${error.message}`); return; }
        const ids = list.map(h => h.id);
        await supabase.from("habit_logs").delete().in("habit_id", ids);
        await supabase.from("habits").delete().in("id", ids);
        setConverting(false);
        setDetail(null);
        alert(`${list.length} tarea${one ? "" : "s"} diaria${one ? "" : "s"} creada${one ? "" : "s"}. Las verás en Proyectos & Tareas → Diarias.`);
        load();
      },
    });
  }

  // Completions in the habit's current period: this month for monthly habits, this week otherwise
  function periodCount(habit: Habit): number {
    const dates = logs[habit.id] ?? [];
    return habit.frequency === "monthly"
      ? dates.filter(d => d.startsWith(currentMonth)).length
      : dates.filter(d => weekDates.includes(d)).length;
  }

  function weekCompletion(habit: Habit): number {
    return Math.min(Math.round((periodCount(habit) / Math.max(habit.target_per_week, 1)) * 100), 100);
  }

  function todayDone(habitId: string): boolean {
    return logs[habitId]?.includes(today) ?? false;
  }

  const query = search.trim().toLowerCase();
  const visibleHabits = habits.filter(h => {
    if (statusFilter === "active" && !h.is_active) return false;
    if (statusFilter === "inactive" && h.is_active) return false;
    if (query && !`${h.title} ${h.description}`.toLowerCase().includes(query)) return false;
    return createdInRange(h.created_at, createdFrom, createdTo);
  });
  const activeHabits = habits.filter(h => h.is_active);
  const todayHabits = activeHabits.filter(h => dayMatches(h.repeat_days, today));
  const todayCompleted = todayHabits.filter(h => todayDone(h.id)).length;
  const weekTotal = activeHabits.reduce((acc, h) => acc + weekCompletion(h), 0);
  const weekAvg = activeHabits.length > 0 ? Math.round(weekTotal / activeHabits.length) : 0;
  const filtersOn = !!(query || createdFrom || createdTo);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-ocean-400">Cargando hábitos...</div>
    </div>
  );

  const actionButtons = (habit: Habit) => (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={() => toggleActive(habit)} title={habit.is_active ? "Pasar a inactivo" : "Reactivar"} className={`text-xs px-2 py-1 rounded border transition-colors ${habit.is_active ? "border-green-500/50 text-green-400" : "border-ocean-700 text-ocean-500"}`}>
        {habit.is_active ? "Activo" : "Inactivo"}
      </button>
      <button onClick={() => convertToDailyTasks([habit])} title="Convertir en tarea diaria" className="text-ocean-500 hover:text-sky-400 transition-colors"><ArrowRightLeft size={14} /></button>
      <button onClick={() => openEditHabit(habit)} title="Editar" className="text-ocean-500 hover:text-blue-400 transition-colors"><Pencil size={14} /></button>
      <button onClick={() => deleteHabit(habit)} title="Eliminar" className="text-ocean-500 hover:text-red-400 transition-colors"><X size={14} /></button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Detalle */}
      {detail && (
        <DetailModal
          onClose={() => setDetail(null)}
          info={{
            title: detail.title,
            kind: `Hábito · ${detail.is_active ? "activo" : "inactivo"}`,
            color: detail.color,
            description: detail.description,
            meta: [
              ["Área", LIFE_AREAS.find(a => a.id === detail.life_area_id)?.name ?? "—"],
              ["Frecuencia", `${freqInfo(detail.frequency).label} · meta ${detail.target_per_week}x/${freqInfo(detail.frequency).period}`],
              ["Días", describeRepeat(detail.repeat_days)],
              ["Creado", detail.created_at ? formatDate(detail.created_at) : "—"],
            ],
          }}
          actions={
            <>
              <button onClick={() => convertToDailyTasks([detail])} className="text-sm px-4 py-2 rounded-lg border border-ocean-700 text-ocean-300 hover:text-white">Convertir en tarea diaria</button>
              <button onClick={() => { const h = detail; setDetail(null); openEditHabit(h); }} className="text-sm px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium">Editar</button>
            </>
          }
        />
      )}

      {/* Confirmación */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-ocean-900 border border-ocean-700 rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-semibold text-white">{confirmDialog.title}</div>
            <p className="text-sm text-ocean-400">{confirmDialog.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDialog(null)} className="text-ocean-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-ocean-700">No</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-5 py-2 rounded-lg font-medium">{confirmDialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Hábitos</h2>
          <p className="text-ocean-400 text-sm mt-1">Registro semanal · Semana del {weekDates[0]} al {weekDates[6]}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setHabitForm(EMPTY_HABIT); setActiveView(v => v === "calendar" ? "week" : v); }}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          + Nuevo Hábito
        </button>
      </div>

      {/* Hábitos que en realidad son tareas diarias */}
      {habits.length > 0 && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap text-sm">
          <ArrowRightLeft size={16} className="text-sky-400 shrink-0" />
          <span className="text-ocean-200 flex-1 min-w-[200px]">¿Alguno de estos hábitos es en realidad una tarea diaria? Conviértelo con <ArrowRightLeft size={12} className="inline" /> en cada hábito, o todos de una vez.</span>
          <button
            disabled={converting}
            onClick={() => convertToDailyTasks(habits)}
            className="text-xs text-sky-300 hover:text-white border border-sky-500/40 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            {converting ? "Convirtiendo..." : `Convertir todos (${habits.length}) en tareas diarias`}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Hábitos activos",    value: activeHabits.length, color: "text-brand-400" },
          { label: "Completados hoy",    value: `${todayCompleted}/${todayHabits.length}`, color: "text-blue-400" },
          { label: "Promedio semanal",   value: `${weekAvg}%`, color: weekAvg >= 80 ? "text-green-400" : weekAvg >= 50 ? "text-yellow-400" : "text-red-400" },
          { label: "Mejor racha activa", value: activeHabits.length > 0 ? Math.max(...activeHabits.map(h => h.current_streak)) + "d" : "0d", color: "text-orange-400" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-ocean-900 border border-ocean-800 rounded-xl p-4 text-center">
            <div className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-ocean-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Today checklist: solo los hábitos que tocan hoy */}
      {activeHabits.length > 0 && (
        <div className="bg-ocean-900 border border-ocean-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Check de hoy — {today}</h3>
          {todayHabits.length === 0 ? (
            <div className="text-sm text-ocean-500">Hoy no toca ningún hábito.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {todayHabits.map(habit => {
                const done = todayDone(habit.id);
                const isToggling = toggling === `${habit.id}-${today}`;
                return (
                  <div
                    key={habit.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${done ? "border-transparent text-white" : "border-ocean-700 text-ocean-400"}`}
                    style={done ? { backgroundColor: habit.color + "25", borderColor: habit.color + "60" } : {}}
                  >
                    <button
                      onClick={() => toggleLog(habit.id, today)}
                      disabled={isToggling}
                      title={done ? "Desmarcar" : "Marcar hecho"}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? "border-transparent" : "border-ocean-600 hover:border-brand-500"}`}
                      style={done ? { backgroundColor: habit.color } : {}}
                    >
                      {done && <Check size={12} className="text-white" />}
                    </button>
                    <button onClick={() => setDetail(habit)} className="flex-1 min-w-0 text-left" title="Ver detalle">
                      <div className="text-sm font-medium truncate">{habit.title}</div>
                      {habit.description
                        ? <div className="text-xs opacity-60 truncate">{habit.description}</div>
                        : habit.current_streak > 0 && <div className="text-xs opacity-60">{habit.current_streak}d de racha</div>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Habit Form */}
      {showForm && (
        <div className="bg-ocean-900 border border-brand-500/40 rounded-2xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">{editingId ? "Editar hábito" : "Nuevo hábito"}</div>
          <input
            value={habitForm.title}
            onChange={e => setHabitForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Nombre del hábito"
            className="w-full bg-ocean-800 border border-ocean-700 rounded-lg px-4 py-2.5 text-white placeholder-ocean-500 focus:outline-none focus:border-brand-500"
          />
          <textarea
            value={habitForm.description}
            onChange={e => setHabitForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Descripción o regla del hábito (opcional)"
            rows={2}
            className="w-full bg-ocean-800 border border-ocean-700 rounded-lg px-4 py-2.5 text-white placeholder-ocean-500 focus:outline-none focus:border-brand-500 resize-none text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={habitForm.life_area_id}
              onChange={e => setHabitForm(p => ({ ...p, life_area_id: Number(e.target.value) }))}
              className="bg-ocean-800 border border-ocean-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
            >
              {LIFE_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select
              value={habitForm.frequency}
              onChange={e => setHabitForm(p => ({
                ...p,
                frequency: e.target.value,
                target_per_week: e.target.value === "daily" ? p.repeat_days.length : freqInfo(e.target.value).defaultTarget,
              }))}
              className="bg-ocean-800 border border-ocean-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, f]) => <option key={value} value={value}>{f.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-ocean-400 text-xs shrink-0">Meta/{freqInfo(habitForm.frequency).period}:</label>
              <input
                type="number" min={1} max={freqInfo(habitForm.frequency).max}
                value={habitForm.target_per_week}
                onChange={e => setHabitForm(p => ({ ...p, target_per_week: Number(e.target.value) }))}
                className="w-full bg-ocean-800 border border-ocean-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
              />
            </div>
          </div>

          <RepeatDaysPicker label="Días en que se muestra en el calendario y en el check de hoy:" value={habitForm.repeat_days} onChange={setRepeatDays} />

          <div>
            <label className="text-xs text-ocean-400 block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setHabitForm(p => ({ ...p, color: c.value }))}
                  className={`w-7 h-7 rounded-full transition-transform ${habitForm.color === c.value ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-ocean-800" : "hover:scale-110"}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ocean-300 w-fit cursor-pointer">
            <input type="checkbox" checked={habitForm.is_active} onChange={e => setHabitForm(p => ({ ...p, is_active: e.target.checked }))} className="accent-brand-600" />
            Activo
          </label>

          <div className="flex gap-2">
            <button onClick={saveHabit} disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-ocean-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-ocean-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* View toggle */}
      <div className="flex gap-1 bg-ocean-900 border border-ocean-800 rounded-xl p-1">
        {([["week", "Semana"], ["calendar", "Calendario"], ["list", `Lista (${habits.length})`]] as const).map(([v, lbl]) => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeView === v ? "bg-brand-600 text-white" : "text-ocean-400 hover:text-white"}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Search & filters (Semana y Lista) */}
      {activeView !== "calendar" && (
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-500"><Search size={16} /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar hábitos por nombre o descripción..."
              className="w-full bg-ocean-900 border border-ocean-800 rounded-xl pl-9 pr-9 py-2.5 text-white placeholder-ocean-500 focus:outline-none focus:border-brand-500 text-sm"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-500 hover:text-white"><X size={16} /></button>}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-ocean-900 border border-ocean-800 rounded-lg p-1">
              {([["active", `Activos (${activeHabits.length})`], ["inactive", `Inactivos (${habits.length - activeHabits.length})`], ["all", "Todos"]] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setStatusFilter(val)} className={`px-3 py-1 text-xs rounded-md transition-colors ${statusFilter === val ? "bg-brand-600 text-white" : "text-ocean-400 hover:text-white"}`}>{lbl}</button>
              ))}
            </div>
            <CreatedDateFilter from={createdFrom} to={createdTo} onChange={(f, t) => { setCreatedFrom(f); setCreatedTo(t); }} />
            <span className="text-xs text-ocean-600 ml-auto">{visibleHabits.length} hábito{visibleHabits.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* CALENDAR (compartido con Tareas) */}
      {activeView === "calendar" && (
        <AgendaCalendar
          focus="habits"
          onEditHabit={id => { const h = habits.find(x => x.id === id); if (h) openEditHabit(h); }}
          onChange={load}
        />
      )}

      {/* WEEKLY TABLE */}
      {activeView === "week" && (
        <div className="bg-ocean-900 border border-ocean-800 rounded-2xl overflow-hidden">
          {visibleHabits.length === 0 ? (
            <div className="text-center py-12 text-ocean-500">
              {filtersOn ? "Sin hábitos con esa búsqueda." : statusFilter === "inactive" ? "No hay hábitos inactivos." : "Sin hábitos. Agrega tu primer hábito."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ocean-800">
                    <th className="text-left px-4 py-3 text-ocean-400 text-sm font-medium w-48">Hábito</th>
                    {weekDates.map((date, i) => (
                      <th key={date} className={`px-2 py-3 text-center text-xs font-medium w-12 ${date === today ? "text-brand-400" : "text-ocean-500"}`}>
                        <div>{DAYS_SHORT[i]}</div>
                        <div className="font-normal opacity-70">{date.slice(8)}</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-ocean-400 text-xs font-medium">Racha</th>
                    <th className="px-4 py-3 text-center text-ocean-400 text-xs font-medium">Semana</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleHabits.map(habit => {
                    const habitLogs = logs[habit.id] ?? [];
                    const weekPct = weekCompletion(habit);
                    return (
                      <tr key={habit.id} className={`border-b border-ocean-800 last:border-0 ${!habit.is_active ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <button onClick={() => setDetail(habit)} className="flex items-center gap-2 text-left" title="Ver detalle">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                            <div>
                              <div className="text-sm text-white font-medium truncate max-w-[140px] hover:underline decoration-ocean-600">{habit.title}</div>
                              <div className="text-xs text-ocean-500">{describeRepeat(habit.repeat_days)}</div>
                            </div>
                          </button>
                        </td>
                        {weekDates.map(date => {
                          const done = habitLogs.includes(date);
                          const isT = date === today;
                          const isToggling = toggling === `${habit.id}-${date}`;
                          const isFuture = date > today;
                          const scheduled = dayMatches(habit.repeat_days, date);
                          const disabled = isFuture || !habit.is_active || isToggling || (!scheduled && !done);
                          return (
                            <td key={date} className="px-2 py-3 text-center">
                              <button
                                onClick={() => !disabled && toggleLog(habit.id, date)}
                                disabled={disabled}
                                title={!scheduled ? "No toca este día" : undefined}
                                className={`w-8 h-8 rounded-lg transition-all mx-auto flex items-center justify-center text-sm ${
                                  done ? "text-white shadow-md" :
                                  !scheduled ? "text-ocean-700 cursor-not-allowed" :
                                  isFuture ? "opacity-20 cursor-not-allowed bg-ocean-800" :
                                  `${isT ? "bg-ocean-700" : "bg-ocean-800"} hover:bg-ocean-700 text-ocean-600`
                                }`}
                                style={done ? { backgroundColor: habit.color } : {}}
                              >
                                {done ? <Check size={12} /> : !scheduled ? "—" : isT ? "·" : ""}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm text-white font-medium">{habit.current_streak}d</div>
                          <div className="text-xs text-ocean-600">mejor: {habit.best_streak}d</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`text-sm font-bold ${weekPct >= 100 ? "text-green-400" : weekPct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{weekPct}%</div>
                          <div className="text-xs text-ocean-600">{periodCount(habit)}/{habit.target_per_week}{habit.frequency === "monthly" ? " mes" : ""}</div>
                        </td>
                        <td className="px-4 py-3">{actionButtons(habit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {activeView === "list" && (
        <div className="space-y-3">
          {visibleHabits.length === 0 ? (
            <div className="text-center py-12 text-ocean-500">
              {filtersOn ? "Sin hábitos con esa búsqueda." : statusFilter === "inactive" ? "No hay hábitos inactivos." : "Sin hábitos registrados"}
            </div>
          ) : (
            visibleHabits.map(habit => {
              const weekPct = weekCompletion(habit);
              const area = LIFE_AREAS.find(a => a.id === habit.life_area_id);
              return (
                <div key={habit.id} className={`bg-ocean-900 border border-ocean-800 rounded-2xl p-5 ${!habit.is_active ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <button onClick={() => setDetail(habit)} className="flex items-start gap-3 flex-1 min-w-[200px] text-left" title="Ver detalle">
                      <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: habit.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white hover:underline decoration-ocean-600">{habit.title}</div>
                        <div className="text-xs text-ocean-500 mt-0.5">
                          {area?.name} · {freqInfo(habit.frequency).label} · Meta: {habit.target_per_week}x/{freqInfo(habit.frequency).period} · {describeRepeat(habit.repeat_days)}
                          {habit.created_at && ` · Creado ${formatDate(habit.created_at)}`}
                        </div>
                        {habit.description && <div className="text-sm text-ocean-400 mt-1 line-clamp-2">{habit.description}</div>}
                      </div>
                    </button>
                    {actionButtons(habit)}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`text-xl font-black ${weekPct >= 100 ? "text-green-400" : weekPct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{weekPct}%</div>
                      <div className="text-xs text-ocean-500">esta semana</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-orange-400">{habit.current_streak}</div>
                      <div className="text-xs text-ocean-500">racha actual</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-ocean-300">{habit.best_streak}</div>
                      <div className="text-xs text-ocean-500">mejor racha</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-1.5 justify-center">
                    {weekDates.map((date, i) => {
                      const done = logs[habit.id]?.includes(date) ?? false;
                      const isFuture = date > today;
                      const scheduled = dayMatches(habit.repeat_days, date);
                      const disabled = isFuture || !habit.is_active || (!scheduled && !done);
                      return (
                        <div key={date} className="text-center">
                          <div className="text-xs text-ocean-600 mb-1">{DAYS_SHORT[i].charAt(0)}</div>
                          <button
                            onClick={() => !disabled && toggleLog(habit.id, date)}
                            disabled={disabled}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                              done ? "text-white" :
                              !scheduled ? "text-ocean-700 cursor-not-allowed" :
                              isFuture ? "opacity-20 cursor-not-allowed bg-ocean-800" :
                              "bg-ocean-800 hover:bg-ocean-700 text-ocean-600"
                            }`}
                            style={done ? { backgroundColor: habit.color } : {}}
                          >
                            {done ? <Check size={12} /> : !scheduled ? "—" : ""}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
