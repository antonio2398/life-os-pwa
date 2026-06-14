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

const PRIORITY_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  critical: { label: "Crítica",    badge: "bg-red-500/20 text-red-400 border border-red-500/30",    dot: "bg-red-500" },
  high:     { label: "Alta",       badge: "bg-orange-500/20 text-orange-400 border border-orange-500/30", dot: "bg-orange-500" },
  medium:   { label: "Media",      badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { label: "Baja",       badge: "bg-green-500/20 text-green-400 border border-green-500/30",  dot: "bg-green-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned:     { label: "Planificado",  color: "text-slate-400" },
  in_progress: { label: "En progreso",  color: "text-blue-400" },
  achieved:    { label: "Logrado ✓",    color: "text-green-400" },
  completed:   { label: "Completado ✓", color: "text-green-400" },
  paused:      { label: "En pausa",     color: "text-yellow-400" },
};

interface Dream {
  id: string;
  title: string;
  description: string;
  life_area_id: number;
  priority: string;
  status: string;
  estimated_progress: number;
  target_year: number | null;
}

interface Goal {
  id: string;
  dream_id: string | null;
  life_area_id: number;
  title: string;
  description: string;
  target_date: string;
  progress: number;
  status: string;
}

const EMPTY_DREAM: Omit<Dream, "id"> = { title: "", description: "", life_area_id: 1, priority: "high", status: "in_progress", estimated_progress: 0, target_year: null };
const EMPTY_GOAL: Omit<Goal, "id"> = { dream_id: "", life_area_id: 1, title: "", description: "", target_date: "", progress: 0, status: "planned" };

export default function GoalsPage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeTab, setActiveTab] = useState<"dreams" | "goals">("dreams");
  const [loading, setLoading] = useState(true);

  // Dream state
  const [showDreamForm, setShowDreamForm] = useState(false);
  const [dreamForm, setDreamForm] = useState<Omit<Dream, "id">>(EMPTY_DREAM);
  const [editingDreamId, setEditingDreamId] = useState<string | null>(null);
  const [expandedDream, setExpandedDream] = useState<string | null>(null);
  const [savingDream, setSavingDream] = useState(false);

  // Goal state
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState<Omit<Goal, "id">>(EMPTY_GOAL);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);

  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: d }, { data: g }] = await Promise.all([
      supabase.from("dreams").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setDreams(d ?? []);
    setGoals(g ?? []);
    setLoading(false);
  }

  // ── Dreams CRUD ──────────────────────────────────────────
  async function saveDream() {
    if (!dreamForm.title.trim()) return;
    setSavingDream(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editingDreamId) {
      await supabase.from("dreams").update({ ...dreamForm, updated_at: new Date().toISOString() }).eq("id", editingDreamId);
    } else {
      await supabase.from("dreams").insert({ ...dreamForm, user_id: user.id });
    }
    setShowDreamForm(false);
    setEditingDreamId(null);
    setDreamForm(EMPTY_DREAM);
    setSavingDream(false);
    load();
  }

  function openEditDream(dream: Dream) {
    setDreamForm({ title: dream.title, description: dream.description, life_area_id: dream.life_area_id, priority: dream.priority, status: dream.status, estimated_progress: dream.estimated_progress, target_year: dream.target_year });
    setEditingDreamId(dream.id);
    setShowDreamForm(true);
  }

  async function deleteDream(id: string) {
    if (!confirm("¿Eliminar este sueño? También se eliminarán sus metas asociadas.")) return;
    await supabase.from("dreams").delete().eq("id", id);
    load();
  }

  async function updateDreamProgress(id: string, progress: number) {
    await supabase.from("dreams").update({ estimated_progress: progress, updated_at: new Date().toISOString() }).eq("id", id);
    setDreams(prev => prev.map(d => d.id === id ? { ...d, estimated_progress: progress } : d));
  }

  // ── Goals CRUD ───────────────────────────────────────────
  async function saveGoal() {
    if (!goalForm.title.trim()) return;
    setSavingGoal(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { ...goalForm, dream_id: goalForm.dream_id || null, user_id: user.id };
    if (editingGoalId) {
      await supabase.from("goals").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingGoalId);
    } else {
      await supabase.from("goals").insert(payload);
    }
    setShowGoalForm(false);
    setEditingGoalId(null);
    setGoalForm(EMPTY_GOAL);
    setSavingGoal(false);
    load();
  }

  function openEditGoal(goal: Goal) {
    setGoalForm({ dream_id: goal.dream_id ?? "", life_area_id: goal.life_area_id, title: goal.title, description: goal.description, target_date: goal.target_date, progress: goal.progress, status: goal.status });
    setEditingGoalId(goal.id);
    setShowGoalForm(true);
  }

  async function deleteGoal(id: string) {
    if (!confirm("¿Eliminar esta meta?")) return;
    await supabase.from("goals").delete().eq("id", id);
    load();
  }

  async function updateGoalProgress(id: string, progress: number) {
    const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "planned";
    await supabase.from("goals").update({ progress, status, updated_at: new Date().toISOString() }).eq("id", id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress, status } : g));
  }

  const dreamGoals = (dreamId: string) => goals.filter(g => g.dream_id === dreamId);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400">Cargando...</div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Sueños & Metas</h2>
          <p className="text-slate-400 text-sm mt-1">Visión a largo plazo y OKRs de 90 días</p>
        </div>
        <button
          onClick={() => { activeTab === "dreams" ? (setShowDreamForm(true), setEditingDreamId(null), setDreamForm(EMPTY_DREAM)) : (setShowGoalForm(true), setEditingGoalId(null), setGoalForm(EMPTY_GOAL)); }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          + {activeTab === "dreams" ? "Nuevo Sueño" : "Nueva Meta"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Sueños activos",     value: dreams.filter(d => d.status === "in_progress").length, color: "text-blue-400" },
          { label: "Metas en progreso",  value: goals.filter(g => g.status === "in_progress").length,  color: "text-violet-400" },
          { label: "Sueños logrados",    value: dreams.filter(d => d.status === "achieved").length,     color: "text-green-400" },
          { label: "Metas completadas",  value: goals.filter(g => g.status === "completed").length,     color: "text-green-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {(["dreams", "goals"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
            {tab === "dreams" ? `🌟 Sueños (${dreams.length})` : `🎯 Metas 90 días (${goals.length})`}
          </button>
        ))}
      </div>

      {/* ── DREAMS ───────────────────────────────────────── */}
      {activeTab === "dreams" && (
        <div className="space-y-4">
          {/* Dream Form */}
          {showDreamForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">{editingDreamId ? "Editar sueño" : "Nuevo sueño"}</div>
              <input
                value={dreamForm.title}
                onChange={e => setDreamForm(p => ({ ...p, title: e.target.value }))}
                placeholder="¿Cuál es tu gran sueño?"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <textarea
                value={dreamForm.description}
                onChange={e => setDreamForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe este sueño en detalle..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm"
              />
              <div className="grid grid-cols-3 gap-3">
                <select value={dreamForm.life_area_id} onChange={e => setDreamForm(p => ({ ...p, life_area_id: Number(e.target.value) }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {LIFE_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={dreamForm.priority} onChange={e => setDreamForm(p => ({ ...p, priority: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  <option value="critical">🔴 Crítica</option>
                  <option value="high">🟠 Alta</option>
                  <option value="medium">🟡 Media</option>
                  <option value="low">🟢 Baja</option>
                </select>
                <select value={dreamForm.status} onChange={e => setDreamForm(p => ({ ...p, status: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  <option value="planned">Planificado</option>
                  <option value="in_progress">En progreso</option>
                  <option value="achieved">Logrado</option>
                  <option value="paused">En pausa</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={saveDream} disabled={savingDream} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">{savingDream ? "Guardando..." : "Guardar"}</button>
                <button onClick={() => { setShowDreamForm(false); setEditingDreamId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}

          {/* Dream List */}
          {dreams.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <div className="text-5xl mb-4">🌟</div>
              <div className="text-lg font-medium text-slate-500">Sin sueños registrados</div>
              <div className="text-sm mt-1">¿Cuál es tu gran visión para los próximos 10-30 años?</div>
            </div>
          ) : (
            dreams.map(dream => {
              const dGoals = dreamGoals(dream.id);
              const isExpanded = expandedDream === dream.id;
              const area = LIFE_AREAS.find(a => a.id === dream.life_area_id);
              const priority = PRIORITY_CONFIG[dream.priority];
              const status = STATUS_CONFIG[dream.status];
              return (
                <div key={dream.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${priority.dot}`} />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white text-base">{dream.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{area?.name} · {dGoals.length} metas asociadas</div>
                            {dream.description && <div className="text-sm text-slate-400 mt-2 leading-relaxed">{dream.description}</div>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.badge}`}>{priority.label}</span>
                            <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Progreso estimado</span>
                            <span className="text-white font-medium">{dream.estimated_progress}%</span>
                          </div>
                          <input
                            type="range" min={0} max={100} step={5}
                            value={dream.estimated_progress}
                            onChange={e => updateDreamProgress(dream.id, Number(e.target.value))}
                            className="w-full accent-violet-500 h-2"
                          />
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                          <button onClick={() => setExpandedDream(isExpanded ? null : dream.id)} className="text-xs text-slate-400 hover:text-violet-400 transition-colors">
                            {isExpanded ? "▲ Ocultar metas" : `▼ Ver metas (${dGoals.length})`}
                          </button>
                          <button onClick={() => openEditDream(dream)} className="text-xs text-slate-400 hover:text-blue-400 ml-auto transition-colors">Editar</button>
                          <button onClick={() => deleteDream(dream.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Eliminar</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metas del sueño */}
                  {isExpanded && dGoals.length > 0 && (
                    <div className="border-t border-slate-800 bg-slate-900/50 px-5 py-4 space-y-2">
                      <div className="text-xs font-medium text-slate-500 mb-2">Metas de 90 días vinculadas:</div>
                      {dGoals.map(goal => (
                        <div key={goal.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2">
                          <div className="flex-1">
                            <div className="text-sm text-white">{goal.title}</div>
                            {goal.target_date && <div className="text-xs text-slate-500">📅 {goal.target_date}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${goal.progress}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 w-8">{goal.progress}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── GOALS ────────────────────────────────────────── */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          {/* Goal Form */}
          {showGoalForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">{editingGoalId ? "Editar meta" : "Nueva meta (OKR 90 días)"}</div>
              <input
                value={goalForm.title}
                onChange={e => setGoalForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Meta SMART: ¿Qué, cuándo, cómo medirlo?"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <textarea
                value={goalForm.description}
                onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))}
                placeholder="¿Por qué es importante esta meta?"
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select value={goalForm.dream_id ?? ""} onChange={e => setGoalForm(p => ({ ...p, dream_id: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  <option value="">Sin sueño vinculado</option>
                  {dreams.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
                <select value={goalForm.life_area_id} onChange={e => setGoalForm(p => ({ ...p, life_area_id: Number(e.target.value) }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {LIFE_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Fecha objetivo</label>
                  <input type="date" value={goalForm.target_date} onChange={e => setGoalForm(p => ({ ...p, target_date: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Estado</label>
                  <select value={goalForm.status} onChange={e => setGoalForm(p => ({ ...p, status: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                    <option value="planned">Planificada</option>
                    <option value="in_progress">En progreso</option>
                    <option value="completed">Completada</option>
                    <option value="paused">En pausa</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveGoal} disabled={savingGoal} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">{savingGoal ? "Guardando..." : "Guardar"}</button>
                <button onClick={() => { setShowGoalForm(false); setEditingGoalId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <div className="text-5xl mb-4">🎯</div>
              <div className="text-lg font-medium text-slate-500">Sin metas registradas</div>
              <div className="text-sm mt-1">Define tus OKRs para los próximos 90 días</div>
            </div>
          ) : (
            goals.map(goal => {
              const dream = dreams.find(d => d.id === goal.dream_id);
              const area = LIFE_AREAS.find(a => a.id === goal.life_area_id);
              const status = STATUS_CONFIG[goal.status];
              const daysLeft = goal.target_date ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="font-semibold text-white">{goal.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-500">{area?.name}</span>
                        {dream && <><span className="text-slate-700">·</span><span className="text-xs text-violet-400">↑ {dream.title}</span></>}
                        {goal.target_date && <><span className="text-slate-700">·</span><span className={`text-xs ${daysLeft !== null && daysLeft < 14 ? "text-red-400" : "text-slate-500"}`}>📅 {goal.target_date}{daysLeft !== null && ` (${daysLeft > 0 ? `${daysLeft}d restantes` : "Vencida"})`}</span></>}
                      </div>
                      {goal.description && <div className="text-sm text-slate-400 mt-2">{goal.description}</div>}
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${status.color}`}>{status.label}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Progreso</span>
                      <span className="text-white font-medium">{goal.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${goal.progress >= 100 ? "bg-green-500" : "bg-violet-500"}`} style={{ width: `${goal.progress}%` }} />
                    </div>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={goal.progress}
                      onChange={e => updateGoalProgress(goal.id, Number(e.target.value))}
                      className="w-full accent-violet-500 h-2"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => openEditGoal(goal)} className="text-xs text-slate-400 hover:text-blue-400 transition-colors">Editar</button>
                    <button onClick={() => deleteGoal(goal.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Eliminar</button>
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
