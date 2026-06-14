"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LIFE_AREAS = [
  { id: 1, name: "Salud / Bienestar",          weight: 25, icon: "💚", color: "#22c55e", accent: "accent-green-500",  bar: "bg-green-500",  border: "border-green-500/30",  bg: "bg-green-950/20",  text: "text-green-400" },
  { id: 2, name: "Finanzas / Inversiones",     weight: 25, icon: "💰", color: "#eab308", accent: "accent-yellow-500", bar: "bg-yellow-500", border: "border-yellow-500/30", bg: "bg-yellow-950/20", text: "text-yellow-400" },
  { id: 3, name: "Carrera / Negocios",         weight: 20, icon: "🔵", color: "#3b82f6", accent: "accent-blue-500",   bar: "bg-blue-500",   border: "border-blue-500/30",   bg: "bg-blue-950/20",   text: "text-blue-400" },
  { id: 4, name: "Relaciones / Redes",         weight: 10, icon: "🟣", color: "#a855f7", accent: "accent-purple-500", bar: "bg-purple-500", border: "border-purple-500/30", bg: "bg-purple-950/20", text: "text-purple-400" },
  { id: 5, name: "Espiritualidad / Propósito", weight: 10, icon: "🟠", color: "#f97316", accent: "accent-orange-500", bar: "bg-orange-500", border: "border-orange-500/30", bg: "bg-orange-950/20", text: "text-orange-400" },
  { id: 6, name: "Aprendizaje / Crecimiento",  weight:  5, icon: "📘", color: "#06b6d4", accent: "accent-cyan-500",   bar: "bg-cyan-500",   border: "border-cyan-500/30",   bg: "bg-cyan-950/20",   text: "text-cyan-400" },
  { id: 7, name: "Impacto / Legado",           weight:  5, icon: "❤️", color: "#ef4444", accent: "accent-red-500",    bar: "bg-red-500",    border: "border-red-500/30",    bg: "bg-red-950/20",    text: "text-red-400" },
];

const QUESTIONS: Record<number, { id: string; label: string; tip: string }[]> = {
  1: [
    { id: "sleep",     label: "¿Duermes ≥7 horas diarias?",               tip: "0 = nunca · 10 = siempre" },
    { id: "exercise",  label: "¿Haces ejercicio ≥3 veces por semana?",    tip: "0 = nunca · 10 = siempre" },
    { id: "nutrition", label: "¿Comes saludable la mayoría del tiempo?",  tip: "0 = casi nunca · 10 = siempre" },
    { id: "review",    label: "¿Tienes un sistema de revisión semanal?",  tip: "0 = no existe · 10 = consolidado" },
  ],
  2: [
    { id: "income",    label: "¿Tienes una fuente de ingreso estable?",               tip: "0 = ninguna · 10 = múltiples fuentes" },
    { id: "savings",   label: "¿Ahorras o inviertes ≥10% de tus ingresos?",           tip: "0 = nunca · 10 = siempre" },
    { id: "emergency", label: "¿Tienes fondo de emergencia ≥3 meses de gastos?",      tip: "0 = no · 10 = sí, bien fondado" },
    { id: "tracking",  label: "¿Llevas control activo de tus gastos e ingresos?",     tip: "0 = no · 10 = sistema sólido" },
  ],
  3: [
    { id: "direction",   label: "¿Tienes claridad sobre tu dirección profesional?",   tip: "0 = sin rumbo · 10 = visión clara" },
    { id: "milestone",   label: "¿Has alcanzado un hito profesional en 90 días?",     tip: "0 = no · 10 = sí, significativo" },
    { id: "development", label: "¿Inviertes regularmente en tu desarrollo profesional?", tip: "0 = nunca · 10 = sistemáticamente" },
    { id: "alignment",   label: "¿Tu trabajo está alineado con tu propósito de vida?", tip: "0 = sin relación · 10 = perfectamente" },
  ],
  4: [
    { id: "family",     label: "¿Dedicas tiempo de calidad a familia y amigos cercanos?", tip: "0 = nunca · 10 = regularmente" },
    { id: "community",  label: "¿Participas en comunidades de valor?",                    tip: "0 = no · 10 = activamente" },
    { id: "quality",    label: "¿Tus relaciones actuales te impulsan y enriquecen?",      tip: "0 = me drenan · 10 = me elevan" },
    { id: "networking", label: "¿Practicas el networking activamente?",                    tip: "0 = nunca · 10 = semanalmente" },
  ],
  5: [
    { id: "practice",  label: "¿Tienes práctica diaria de meditación/oración/reflexión?", tip: "0 = ninguna · 10 = diaria y constante" },
    { id: "purpose",   label: "¿Sientes claridad y conexión con tu propósito de vida?",   tip: "0 = sin claridad · 10 = muy claro" },
    { id: "integrity", label: "¿Actúas con coherencia entre tus valores y tus acciones?", tip: "0 = casi nunca · 10 = siempre" },
    { id: "peace",     label: "¿Sientes paz interior con tu camino y decisiones actuales?", tip: "0 = mucha angustia · 10 = plena paz" },
  ],
  6: [
    { id: "reading", label: "¿Lees o estudias al menos 30 minutos al día?",          tip: "0 = nunca · 10 = todos los días" },
    { id: "skill",   label: "¿Estás desarrollando activamente una habilidad nueva?", tip: "0 = no · 10 = sí, con sistema" },
    { id: "events",  label: "¿Asistes a cursos, eventos o programas de crecimiento?", tip: "0 = nunca · 10 = regularmente" },
    { id: "apply",   label: "¿Aplicas lo que aprendes en proyectos concretos?",       tip: "0 = no · 10 = siempre" },
  ],
  7: [
    { id: "cause",       label: "¿Contribuyes activamente a causas que te importan?",  tip: "0 = nunca · 10 = semanalmente" },
    { id: "work_impact", label: "¿Tu trabajo tiene impacto positivo en otros?",        tip: "0 = ninguno · 10 = claro y medible" },
    { id: "legacy",      label: "¿Estás construyendo algo que trascienda en el tiempo?", tip: "0 = no pienso en eso · 10 = trabajo en ello" },
    { id: "inspire",     label: "¿Inspiras o sirves de ejemplo a tu entorno?",          tip: "0 = no · 10 = frecuentemente" },
  ],
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface EvalRecord {
  id: string;
  life_area_id: number;
  score: number;
  target_90d: number;
  notes: string;
  question_scores: Record<string, number>;
  evaluated_at: string;
}

type ViewTab = "current" | "history";

// ── Helpers ────────────────────────────────────────────────────────────────────
function avg(scores: Record<string, number>): number {
  const vals = Object.values(scores);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10);
}

function decodeNotes(raw: string): { qScores: Record<string, number>; cleanNotes: string } {
  let qScores: Record<string, number> = {};
  let cleanNotes = raw ?? "";
  try {
    if (cleanNotes.startsWith("__q__")) {
      const sep = cleanNotes.indexOf("|");
      qScores = JSON.parse(cleanNotes.slice(5, sep));
      cleanNotes = cleanNotes.slice(sep + 1);
    }
  } catch {}
  return { qScores, cleanNotes };
}

function statusBadge(score: number) {
  if (score >= 70) return { label: "Bueno",       cls: "bg-green-500/20  text-green-400  border border-green-500/30"  };
  if (score >= 40) return { label: "En progreso", cls: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" };
  return               { label: "Crítico",       cls: "bg-red-500/20    text-red-400    border border-red-500/30"    };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AreasPage() {
  // All records from DB, grouped by area
  const [allRecords, setAllRecords] = useState<Record<number, EvalRecord[]>>({});

  // Edit form state
  const [editing,    setEditing]    = useState<number | null>(null);
  const [qScores,    setQScores]    = useState<Record<number, Record<string, number>>>({});
  const [target90,   setTarget90]   = useState<Record<number, number>>({});
  const [notesMap,   setNotesMap]   = useState<Record<number, string>>({});
  const [saving,     setSaving]     = useState(false);

  // History detail
  const [histArea,   setHistArea]   = useState<number | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<ViewTab>("current");

  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("diagnostic_scores")
      .select("id, life_area_id, score, target_90d, notes, evaluated_at")
      .eq("user_id", user.id)
      .order("evaluated_at", { ascending: false });

    if (data) {
      const grouped: Record<number, EvalRecord[]> = {};
      data.forEach((row: any) => {
        const { qScores: qs, cleanNotes } = decodeNotes(row.notes ?? "");
        const rec: EvalRecord = { id: row.id, life_area_id: row.life_area_id, score: row.score, target_90d: row.target_90d ?? 0, notes: cleanNotes, question_scores: qs, evaluated_at: row.evaluated_at };
        if (!grouped[row.life_area_id]) grouped[row.life_area_id] = [];
        grouped[row.life_area_id].push(rec);
      });
      setAllRecords(grouped);
    }
    setLoading(false);
  }

  // Latest record per area
  const latest: Record<number, EvalRecord | undefined> = {};
  LIFE_AREAS.forEach(a => { latest[a.id] = allRecords[a.id]?.[0]; });

  // Life Score
  const lifeScore = LIFE_AREAS.reduce((acc, a) => acc + ((latest[a.id]?.score ?? 0) * a.weight) / 100, 0);

  // Open eval form
  function openEdit(areaId: number) {
    const prior = latest[areaId];
    const qs: Record<string, number> = {};
    (QUESTIONS[areaId] ?? []).forEach(q => { qs[q.id] = prior?.question_scores?.[q.id] ?? 5; });
    setQScores(prev => ({ ...prev, [areaId]: qs }));
    setTarget90(prev => ({ ...prev, [areaId]: prior?.target_90d ?? 70 }));
    setNotesMap(prev => ({ ...prev, [areaId]: prior?.notes ?? "" }));
    setEditing(areaId);
  }

  function setQ(areaId: number, qId: string, val: number) {
    setQScores(prev => ({ ...prev, [areaId]: { ...(prev[areaId] ?? {}), [qId]: val } }));
  }

  async function saveEval(areaId: number) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const qs    = qScores[areaId] ?? {};
    const score = avg(qs);
    const encoded = `__q__${JSON.stringify(qs)}|${notesMap[areaId] ?? ""}`;
    await supabase.from("diagnostic_scores").insert({
      user_id: user.id, life_area_id: areaId, score,
      target_90d: target90[areaId] ?? 70, notes: encoded,
      evaluated_at: new Date().toISOString(),
    });
    setEditing(null); setSaving(false); load();
  }

  async function deleteRecord(id: string) {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    await supabase.from("diagnostic_scores").delete().eq("id", id);
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Cargando diagnóstico...</div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Diagnóstico de Vida</h2>
          <p className="text-slate-400 text-sm mt-1">
            Evaluaciones periódicas con historial completo de evolución.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Life Score</div>
          <div className={`text-5xl font-black tabular-nums ${
            lifeScore >= 70 ? "text-green-400" : lifeScore >= 40 ? "text-yellow-400" : "text-red-400"
          }`}>{Math.round(lifeScore)}</div>
          <div className="text-xs text-slate-600 mt-0.5">sobre 100</div>
        </div>
      </div>

      {/* ── PORTFOLIO BAR ───────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="grid grid-cols-7 gap-2">
          {LIFE_AREAS.map(area => {
            const score = latest[area.id]?.score ?? 0;
            const recs  = allRecords[area.id]?.length ?? 0;
            return (
              <button
                key={area.id}
                onClick={() => { setHistArea(area.id); setActiveTab("history"); }}
                className="text-center space-y-2 group cursor-pointer"
                title={`Ver historial de ${area.name}`}
              >
                <div className="text-2xl">{area.icon}</div>
                <div className="h-20 bg-slate-800 rounded-lg overflow-hidden flex flex-col justify-end relative">
                  <div className="absolute inset-0 bg-slate-700/0 group-hover:bg-slate-700/30 transition-colors rounded-lg z-10" />
                  <div className="rounded-lg transition-all duration-700" style={{ height: `${score}%`, backgroundColor: area.color }} />
                </div>
                <div className="text-xs font-bold text-white tabular-nums">{score}</div>
                <div className="text-xs text-slate-600">{recs} eval{recs !== 1 ? "s" : ""}</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-600 text-center mt-3">Clic en cualquier área para ver su historial</p>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        <button onClick={() => setActiveTab("current")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "current" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
          📊 Evaluación actual
        </button>
        <button onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "history" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
          📈 Historial completo
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: CURRENT — evaluate each area
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "current" && (
        <div className="space-y-4">
          {LIFE_AREAS.map(area => {
            const current   = latest[area.id];
            const score     = current?.score ?? 0;
            const target    = current?.target_90d ?? 0;
            const status    = statusBadge(score);
            const isEditing = editing === area.id;
            const liveQs    = qScores[area.id];
            const liveScore = liveQs ? avg(liveQs) : null;
            const recs      = allRecords[area.id]?.length ?? 0;

            return (
              <div key={area.id} className={`border rounded-2xl overflow-hidden ${area.border} ${area.bg}`}>
                {/* Card header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{area.icon}</span>
                      <div>
                        <div className="font-semibold text-white text-lg">{area.name}</div>
                        <div className="text-xs text-slate-500">
                          Peso: <span className="text-slate-300">{area.weight}%</span>
                          {" · "}{QUESTIONS[area.id]?.length ?? 0} preguntas
                          {recs > 0 && <span className="ml-2 text-slate-600">· {recs} evaluación{recs !== 1 ? "es" : ""} guardada{recs !== 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                      <button
                        onClick={() => { setHistArea(area.id); setActiveTab("history"); }}
                        className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
                      >
                        Historial ({recs})
                      </button>
                      <button
                        onClick={() => isEditing ? setEditing(null) : openEdit(area.id)}
                        className="text-violet-400 hover:text-violet-300 text-sm px-3 py-1 rounded border border-violet-700 hover:border-violet-500 transition-colors"
                      >
                        {isEditing ? "Cancelar" : current ? "Re-evaluar" : "Evaluar"}
                      </button>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${score}%`, backgroundColor: area.color }} />
                      </div>
                      <div className="text-2xl font-black text-white tabular-nums w-20 text-right">
                        {score}<span className="text-sm text-slate-500">/100</span>
                      </div>
                    </div>
                    {target > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Objetivo 90d:</span>
                        <span className="text-slate-300 font-medium">{target}/100</span>
                        <span className={score >= target ? "text-green-400" : "text-yellow-400"}>
                          {score >= target ? "✓ Alcanzado" : `+${target - score} por lograr`}
                        </span>
                      </div>
                    )}
                    {current?.notes && <div className="text-xs text-slate-400 italic">💬 {current.notes}</div>}
                    {current?.evaluated_at && (
                      <div className="text-xs text-slate-600">Última evaluación: {fmtDate(current.evaluated_at)}</div>
                    )}

                    {/* Question pills */}
                    {current?.question_scores && Object.keys(current.question_scores).length > 0 && !isEditing && (
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {(QUESTIONS[area.id] ?? []).map(q => {
                          const v = current.question_scores[q.id] ?? 0;
                          const pill = v >= 7 ? "bg-green-900/40 text-green-400 border-green-700/50"
                            : v >= 4 ? "bg-yellow-900/40 text-yellow-400 border-yellow-700/50"
                            : "bg-red-900/40 text-red-400 border-red-700/50";
                          return (
                            <span key={q.id} title={q.label}
                              className={`text-xs px-2 py-0.5 rounded-full border ${pill}`}>
                              {q.label.replace("¿","").split("?")[0].trim().slice(0, 20)}: {v}/10
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Eval form */}
                {isEditing && (
                  <div className="border-t border-slate-700/50 bg-slate-900/60 p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">Nueva evaluación — {area.name}</div>
                      {liveScore !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Puntaje calculado:</span>
                          <span className={`text-2xl font-black tabular-nums ${
                            liveScore >= 70 ? "text-green-400" : liveScore >= 40 ? "text-yellow-400" : "text-red-400"
                          }`}>{liveScore}<span className="text-xs text-slate-500">/100</span></span>
                        </div>
                      )}
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                      {(QUESTIONS[area.id] ?? []).map((q, qi) => {
                        const val = liveQs?.[q.id] ?? 5;
                        const qColor = val >= 8 ? "#22c55e" : val >= 5 ? "#eab308" : "#ef4444";
                        return (
                          <div key={q.id} className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2">
                                <span className="text-slate-500 text-sm font-mono mt-0.5 shrink-0">{qi + 1}.</span>
                                <div>
                                  <div className="text-sm text-white font-medium">{q.label}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{q.tip}</div>
                                </div>
                              </div>
                              <div className="text-2xl font-black tabular-nums shrink-0 w-10 text-right" style={{ color: qColor }}>{val}</div>
                            </div>

                            <input type="range" min={0} max={10} step={1} value={val}
                              onChange={e => setQ(area.id, q.id, Number(e.target.value))}
                              className={`w-full h-2 ${area.accent}`} />
                            <div className="flex justify-between text-xs text-slate-600">
                              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                                <span key={n} className={val === n ? "text-white font-bold" : ""}>{n}</span>
                              ))}
                            </div>

                            <div className="flex gap-1.5 flex-wrap">
                              {[
                                { label: "Nunca",       val: 0 },
                                { label: "Casi nunca",  val: 2 },
                                { label: "A veces",     val: 4 },
                                { label: "Frecuente",   val: 6 },
                                { label: "Casi siempre",val: 8 },
                                { label: "Siempre",     val: 10 },
                              ].map(btn => (
                                <button key={btn.val} onClick={() => setQ(area.id, q.id, btn.val)}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    val === btn.val
                                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                                      : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                                  }`}>{btn.label}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Score preview box */}
                    {liveScore !== null && (
                      <div className={`rounded-xl p-4 border ${
                        liveScore >= 70 ? "bg-green-900/20 border-green-500/30"
                        : liveScore >= 40 ? "bg-yellow-900/20 border-yellow-500/30"
                        : "bg-red-900/20 border-red-500/30"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Promedio de {QUESTIONS[area.id]?.length} preguntas × 10</div>
                            <div className="flex gap-2 flex-wrap">
                              {(QUESTIONS[area.id] ?? []).map(q => (
                                <span key={q.id} className="text-xs text-slate-500">{liveQs?.[q.id] ?? 5}</span>
                              ))}
                              <span className="text-xs text-slate-600">→ promedio ×10</span>
                            </div>
                          </div>
                          <div className={`text-4xl font-black tabular-nums ${
                            liveScore >= 70 ? "text-green-400" : liveScore >= 40 ? "text-yellow-400" : "text-red-400"
                          }`}>{liveScore}<span className="text-lg text-slate-500">/100</span></div>
                        </div>
                      </div>
                    )}

                    {/* Target + Notes */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <label className="text-slate-400">Objetivo a 90 días</label>
                          <span className="font-bold text-violet-400">{target90[area.id] ?? 70}/100</span>
                        </div>
                        <input type="range" min={0} max={100} step={5}
                          value={target90[area.id] ?? 70}
                          onChange={e => setTarget90(prev => ({ ...prev, [area.id]: Number(e.target.value) }))}
                          className="w-full accent-violet-500 h-2" />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Notas</label>
                        <textarea value={notesMap[area.id] ?? ""}
                          onChange={e => setNotesMap(prev => ({ ...prev, [area.id]: e.target.value }))}
                          rows={2} placeholder="¿Qué está funcionando? ¿Qué mejorar?"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm" />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => saveEval(area.id)} disabled={saving}
                        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm px-6 py-2.5 rounded-lg font-medium transition-colors">
                        {saving ? "Guardando..." : `Guardar evaluación (${liveScore ?? 0}/100)`}
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: HISTORY
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-6">

          {/* Area selector */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setHistArea(null)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                histArea === null ? "bg-violet-600 border-violet-600 text-white" : "border-slate-700 text-slate-400 hover:text-white"
              }`}>
              Todas las áreas
            </button>
            {LIFE_AREAS.map(area => (
              <button key={area.id} onClick={() => setHistArea(area.id)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${
                  histArea === area.id ? "text-white" : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                }`}
                style={histArea === area.id ? { backgroundColor: area.color + "30", borderColor: area.color + "60", color: area.color } : {}}>
                {area.icon} {area.name.split(" / ")[0]}
                <span className="text-slate-500 font-mono ml-1">({allRecords[area.id]?.length ?? 0})</span>
              </button>
            ))}
          </div>

          {/* ── Life Score trend (all areas) ── */}
          {histArea === null && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">📈 Evolución del Life Score global</h3>

              {/* Build timeline: get all unique dates, compute life score for each */}
              {(() => {
                // Collect all evaluation dates
                const allDates = Array.from(new Set(
                  Object.values(allRecords).flat().map(r => r.evaluated_at.slice(0, 10))
                )).sort();

                if (allDates.length < 2) return (
                  <div className="text-slate-600 text-sm text-center py-8">
                    Necesitas al menos 2 evaluaciones para ver la evolución. Evalúa las áreas periódicamente.
                  </div>
                );

                // For each date, find the most recent score for each area up to that date
                const timeline = allDates.map(date => {
                  let score = 0;
                  LIFE_AREAS.forEach(area => {
                    const recs = (allRecords[area.id] ?? []).filter(r => r.evaluated_at.slice(0, 10) <= date);
                    const s = recs[0]?.score ?? 0;
                    score += (s * area.weight) / 100;
                  });
                  return { date, score: Math.round(score) };
                });

                const maxScore = 100;
                const chartH   = 120;

                return (
                  <div>
                    {/* Mini line chart using SVG */}
                    <div className="w-full overflow-x-auto">
                      <svg width={Math.max(timeline.length * 80, 300)} height={chartH + 40} className="min-w-full">
                        {/* Grid lines */}
                        {[25, 50, 75, 100].map(y => (
                          <g key={y}>
                            <line x1={0} y1={chartH - (y / maxScore) * chartH} x2="100%" y2={chartH - (y / maxScore) * chartH}
                              stroke="#1e293b" strokeWidth={1} />
                            <text x={4} y={chartH - (y / maxScore) * chartH - 3} fill="#475569" fontSize={9}>{y}</text>
                          </g>
                        ))}

                        {/* Area fill */}
                        {timeline.length > 1 && (
                          <polyline
                            fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeLinejoin="round"
                            points={timeline.map((p, i) => `${40 + i * 80},${chartH - (p.score / maxScore) * chartH}`).join(" ")}
                          />
                        )}

                        {/* Data points */}
                        {timeline.map((p, i) => {
                          const x = 40 + i * 80;
                          const y = chartH - (p.score / maxScore) * chartH;
                          const color = p.score >= 70 ? "#22c55e" : p.score >= 40 ? "#eab308" : "#ef4444";
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r={5} fill={color} stroke="#0f172a" strokeWidth={2} />
                              <text x={x} y={y - 10} textAnchor="middle" fill={color} fontSize={10} fontWeight="bold">{p.score}</text>
                              <text x={x} y={chartH + 16} textAnchor="middle" fill="#475569" fontSize={8}>{p.date.slice(5)}</text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Delta */}
                    {timeline.length >= 2 && (() => {
                      const first = timeline[0].score;
                      const last  = timeline[timeline.length - 1].score;
                      const delta = last - first;
                      return (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800">
                          <div className="text-xs text-slate-500">Inicio: <span className="text-white">{first}/100</span></div>
                          <div className="text-xs text-slate-500">→</div>
                          <div className="text-xs text-slate-500">Actual: <span className="text-white">{last}/100</span></div>
                          <div className={`text-xs font-bold ml-auto ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {delta >= 0 ? "+" : ""}{delta} puntos en {timeline.length} evaluaciones
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Per-area history ── */}
          {(histArea !== null ? [LIFE_AREAS.find(a => a.id === histArea)!] : LIFE_AREAS).map(area => {
            const recs = allRecords[area.id] ?? [];
            if (recs.length === 0) return (
              <div key={area.id} className={`border rounded-2xl p-5 ${area.border} ${area.bg}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{area.icon}</span>
                  <span className="font-semibold text-white">{area.name}</span>
                </div>
                <div className="text-slate-600 text-sm">Sin evaluaciones. Usa la pestaña "Evaluación actual" para empezar.</div>
              </div>
            );

            // For chart: reversed (oldest first)
            const chronoRecs = [...recs].reverse();
            const chartH = 80;
            const chartW = Math.max(chronoRecs.length * 70, 200);

            return (
              <div key={area.id} className={`border rounded-2xl overflow-hidden ${area.border} ${area.bg}`}>
                {/* Area header */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{area.icon}</span>
                      <div>
                        <div className="font-semibold text-white">{area.name}</div>
                        <div className="text-xs text-slate-500">{recs.length} evaluación{recs.length !== 1 ? "es" : ""} · Peso: {area.weight}%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black tabular-nums ${area.text}`}>{recs[0].score}/100</div>
                      {recs.length >= 2 && (() => {
                        const delta = recs[0].score - recs[1].score;
                        return (
                          <div className={`text-xs font-medium ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} vs anterior
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Mini sparkline */}
                  {chronoRecs.length >= 2 && (
                    <div className="mb-4 overflow-x-auto">
                      <svg width={chartW} height={chartH + 30} className="min-w-full">
                        {/* Grid */}
                        {[25, 50, 75].map(y => (
                          <line key={y} x1={0} y1={chartH - (y / 100) * chartH} x2={chartW} y2={chartH - (y / 100) * chartH}
                            stroke="#1e293b" strokeWidth={1} />
                        ))}

                        {/* Line */}
                        <polyline fill="none" stroke={area.color} strokeWidth={2} strokeLinejoin="round"
                          points={chronoRecs.map((r, i) => `${35 + i * 70},${chartH - (r.score / 100) * chartH}`).join(" ")} />

                        {/* Points */}
                        {chronoRecs.map((r, i) => {
                          const x = 35 + i * 70;
                          const y = chartH - (r.score / 100) * chartH;
                          return (
                            <g key={r.id}>
                              <circle cx={x} cy={y} r={4} fill={area.color} stroke="#0f172a" strokeWidth={2} />
                              <text x={x} y={y - 8} textAnchor="middle" fill={area.color} fontSize={9} fontWeight="bold">{r.score}</text>
                              <text x={x} y={chartH + 16} textAnchor="middle" fill="#475569" fontSize={7}>{r.evaluated_at.slice(5, 10)}</text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </div>

                {/* Record list */}
                <div className="border-t border-slate-700/40">
                  {recs.map((rec, idx) => {
                    const prev     = recs[idx + 1];
                    const delta    = prev ? rec.score - prev.score : null;
                    const isFirst  = idx === 0;

                    return (
                      <div key={rec.id} className={`px-5 py-4 flex items-start gap-4 ${idx > 0 ? "border-t border-slate-800/60" : ""} ${isFirst ? "bg-slate-800/20" : ""}`}>
                        {/* Score badge */}
                        <div className="text-center shrink-0 w-16">
                          <div className={`text-xl font-black tabular-nums ${
                            rec.score >= 70 ? "text-green-400" : rec.score >= 40 ? "text-yellow-400" : "text-red-400"
                          }`}>{rec.score}</div>
                          <div className="text-xs text-slate-600">/100</div>
                          {delta !== null && (
                            <div className={`text-xs font-medium mt-0.5 ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-slate-500"}`}>
                              {delta > 0 ? "▲" : delta < 0 ? "▼" : "="}{Math.abs(delta)}
                            </div>
                          )}
                          {isFirst && <div className="text-xs text-violet-400 mt-0.5">Actual</div>}
                        </div>

                        {/* Detail */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-slate-400">{fmtDate(rec.evaluated_at)}</div>
                            {rec.target_90d > 0 && (
                              <div className="text-xs text-slate-500">
                                Meta 90d: <span className={rec.score >= rec.target_90d ? "text-green-400" : "text-yellow-400"}>{rec.target_90d}/100</span>
                              </div>
                            )}
                          </div>

                          {/* Question scores */}
                          {Object.keys(rec.question_scores).length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mb-2">
                              {(QUESTIONS[area.id] ?? []).map(q => {
                                const v = rec.question_scores[q.id] ?? null;
                                if (v === null) return null;
                                const prev_v = prev?.question_scores?.[q.id] ?? null;
                                const diff = prev_v !== null ? v - prev_v : null;
                                const pill = v >= 7 ? "bg-green-900/40 text-green-400 border-green-700/50"
                                  : v >= 4 ? "bg-yellow-900/40 text-yellow-400 border-yellow-700/50"
                                  : "bg-red-900/40 text-red-400 border-red-700/50";
                                return (
                                  <span key={q.id} title={q.label}
                                    className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${pill}`}>
                                    {q.label.replace("¿","").split("?")[0].trim().slice(0, 15)}: {v}
                                    {diff !== null && diff !== 0 && (
                                      <span className={diff > 0 ? "text-green-300" : "text-red-300"}>
                                        {diff > 0 ? "▲" : "▼"}{Math.abs(diff)}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {rec.notes && <div className="text-xs text-slate-400 italic">💬 {rec.notes}</div>}
                        </div>

                        {/* Delete */}
                        <button onClick={() => deleteRecord(rec.id)}
                          className="text-slate-700 hover:text-red-400 text-xs transition-colors shrink-0 mt-0.5">
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
