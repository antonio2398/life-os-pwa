"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    return d.toISOString().split("T")[0];
  });
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
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
}

const EMPTY_HABIT: Omit<Habit, "id"> = {
  life_area_id: 1,
  title: "",
  description: "",
  frequency: "daily",
  target_per_week: 7,
  color: "#7c3aed",
  is_active: true,
  current_streak: 0,
  best_streak: 0,
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [habitForm, setHabitForm] = useState<Omit<Habit, "id">>(EMPTY_HABIT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"week" | "list">("week");
  const [showInactive, setShowInactive] = useState(false);
  const weekDates = getWeekDates();
  const today = getTodayString();
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("habit_logs").select("habit_id, logged_date, completed").eq("user_id", user.id).in("logged_date", weekDates),
    ]);
    setHabits(h ?? []);
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
    if (!user) return;
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
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editingId) {
      await supabase.from("habits").update(habitForm).eq("id", editingId);
    } else {
      await supabase.from("habits").insert({ ...habitForm, user_id: user.id });
    }
    setShowForm(false);
    setEditingId(null);
    setHabitForm(EMPTY_HABIT);
    setSaving(false);
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
    });
    setEditingId(habit.id);
    setShowForm(true);
  }

  async function toggleActive(habit: Habit) {
    await supabase.from("habits").update({ is_active: !habit.is_active }).eq("id", habit.id);
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, is_active: !h.is_active } : h));
  }

  async function deleteHabit(id: string) {
    if (!confirm("¿Eliminar este hábito? Se perderá todo el historial.")) return;
    await supabase.from("habits").delete().eq("id", id);
    load();
  }

  function weekCompletion(habitId: string, target: number): number {
    const done = logs[habitId]?.length ?? 0;
    return Math.min(Math.round((done / target) * 100), 100);
  }

  function todayDone(habitId: string): boolean {
    return logs[habitId]?.includes(today) ?? false;
  }

  const visibleHabits = habits.filter(h => showInactive ? true : h.is_active);
  const activeHabits = habits.filter(h => h.is_active);
  const todayCompleted = activeHabits.filter(h => todayDone(h.id)).length;
  const weekTotal = activeHabits.reduce((acc, h) => acc + weekCompletion(h.id, h.target_per_week), 0);
  const weekAvg = activeHabits.length > 0 ? Math.round(weekTotal / activeHabits.length) : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">Cargando hábitos...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Hábitos</h2>
          <p className="text-slate-400 text-sm mt-1">Registro semanal · Semana del {weekDates[0]} al {weekDates[6]}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setHabitForm(EMPTY_HABIT); }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          + Nuevo Hábito
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Hábitos activos",    value: activeHabits.length, color: "text-violet-400" },
          { label: "Completados hoy",    value: `${todayCompleted}/${activeHabits.length}`, color: "text-blue-400" },
          { label: "Promedio semanal",   value: `${weekAvg}%`, color: weekAvg >= 80 ? "text-green-400" : weekAvg >= 50 ? "text-yellow-400" : "text-red-400" },
          { label: "Mejor racha activa", value: activeHabits.length > 0 ? Math.max(...activeHabits.map(h => h.current_streak)) + "d" : "0d", color: "text-orange-400" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Today checklist */}
      {activeHabits.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">✅ Check de hoy — {today}</h3>
          <div className="grid grid-cols-2 gap-2">
            {activeHabits.map(habit => {
              const done = todayDone(habit.id);
              const isToggling = toggling === `${habit.id}-${today}`;
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleLog(habit.id, today)}
                  disabled={isToggling}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${done ? "border-transparent text-white" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}
                  style={done ? { backgroundColor: habit.color + "25", borderColor: habit.color + "60" } : {}}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? "border-transparent" : "border-slate-600"}`}
                    style={done ? { backgroundColor: habit.color } : {}}
                  >
                    {done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{habit.title}</div>
                    {habit.current_streak > 0 && <div className="text-xs opacity-60">🔥 {habit.current_streak}d de racha</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Habit Form */}
      {showForm && (
        <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">{editingId ? "Editar hábito" : "Nuevo hábito"}</div>
          <input
            value={habitForm.title}
            onChange={e => setHabitForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Nombre del hábito"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
          <textarea
            value={habitForm.description}
            onChange={e => setHabitForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Descripción o regla del hábito (opcional)"
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={habitForm.life_area_id}
              onChange={e => setHabitForm(p => ({ ...p, life_area_id: Number(e.target.value) }))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm"
            >
              {LIFE_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select
              value={habitForm.frequency}
              onChange={e => setHabitForm(p => ({
                ...p,
                frequency: e.target.value,
                target_per_week: e.target.value === "daily" ? 7 : 1,
              }))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm"
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-xs shrink-0">Meta/sem:</label>
              <input
                type="number" min={1} max={7}
                value={habitForm.target_per_week}
                onChange={e => setHabitForm(p => ({ ...p, target_per_week: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setHabitForm(p => ({ ...p, color: c.value }))}
                  className={`w-7 h-7 rounded-full transition-transform ${habitForm.color === c.value ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-800" : "hover:scale-110"}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveHabit} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(["week", "list"] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${activeView === v ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {v === "week" ? "📅 Semana" : "📋 Lista"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowInactive(!showInactive)}
          className={`text-xs px-3 py-1 rounded-lg border transition-colors ${showInactive ? "border-violet-500 text-violet-400" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}>
          {showInactive ? "Ocultar inactivos" : "Mostrar inactivos"}
        </button>
        <span className="text-xs text-slate-600 ml-auto">{visibleHabits.length} hábito{visibleHabits.length !== 1 ? "s" : ""}</span>
      </div>

      {/* WEEKLY TABLE */}
      {activeView === "week" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {visibleHabits.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <div className="text-4xl mb-3">❤️</div>
              <div className="text-slate-500">Sin hábitos. Agrega tu primer hábito.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-400 text-sm font-medium w-48">Hábito</th>
                    {weekDates.map((date, i) => (
                      <th key={date} className={`px-2 py-3 text-center text-xs font-medium w-12 ${date === today ? "text-violet-400" : "text-slate-500"}`}>
                        <div>{DAYS_SHORT[i]}</div>
                        <div className="font-normal opacity-70">{date.slice(8)}</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-slate-400 text-xs font-medium">Racha</th>
                    <th className="px-4 py-3 text-center text-slate-400 text-xs font-medium">Semana</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleHabits.map(habit => {
                    const habitLogs = logs[habit.id] ?? [];
                    const weekPct = weekCompletion(habit.id, habit.target_per_week);
                    return (
                      <tr key={habit.id} className={`border-b border-slate-800 last:border-0 ${!habit.is_active ? "opacity-40" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                            <div>
                              <div className="text-sm text-white font-medium truncate max-w-[140px]">{habit.title}</div>
                              <div className="text-xs text-slate-500">{LIFE_AREAS.find(a => a.id === habit.life_area_id)?.name}</div>
                            </div>
                          </div>
                        </td>
                        {weekDates.map(date => {
                          const done = habitLogs.includes(date);
                          const isT = date === today;
                          const isToggling = toggling === `${habit.id}-${date}`;
                          const isFuture = date > today;
                          return (
                            <td key={date} className="px-2 py-3 text-center">
                              <button
                                onClick={() => !isFuture && habit.is_active && toggleLog(habit.id, date)}
                                disabled={isFuture || !habit.is_active || isToggling}
                                className={`w-8 h-8 rounded-lg transition-all mx-auto flex items-center justify-center text-sm ${
                                  isFuture ? "opacity-20 cursor-not-allowed bg-slate-800" :
                                  !done ? `${isT ? "bg-slate-700" : "bg-slate-800"} hover:bg-slate-700 text-slate-600` :
                                  "text-white shadow-md"
                                }`}
                                style={done ? { backgroundColor: habit.color } : {}}
                              >
                                {done ? "✓" : isT ? "·" : ""}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {habit.current_streak > 0 && <span className="text-orange-400">🔥</span>}
                            <span className="text-sm text-white font-medium">{habit.current_streak}d</span>
                          </div>
                          <div className="text-xs text-slate-600">mejor: {habit.best_streak}d</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`text-sm font-bold ${weekPct >= 100 ? "text-green-400" : weekPct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{weekPct}%</div>
                          <div className="text-xs text-slate-600">{habitLogs.length}/{habit.target_per_week}</div>
                        </td>
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
            <div className="text-center py-12 text-slate-600">
              <div className="text-4xl mb-3">❤️</div>
              <div className="text-slate-500">Sin hábitos registrados</div>
            </div>
          ) : (
            visibleHabits.map(habit => {
              const weekPct = weekCompletion(habit.id, habit.target_per_week);
              const area = LIFE_AREAS.find(a => a.id === habit.life_area_id);
              return (
                <div key={habit.id} className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 ${!habit.is_active ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: habit.color }} />
                      <div className="flex-1">
                        <div className="font-semibold text-white">{habit.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{area?.name} · {habit.frequency === "daily" ? "Diario" : "Semanal"} · Meta: {habit.target_per_week}x/sem</div>
                        {habit.description && <div className="text-sm text-slate-400 mt-1">{habit.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleActive(habit)} className={`text-xs px-2 py-1 rounded border transition-colors ${habit.is_active ? "border-green-500/50 text-green-400" : "border-slate-700 text-slate-500"}`}>
                        {habit.is_active ? "Activo" : "Inactivo"}
                      </button>
                      <button onClick={() => openEditHabit(habit)} className="text-slate-500 hover:text-blue-400 text-xs transition-colors">✎</button>
                      <button onClick={() => deleteHabit(habit.id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors">✕</button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`text-xl font-black ${weekPct >= 100 ? "text-green-400" : weekPct >= 70 ? "text-yellow-400" : "text-red-400"}`}>{weekPct}%</div>
                      <div className="text-xs text-slate-500">esta semana</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-orange-400 flex items-center justify-center gap-1">
                        {habit.current_streak > 0 && "🔥"}{habit.current_streak}
                      </div>
                      <div className="text-xs text-slate-500">racha actual</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-slate-300">{habit.best_streak}</div>
                      <div className="text-xs text-slate-500">mejor racha</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-1.5 justify-center">
                    {weekDates.map((date, i) => {
                      const done = logs[habit.id]?.includes(date) ?? false;
                      const isFuture = date > today;
                      return (
                        <div key={date} className="text-center">
                          <div className="text-xs text-slate-600 mb-1">{DAYS_SHORT[i].charAt(0)}</div>
                          <button
                            onClick={() => !isFuture && habit.is_active && toggleLog(habit.id, date)}
                            disabled={isFuture || !habit.is_active}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                              isFuture ? "opacity-20 cursor-not-allowed bg-slate-800" :
                              done ? "text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-600"
                            }`}
                            style={done ? { backgroundColor: habit.color } : {}}
                          >
                            {done ? "✓" : ""}
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
