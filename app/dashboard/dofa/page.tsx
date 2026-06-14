"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
type SwotType     = "strength" | "weakness" | "opportunity" | "threat";
type StrategyType = "FO" | "DO" | "FA" | "DA";

interface SwotItem {
  id: string;
  type: SwotType | StrategyType;
  content: string;
  source: "manual" | "ai";
  created_at: string;
}

interface AiDofaResult {
  strengths:     string[];
  weaknesses:    string[];
  opportunities: string[];
  threats:       string[];
  strategies:    Record<StrategyType, string>;
}

interface DiagnosticSummary {
  lifeScore:      number;
  areasEvaluated: number;
}

// ── Static UI config ───────────────────────────────────────────────────────────
const QUADRANTS: {
  type:   SwotType;
  label:  string;
  icon:   string;
  color:  string;
  bg:     string;
  border: string;
  desc:   string;
  placeholder: string;
}[] = [
  {
    type: "strength", label: "Fortalezas", icon: "💪",
    color: "text-green-400", bg: "bg-green-950/20", border: "border-green-500/40",
    desc: "Lo que haces bien, ventajas y recursos actuales",
    placeholder: "Ej: Disciplina financiera y alta tasa de ahorro...",
  },
  {
    type: "weakness", label: "Debilidades", icon: "⚠️",
    color: "text-red-400", bg: "bg-red-950/20", border: "border-red-500/40",
    desc: "Áreas de mejora y limitaciones actuales",
    placeholder: "Ej: Foco disperso entre múltiples proyectos...",
  },
  {
    type: "opportunity", label: "Oportunidades", icon: "🌱",
    color: "text-blue-400", bg: "bg-blue-950/20", border: "border-blue-500/40",
    desc: "Tendencias externas que puedes aprovechar",
    placeholder: "Ej: Boom de IA para automatizar operaciones...",
  },
  {
    type: "threat", label: "Amenazas", icon: "🚨",
    color: "text-yellow-400", bg: "bg-yellow-950/20", border: "border-yellow-500/40",
    desc: "Riesgos externos o internos a mitigar",
    placeholder: "Ej: Dependencia de ingreso activo único...",
  },
];

const STRAT_CONFIG: {
  type:  StrategyType;
  label: string;
  logic: string;
  color: string;
  icon:  string;
  desc:  string;
}[] = [
  { type: "FO", label: "FO — Crecer",        logic: "Fortaleza + Oportunidad", color: "border-green-500/30  bg-green-950/20",  icon: "🚀", desc: "Usa tus fortalezas para capturar oportunidades" },
  { type: "DO", label: "DO — Mejorar",       logic: "Debilidad + Oportunidad", color: "border-blue-500/30   bg-blue-950/20",   icon: "🔧", desc: "Corrige debilidades para capturar oportunidades" },
  { type: "FA", label: "FA — Defender",      logic: "Fortaleza + Amenaza",     color: "border-yellow-500/30 bg-yellow-950/20", icon: "🛡️", desc: "Usa fortalezas para neutralizar amenazas" },
  { type: "DA", label: "DA — Evitar riesgo", logic: "Debilidad + Amenaza",     color: "border-red-500/30    bg-red-950/20",    icon: "⚠️", desc: "Reduce debilidades para evitar riesgos críticos" },
];

const AREA_LABELS: Record<number, { name: string; icon: string }> = {
  1: { name: "Salud / Bienestar",           icon: "💚" },
  2: { name: "Finanzas / Inversiones",      icon: "💰" },
  3: { name: "Carrera / Negocios",          icon: "🔵" },
  4: { name: "Relaciones / Redes",          icon: "🟣" },
  5: { name: "Espiritualidad / Propósito",  icon: "🟠" },
  6: { name: "Aprendizaje / Crecimiento",   icon: "📘" },
  7: { name: "Impacto / Legado",            icon: "❤️"  },
};

const AREA_WEIGHTS: Record<number, number> = { 1:25, 2:25, 3:20, 4:10, 5:10, 6:5, 7:5 };

// ── Component ──────────────────────────────────────────────────────────────────
export default function DofaPage() {
  // DB data
  const [items,      setItems]      = useState<Record<SwotType, SwotItem[]>>({
    strength: [], weakness: [], opportunity: [], threat: [],
  });
  const [strategies, setStrategies] = useState<Record<StrategyType, SwotItem[]>>({
    FO: [], DO: [], FA: [], DA: [],
  });

  // Diagnostic
  const [diagScores,  setDiagScores]  = useState<{ area_id: number; score: number }[]>([]);
  const [diagSummary, setDiagSummary] = useState<DiagnosticSummary | null>(null);

  // AI preview
  const [preview,      setPreview]      = useState<AiDofaResult | null>(null);
  const [pendingItems, setPendingItems] = useState<Partial<Record<SwotType, string[]>>>({});
  const [pendingStrats,setPendingStrats]= useState<Partial<Record<StrategyType, string[]>>>({});

  // Edit state
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [newTexts,       setNewTexts]       = useState<Record<string, string>>({});

  // AI state
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState<string | null>(null);
  const [lastGen,    setLastGen]    = useState<string | null>(null);

  // Scorecard actuals (session only — persisted via weekly_scorecards separately)
  const [actuals, setActuals] = useState<Record<number, string>>({});

  // UI
  const [activeTab,     setActiveTab]     = useState<"diagnostic" | "dofa" | "strategies" | "scorecard">("diagnostic");
  const [expandedStrat, setExpandedStrat] = useState<StrategyType | null>("FO");
  const [saving,        setSaving]        = useState(false);

  const supabase = createClient();

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: swotData }, { data: scoreData }] = await Promise.all([
      supabase.from("swot_items").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("diagnostic_scores").select("life_area_id, score, evaluated_at").eq("user_id", user.id).order("evaluated_at", { ascending: false }),
    ]);

    // Parse SWOT
    if (swotData) {
      const g: Record<SwotType, SwotItem[]> = { strength: [], weakness: [], opportunity: [], threat: [] };
      const s: Record<StrategyType, SwotItem[]> = { FO: [], DO: [], FA: [], DA: [] };
      swotData.forEach((row: any) => {
        if (["FO","DO","FA","DA"].includes(row.type)) {
          s[row.type as StrategyType].push(row);
          if (row.source === "ai") setLastGen(row.created_at);
        } else if (g[row.type as SwotType]) {
          g[row.type as SwotType].push(row);
        }
      });
      setItems(g);
      setStrategies(s);
    }

    // Parse diagnostic — latest per area
    if (scoreData) {
      const latest: Record<number, number> = {};
      scoreData.forEach((row: any) => { if (!latest[row.life_area_id]) latest[row.life_area_id] = row.score; });
      const scores = Object.entries(latest).map(([id, score]) => ({ area_id: Number(id), score }));
      setDiagScores(scores);
      const lifeScore = Math.round(scores.reduce((acc, s) => acc + (s.score * (AREA_WEIGHTS[s.area_id] ?? 0)) / 100, 0));
      setDiagSummary({ lifeScore, areasEvaluated: scores.length });
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Manual CRUD ───────────────────────────────────────────────────────────────
  async function addItem(type: SwotType | StrategyType) {
    const content = newTexts[type]?.trim();
    if (!content) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("swot_items").insert({ user_id: user.id, type, content, source: "manual" }).select().single();
    if (data) {
      if (["FO","DO","FA","DA"].includes(type)) {
        setStrategies(prev => ({ ...prev, [type]: [...prev[type as StrategyType], data] }));
      } else {
        setItems(prev => ({ ...prev, [type]: [...prev[type as SwotType], data] }));
      }
      setNewTexts(prev => ({ ...prev, [type]: "" }));
    }
  }

  async function updateItem(id: string) {
    if (!editingContent.trim()) return;
    await supabase.from("swot_items").update({ content: editingContent }).eq("id", id);
    const upd = (arr: SwotItem[]) => arr.map(i => i.id === id ? { ...i, content: editingContent } : i);
    setItems(prev => ({ strength: upd(prev.strength), weakness: upd(prev.weakness), opportunity: upd(prev.opportunity), threat: upd(prev.threat) }));
    setStrategies(prev => ({ FO: upd(prev.FO), DO: upd(prev.DO), FA: upd(prev.FA), DA: upd(prev.DA) }));
    setEditingId(null); setEditingContent("");
  }

  async function deleteItem(id: string, type: SwotType | StrategyType) {
    if (!confirm("¿Eliminar este ítem?")) return;
    await supabase.from("swot_items").delete().eq("id", id);
    if (["FO","DO","FA","DA"].includes(type)) {
      setStrategies(prev => ({ ...prev, [type]: prev[type as StrategyType].filter(i => i.id !== id) }));
    } else {
      setItems(prev => ({ ...prev, [type]: prev[type as SwotType].filter(i => i.id !== id) }));
    }
  }

  // ── AI generation ─────────────────────────────────────────────────────────────
  async function generateWithAI() {
    setAiLoading(true); setAiError(null); setPreview(null);
    try {
      const res  = await fetch("/api/ai/generate-dofa", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error generando DOFA");
      setPreview(json.dofa);
      setPendingItems({
        strength:    [...json.dofa.strengths],
        weakness:    [...json.dofa.weaknesses],
        opportunity: [...json.dofa.opportunities],
        threat:      [...json.dofa.threats],
      });
      setPendingStrats({
        FO: json.dofa.strategies.FO ? [json.dofa.strategies.FO] : [],
        DO: json.dofa.strategies.DO ? [json.dofa.strategies.DO] : [],
        FA: json.dofa.strategies.FA ? [json.dofa.strategies.FA] : [],
        DA: json.dofa.strategies.DA ? [json.dofa.strategies.DA] : [],
      });
      setActiveTab("dofa");
    } catch (err: any) {
      setAiError(err.message ?? "Error desconocido");
    } finally {
      setAiLoading(false);
    }
  }

  async function saveAiPreview() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete old AI items
    const allAiIds = [
      ...Object.values(items).flat(),
      ...Object.values(strategies).flat(),
    ].filter(i => i.source === "ai").map(i => i.id);
    if (allAiIds.length > 0) await supabase.from("swot_items").delete().in("id", allAiIds);

    const now = new Date().toISOString();
    const rows: any[] = [];
    QUADRANTS.forEach(q => {
      (pendingItems[q.type] ?? []).filter(c => c.trim()).forEach(content =>
        rows.push({ user_id: user.id, type: q.type, content, source: "ai", week_date: now })
      );
    });
    (["FO","DO","FA","DA"] as StrategyType[]).forEach(t => {
      (pendingStrats[t] ?? []).filter(c => c.trim()).forEach(content =>
        rows.push({ user_id: user.id, type: t, content, source: "ai", week_date: now })
      );
    });
    if (rows.length > 0) await supabase.from("swot_items").insert(rows);

    setPreview(null); setPendingItems({}); setPendingStrats({});
    setLastGen(now); setSaving(false);
    load();
  }

  // ── Scorecard helper ──────────────────────────────────────────────────────────
  const SCORECARD_ROWS = [
    { label: "Proyectos activos",         rule: "≤" as const, target: 3  },
    { label: "Tareas completadas",        rule: "≥" as const, target: 10 },
    { label: "Conversaciones de valor",   rule: "≥" as const, target: 5  },
    { label: "Deep work (horas)",         rule: "≥" as const, target: 10 },
    { label: "Entrenamiento (sesiones)",  rule: "≥" as const, target: 4  },
    { label: "Meditación / oración",      rule: "≥" as const, target: 7  },
    { label: "Revisión semanal",          rule: "≥" as const, target: 1  },
    { label: "Sueño promedio (horas)",    rule: "≥" as const, target: 7  },
    { label: "Lectura / estudio (días)",  rule: "≥" as const, target: 5  },
    { label: "Ahorro / inversión ($)",    rule: "≥" as const, target: 100 },
  ];

  function scorePct(rule: "≤"|"≥", target: number, raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v)) return null;
    return rule === "≤"
      ? Math.min(Math.round((target / Math.max(v, 0.01)) * 100), 120)
      : Math.min(Math.round((v / target) * 100), 120);
  }

  const totalSwot = Object.values(items).flat().length;
  const totalStrats = Object.values(strategies).flat().length;

  return (
    <div className="space-y-6">

      {/* ── HEADER ────────────────────────────────────────────────────────────*/}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">DOFA Estratégico</h2>
          <p className="text-slate-400 text-sm mt-1">
            Análisis dinámico generado desde tu diagnóstico. Actualizar cada domingo.
          </p>
          {lastGen && !preview && (
            <p className="text-xs text-slate-600 mt-0.5">
              Última generación IA: {new Date(lastGen).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <button
          onClick={generateWithAI}
          disabled={aiLoading || diagScores.length === 0}
          title={diagScores.length === 0 ? "Completa el diagnóstico primero" : "Generar DOFA con IA"}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm shrink-0"
        >
          {aiLoading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Analizando...</>
            : <>🤖 Generar con IA</>}
        </button>
      </div>

      {/* ── AI ERROR ──────────────────────────────────────────────────────────*/}
      {aiError && (
        <div className="bg-red-900/30 border border-red-700/60 rounded-xl px-4 py-3 text-sm text-red-300 flex gap-3 items-start">
          <span className="shrink-0">❌</span>
          <div>
            <strong className="text-red-200">Error:</strong> {aiError}
            {aiError.includes("diagnóstico") && (
              <button onClick={() => setActiveTab("diagnostic")} className="block mt-1.5 text-xs text-violet-400 underline">
                → Ver estado del diagnóstico
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── AI PREVIEW BANNER ─────────────────────────────────────────────────*/}
      {preview && (
        <div className="bg-violet-900/30 border border-violet-500/50 rounded-xl px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-white font-semibold text-sm">✨ DOFA generado con IA desde tu diagnóstico</div>
            <div className="text-violet-300 text-xs mt-1">
              Edita los ítems antes de guardar. Los ítems manuales no se modifican.
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setPreview(null); setPendingItems({}); setPendingStrats({}); }}
              className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700 transition-colors"
            >Descartar</button>
            <button
              onClick={saveAiPreview}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors"
            >{saving ? "Guardando..." : "✅ Guardar DOFA"}</button>
          </div>
        </div>
      )}

      {/* ── TABS ──────────────────────────────────────────────────────────────*/}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {([
          ["diagnostic", `🔍 Diagnóstico (${diagScores.length}/7)`],
          ["dofa",       `📊 Análisis${preview ? " (preview)" : ` (${totalSwot})`}`],
          ["strategies", `⚡ Estrategias (${totalStrats})`],
          ["scorecard",  "📋 Scorecard"],
        ] as [typeof activeTab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >{label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: DIAGNÓSTICO
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "diagnostic" && (
        <div className="space-y-4">
          {/* Summary card */}
          {diagSummary ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold text-white">Estado del diagnóstico</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    La IA analiza estos datos para generar un DOFA personalizado
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-black tabular-nums ${
                    diagSummary.lifeScore >= 70 ? "text-green-400"
                    : diagSummary.lifeScore >= 40 ? "text-yellow-400"
                    : "text-red-400"
                  }`}>{diagSummary.lifeScore}</div>
                  <div className="text-xs text-slate-500">Life Score</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Áreas evaluadas</span>
                  <span>{diagSummary.areasEvaluated} / 7</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${(diagSummary.areasEvaluated / 7) * 100}%` }}
                  />
                </div>
                {diagSummary.areasEvaluated < 7 ? (
                  <p className="text-xs text-yellow-400 pt-0.5">
                    ⚠️ Evalúa las {7 - diagSummary.areasEvaluated} áreas restantes para un DOFA más preciso.{" "}
                    <a href="/areas" className="underline hover:text-yellow-300">Ir al diagnóstico →</a>
                  </p>
                ) : (
                  <p className="text-xs text-green-400 pt-0.5">
                    ✅ Diagnóstico completo. La IA tiene todos los datos necesarios.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-5xl mb-4">📊</div>
              <div className="text-lg font-medium text-slate-400 mb-2">Sin diagnóstico todavía</div>
              <p className="text-slate-500 text-sm max-w-xs mx-auto mb-5">
                Evalúa tus áreas de vida para que la IA pueda analizar tu situación y generar un DOFA personalizado.
              </p>
              <a href="/areas" className="inline-block bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Ir al Diagnóstico →
              </a>
            </div>
          )}

          {/* Area list */}
          {diagScores.length > 0 && (
            <div className="space-y-2">
              {Object.entries(AREA_LABELS).map(([idStr, area]) => {
                const areaId = Number(idStr);
                const found  = diagScores.find(s => s.area_id === areaId);
                const score  = found?.score ?? null;
                return (
                  <div key={areaId} className={`flex items-center gap-4 bg-slate-900 border rounded-xl px-5 py-3.5 transition-opacity ${!found ? "border-slate-800 opacity-50" : "border-slate-700"}`}>
                    <span className="text-xl shrink-0">{area.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{area.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">Peso: {AREA_WEIGHTS[areaId]}%</span>
                          {score !== null ? (
                            <span className={`text-base font-black tabular-nums ${
                              score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400"
                            }`}>{score}<span className="text-xs text-slate-500 font-normal">/100</span></span>
                          ) : (
                            <span className="text-xs text-slate-600 italic">Sin evaluar</span>
                          )}
                        </div>
                      </div>
                      {score !== null && (
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${score}%`,
                            backgroundColor: score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444"
                          }} />
                        </div>
                      )}
                    </div>
                    {score !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                        score >= 70 ? "bg-green-900/30 border-green-500/30 text-green-400"
                        : score >= 40 ? "bg-yellow-900/30 border-yellow-500/30 text-yellow-400"
                        : "bg-red-900/30 border-red-500/30 text-red-400"
                      }`}>{score >= 70 ? "Fuerte" : score >= 40 ? "Medio" : "Débil"}</span>
                    )}
                    {!found && (
                      <a href="/areas" className="text-xs text-violet-400 hover:text-violet-300 underline shrink-0">Evaluar →</a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Generate CTA */}
          {diagScores.length > 0 && (
            <button
              onClick={generateWithAI}
              disabled={aiLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {aiLoading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando DOFA...</>
                : <>🤖 Generar DOFA automáticamente desde este diagnóstico</>}
            </button>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: ANÁLISIS DOFA
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "dofa" && (
        <div className="grid grid-cols-2 gap-4">
          {QUADRANTS.map(({ type, label, icon, color, bg, border, desc, placeholder }) => {
            const dbItems   = items[type];
            const isPreview = !!preview;
            const dispItems: string[] = isPreview
              ? (pendingItems[type] ?? [])
              : dbItems.map(i => i.content);

            return (
              <div key={type} className={`border rounded-2xl overflow-hidden ${border} ${bg}`}>
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <span className="font-bold text-white">{label}</span>
                    </div>
                    <span className={`text-xs font-medium ${color}`}>{dispItems.length}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{desc}</p>

                  {/* Items */}
                  <ul className="space-y-1.5 mb-3 min-h-[80px]">
                    {dispItems.map((content, idx) => {
                      const dbItem = !isPreview ? dbItems[idx] : null;
                      const iid    = dbItem?.id ?? `p-${type}-${idx}`;
                      const isAI   = dbItem?.source === "ai";

                      return (
                        <li key={iid} className="group flex items-start gap-2 bg-slate-800/50 hover:bg-slate-800/80 rounded-lg px-3 py-2 transition-colors">
                          <span className={`text-xs font-mono mt-0.5 shrink-0 opacity-40 ${color}`}>{String(idx+1).padStart(2,"0")}</span>

                          {editingId === iid ? (
                            <div className="flex-1 flex gap-2">
                              <input value={editingContent} onChange={e => setEditingContent(e.target.value)}
                                onKeyDown={e => { if (e.key==="Enter") updateItem(iid); if (e.key==="Escape") setEditingId(null); }}
                                className="flex-1 bg-slate-700 border border-violet-500 rounded px-2 py-0.5 text-white text-sm focus:outline-none" autoFocus />
                              <button onClick={() => updateItem(iid)} className="text-green-400 text-xs">✓</button>
                              <button onClick={() => setEditingId(null)} className="text-slate-400 text-xs">✕</button>
                            </div>
                          ) : isPreview ? (
                            <div className="flex-1 flex gap-1">
                              <input value={content}
                                onChange={e => {
                                  const arr = [...(pendingItems[type] ?? [])];
                                  arr[idx] = e.target.value;
                                  setPendingItems(p => ({ ...p, [type]: arr }));
                                }}
                                className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none focus:text-white min-w-0"
                              />
                              <button onClick={() => setPendingItems(p => ({ ...p, [type]: (p[type]??[]).filter((_,i)=>i!==idx) }))}
                                className="text-slate-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 shrink-0">✕</button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-start justify-between gap-1 min-w-0">
                              <span className="text-sm text-slate-200 leading-snug">{content}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                                {isAI && <span className="text-xs text-violet-400 bg-violet-900/30 px-1 rounded">IA</span>}
                                <button onClick={() => { setEditingId(iid); setEditingContent(content); }} className="text-slate-500 hover:text-blue-400 text-xs">✎</button>
                                <button onClick={() => deleteItem(iid, type)} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}

                    {dispItems.length === 0 && (
                      <li className="text-slate-600 text-sm italic text-center py-6">
                        {isPreview ? "Sin ítems generados" : "Agrega ítems o genera con IA"}
                      </li>
                    )}
                  </ul>

                  {/* Add */}
                  {isPreview ? (
                    <button
                      onClick={() => setPendingItems(p => ({ ...p, [type]: [...(p[type]??[]), ""] }))}
                      className="w-full text-xs text-slate-600 hover:text-slate-400 border border-dashed border-slate-700 hover:border-slate-600 rounded-lg py-2 transition-colors"
                    >+ Agregar ítem</button>
                  ) : (
                    <div className="flex gap-2">
                      <input value={newTexts[type] ?? ""}
                        onChange={e => setNewTexts(p => ({ ...p, [type]: e.target.value }))}
                        onKeyDown={e => { if (e.key==="Enter") addItem(type); }}
                        placeholder={placeholder}
                        className="flex-1 bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                      />
                      <button onClick={() => addItem(type)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg text-sm transition-colors">+</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: ESTRATEGIAS
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "strategies" && (
        <div className="space-y-3">
          {preview && (
            <div className="bg-slate-800/50 border border-violet-500/30 rounded-xl px-4 py-3 text-sm text-violet-300">
              ✨ Revisa las estrategias generadas por IA y edítalas antes de guardar.
            </div>
          )}

          {STRAT_CONFIG.map(({ type, label, logic, color, icon, desc }) => {
            const dbItems   = strategies[type];
            const isPreview = !!preview;
            const dispItems: string[] = isPreview
              ? (pendingStrats[type] ?? [])
              : dbItems.map(s => s.content);
            const isExpanded = expandedStrat === type;

            return (
              <div key={type} className={`border rounded-2xl overflow-hidden ${color}`}>
                <button
                  onClick={() => setExpandedStrat(isExpanded ? null : type)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <div className="font-bold text-white">{label}</div>
                      <div className="text-xs text-slate-500">{logic} · {desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{dispItems.length} acción{dispItems.length !== 1 ? "es" : ""}</span>
                    <span className="text-slate-500">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/40 px-5 py-4 space-y-2">
                    {dispItems.map((content, idx) => {
                      const dbItem = !isPreview ? dbItems[idx] : null;
                      const iid    = dbItem?.id ?? `ps-${type}-${idx}`;

                      return (
                        <div key={iid} className="group flex items-start gap-2 bg-slate-800/40 hover:bg-slate-800/70 rounded-lg px-4 py-3 transition-colors">
                          <span className="text-xs text-slate-600 font-mono mt-0.5 shrink-0">{String(idx+1).padStart(2,"0")}</span>

                          {editingId === iid ? (
                            <div className="flex-1 flex gap-2">
                              <input value={editingContent} onChange={e => setEditingContent(e.target.value)}
                                onKeyDown={e => { if (e.key==="Enter") updateItem(iid); if (e.key==="Escape") setEditingId(null); }}
                                className="flex-1 bg-slate-700 border border-violet-500 rounded px-2 py-1 text-white text-sm focus:outline-none" autoFocus />
                              <button onClick={() => updateItem(iid)} className="text-green-400 text-xs">✓</button>
                              <button onClick={() => setEditingId(null)} className="text-slate-400 text-xs">✕</button>
                            </div>
                          ) : isPreview ? (
                            <div className="flex-1 flex gap-1">
                              <input value={content}
                                onChange={e => {
                                  const arr = [...(pendingStrats[type] ?? [])];
                                  arr[idx] = e.target.value;
                                  setPendingStrats(p => ({ ...p, [type]: arr }));
                                }}
                                className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none"
                              />
                              <button onClick={() => setPendingStrats(p => ({ ...p, [type]: (p[type]??[]).filter((_,i)=>i!==idx) }))}
                                className="text-slate-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 shrink-0">✕</button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-start justify-between gap-2">
                              <span className="text-sm text-slate-200 leading-snug">{content}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {dbItem?.source === "ai" && <span className="text-xs text-violet-400">IA</span>}
                                <button onClick={() => { setEditingId(iid); setEditingContent(content); }} className="text-slate-500 hover:text-blue-400 text-xs">✎</button>
                                <button onClick={() => deleteItem(iid, type)} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {dispItems.length === 0 && (
                      <div className="text-slate-600 text-sm italic text-center py-4">Sin estrategias aún</div>
                    )}

                    {isPreview ? (
                      <button
                        onClick={() => setPendingStrats(p => ({ ...p, [type]: [...(p[type]??[]), ""] }))}
                        className="w-full text-xs text-slate-600 hover:text-slate-400 border border-dashed border-slate-700 rounded-lg py-2 mt-1 transition-colors"
                      >+ Agregar acción</button>
                    ) : (
                      <div className="flex gap-2 mt-1">
                        <input value={newTexts[type] ?? ""}
                          onChange={e => setNewTexts(p => ({ ...p, [type]: e.target.value }))}
                          onKeyDown={e => { if (e.key==="Enter") addItem(type); }}
                          placeholder="Agregar acción estratégica..."
                          className="flex-1 bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                        />
                        <button onClick={() => addItem(type)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg text-sm transition-colors">+</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: SCORECARD
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "scorecard" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Scorecard Semanal</div>
                <div className="text-xs text-slate-500 mt-0.5">Actualiza cada domingo · Ingresa tus resultados de la semana</div>
              </div>
              <button onClick={() => setActuals({})} className="text-xs text-slate-600 hover:text-slate-400 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors">
                Limpiar semana
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {SCORECARD_ROWS.map((row, i) => {
                const raw = actuals[i] ?? "";
                const pct = scorePct(row.rule, row.target, raw);
                const ok  = pct !== null && (row.rule === "≤" ? parseFloat(raw) <= row.target : parseFloat(raw) >= row.target);
                const barColor = ok ? "bg-green-500" : pct !== null && pct >= 70 ? "bg-yellow-500" : "bg-red-500";

                return (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium">{row.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Regla: <span className="text-slate-300">{row.rule} {row.target}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number" step="0.5" min="0" value={raw}
                          onChange={e => setActuals(p => ({ ...p, [i]: e.target.value }))}
                          placeholder="—"
                          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-violet-500 tabular-nums"
                        />
                        {pct !== null && (
                          <>
                            <span className={`text-sm font-bold w-12 text-right tabular-nums ${ok ? "text-green-400" : pct >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                              {Math.min(pct, 100)}%
                            </span>
                            <span>{ok ? "🟢" : pct >= 70 ? "🟡" : "🔴"}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {pct !== null && (
                      <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary footer */}
            <div className="px-5 py-4 bg-slate-800/30 border-t border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {(() => {
                    const filled = SCORECARD_ROWS.filter((_, i) => actuals[i] !== undefined && actuals[i] !== "").length;
                    const green  = SCORECARD_ROWS.filter((row, i) => {
                      const v = parseFloat(actuals[i] ?? "");
                      if (isNaN(v)) return false;
                      return row.rule === "≤" ? v <= row.target : v >= row.target;
                    }).length;
                    if (filled === 0) return "Ingresa tus métricas de la semana";
                    const pctGreen = Math.round((green / filled) * 100);
                    return `${green} / ${filled} indicadores en verde (${pctGreen}%)`;
                  })()}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{SCORECARD_ROWS.length} indicadores totales</div>
              </div>
              {Object.keys(actuals).length > 0 && (
                <div className={`text-2xl font-black tabular-nums ${
                  (() => {
                    const filled = SCORECARD_ROWS.filter((_, i) => actuals[i] !== undefined && actuals[i] !== "").length;
                    const green  = SCORECARD_ROWS.filter((row, i) => {
                      const v = parseFloat(actuals[i] ?? "");
                      if (isNaN(v)) return false;
                      return row.rule === "≤" ? v <= row.target : v >= row.target;
                    }).length;
                    if (filled === 0) return "text-slate-500";
                    const p = Math.round((green / filled) * 100);
                    return p >= 80 ? "text-green-400" : p >= 60 ? "text-yellow-400" : "text-red-400";
                  })()
                }`}>
                  {(() => {
                    const filled = SCORECARD_ROWS.filter((_, i) => actuals[i] !== undefined && actuals[i] !== "").length;
                    const green  = SCORECARD_ROWS.filter((row, i) => {
                      const v = parseFloat(actuals[i] ?? "");
                      if (isNaN(v)) return false;
                      return row.rule === "≤" ? v <= row.target : v >= row.target;
                    }).length;
                    if (filled === 0) return "—";
                    return Math.round((green / filled) * 100) + "%";
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-violet-500/20 rounded-xl px-5 py-4 text-sm text-slate-400">
            <span className="text-violet-400 font-medium">💡 Tip:</span> Este scorecard es de sesión. Para guardar tus métricas semanales permanentemente, usa el módulo de <strong className="text-white">Revisión Semanal</strong> en el Dashboard principal.
          </div>
        </div>
      )}
    </div>
  );
}
