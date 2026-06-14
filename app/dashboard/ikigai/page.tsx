"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ── AI-guided questions for each quadrant ─────────────────────────────────────
// Each question asks something concrete → AI extracts the ikigai item from the answer
const GUIDED_QUESTIONS: Record<string, { question: string; example: string; followUp: string }[]> = {
  what_you_love: [
    {
      question: "¿Qué actividad harías aunque nadie te pagara y perdieras la noción del tiempo haciéndola?",
      example: "Ej: Diseñar sistemas, enseñar conceptos financieros, entrenar...",
      followUp: "¿Qué te genera esa sensación de flujo y por qué te apasiona tanto?",
    },
    {
      question: "Cuando tienes un día libre sin obligaciones, ¿a qué te dedicas naturalmente?",
      example: "Ej: Leo sobre inversiones, construyo proyectos, hablo con personas...",
      followUp: "¿Qué dice eso sobre lo que realmente valoras?",
    },
    {
      question: "¿Qué temas te llevan a buscar más y más información sin que nadie te lo pida?",
      example: "Ej: Bienes raíces, inteligencia artificial, liderazgo, espiritualidad...",
      followUp: "¿Por qué crees que ese tema te engancha tanto?",
    },
    {
      question: "¿Qué actividad te da energía en lugar de quitártela, incluso cuando es difícil?",
      example: "Ej: Resolver problemas complejos, hablar en público, crear estrategias...",
      followUp: "¿Cuándo fue la última vez que la hiciste y cómo te sentiste?",
    },
  ],
  what_you_are_good_at: [
    {
      question: "¿Qué te piden ayuda los demás con más frecuencia, aunque para ti sea 'fácil'?",
      example: "Ej: Analizar datos, organizar ideas, motivar personas, tomar decisiones...",
      followUp: "¿Qué hace que seas bueno en eso según las personas que te conocen?",
    },
    {
      question: "¿En qué actividad mejoras rápido comparado con otras personas?",
      example: "Ej: Aprender tecnologías nuevas, negociar, entender conceptos financieros...",
      followUp: "¿Qué habilidad o talento natural crees que está detrás de eso?",
    },
    {
      question: "¿Qué logros o resultados has conseguido que te sorprenden incluso a ti?",
      example: "Ej: Construí un sistema complejo, ayudé a alguien a cambiar su vida, aprendí X en semanas...",
      followUp: "¿Qué capacidad tuya hizo posible ese resultado?",
    },
    {
      question: "Si tuvieras que enseñar algo a alguien desde cero, ¿en qué área serías el mejor profesor?",
      example: "Ej: Finanzas personales, productividad, fitness, programación, marketing...",
      followUp: "¿Cuánto tiempo llevas desarrollando esa habilidad?",
    },
  ],
  what_world_needs: [
    {
      question: "¿Qué problema del mundo o de tu entorno cercano te molesta tanto que piensas 'alguien debería hacer algo al respecto'?",
      example: "Ej: Falta de educación financiera, desigualdad, personas sin propósito...",
      followUp: "¿Por qué ese problema te afecta personalmente?",
    },
    {
      question: "¿Qué le falta a las personas de tu comunidad o industria que tú podrías ofrecer?",
      example: "Ej: Claridad estratégica, acceso a capital, sistemas de productividad...",
      followUp: "¿Quiénes son esas personas y qué tan urgente es esa necesidad?",
    },
    {
      question: "¿Qué cambio en el mundo te gustaría poder decir que ayudaste a crear antes de morir?",
      example: "Ej: Que más personas alcancen libertad financiera, que la educación sea accesible...",
      followUp: "¿Por qué ese cambio importa tanto para ti?",
    },
    {
      question: "¿Para qué tipo de personas sientes que naciste para servir o ayudar?",
      example: "Ej: Emprendedores, jóvenes en escasez, inmigrantes, familias de clase media...",
      followUp: "¿Qué necesitan esas personas que tú podrías darles?",
    },
  ],
  what_you_can_be_paid_for: [
    {
      question: "¿Por qué habilidad o servicio te han pagado alguna vez, o estarían dispuestos a pagarte?",
      example: "Ej: Consultoría, análisis de inversiones, desarrollo de software, coaching...",
      followUp: "¿Cuánto crees que vale eso en el mercado hoy?",
    },
    {
      question: "¿Qué problema puedes resolver para alguien que estaría dispuesto a pagar por la solución?",
      example: "Ej: Generar más ingresos, ahorrar tiempo, reducir riesgo, crecer su negocio...",
      followUp: "¿Ya lo has hecho alguna vez? ¿Cuál fue el resultado?",
    },
    {
      question: "¿Qué servicio, producto o sistema podrías crear que el mercado ya está comprando?",
      example: "Ej: Cursos, software, consultoría, fondos de inversión, membresías...",
      followUp: "¿Qué te diferencia de quienes ya lo están vendiendo?",
    },
    {
      question: "¿Qué conocimiento o experiencia tuya tiene valor económico que aún no estás monetizando?",
      example: "Ej: Experiencia en X industria, red de contactos, metodología propia...",
      followUp: "¿Por qué no lo has monetizado todavía?",
    },
  ],
};

const QUADRANT_META = {
  what_you_love:            { label: "❤️ Lo que AMAS",           color: "text-red-400",    bg: "bg-red-950/20",    border: "border-red-500/40",    desc: "Pasiones que te dan energía" },
  what_you_are_good_at:     { label: "💪 En qué eres BUENO",     color: "text-blue-400",   bg: "bg-blue-950/20",   border: "border-blue-500/40",   desc: "Habilidades y fortalezas naturales" },
  what_world_needs:         { label: "🌍 Lo que el MUNDO necesita",color: "text-green-400", bg: "bg-green-950/20",  border: "border-green-500/40",  desc: "Problemas que puedes resolver" },
  what_you_can_be_paid_for: { label: "💰 Por lo que te PAGAN",   color: "text-yellow-400", bg: "bg-yellow-950/20", border: "border-yellow-500/40", desc: "Valor económico que generas" },
} as const;

type QuadrantKey = keyof typeof QUADRANT_META;

const INTERSECTIONS = [
  { label: "🔥 Pasión",    desc: "Amas + Bueno en ello",         note: "Lo disfrutas pero puede que aún no genere ingresos." },
  { label: "🌱 Misión",    desc: "Amas + Mundo lo necesita",      note: "Te llena y tiene impacto social real." },
  { label: "🎯 Vocación",  desc: "Mundo necesita + Te pagan",     note: "Rentable e impactante, aunque puede no apasionarte." },
  { label: "💼 Profesión", desc: "Bueno en ello + Te pagan",      note: "Genera ingresos con tus habilidades." },
];

interface IkigaiData {
  id: string | null;
  what_you_love: string[];
  what_you_are_good_at: string[];
  what_world_needs: string[];
  what_you_can_be_paid_for: string[];
  ikigai_statement: string;
  updated_at: string | null;
}

interface GuidedAnswer { questionIdx: number; answer: string; extracted: string }

export default function IkigaiPage() {
  const [data, setData] = useState<IkigaiData>({
    id: null, what_you_love: [], what_you_are_good_at: [],
    what_world_needs: [], what_you_can_be_paid_for: [],
    ikigai_statement: "", updated_at: null,
  });

  // Guided mode state
  const [guidedQuadrant, setGuidedQuadrant] = useState<QuadrantKey | null>(null);
  const [guidedStep,     setGuidedStep]     = useState(0);
  const [guidedAnswer,   setGuidedAnswer]   = useState("");
  const [guidedAnswers,  setGuidedAnswers]  = useState<Partial<Record<QuadrantKey, GuidedAnswer[]>>>({});
  const [aiExtracting,   setAiExtracting]   = useState(false);
  const [extracted,      setExtracted]      = useState<string[]>([]);

  // Statement AI
  const [statementLoading, setStatementLoading] = useState(false);

  // Manual edit
  const [editingKey, setEditingKey] = useState<QuadrantKey | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [newItem,    setNewItem]    = useState<Partial<Record<QuadrantKey,string>>>({});

  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [activeView, setActiveView] = useState<"guided" | "manual" | "statement">("guided");

  const supabase = createClient();

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("ikigai_profiles").select("*").eq("user_id", user.id).single();
    if (profile) {
      setData({
        id: profile.id,
        what_you_love:            profile.what_you_love ?? [],
        what_you_are_good_at:     profile.what_you_are_good_at ?? [],
        what_world_needs:         profile.what_world_needs ?? [],
        what_you_can_be_paid_for: profile.what_you_can_be_paid_for ?? [],
        ikigai_statement:         profile.ikigai_statement ?? "",
        updated_at:               profile.updated_at,
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save(overrideData?: Partial<IkigaiData>) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id:                  user.id,
      what_you_love:            (overrideData ?? data).what_you_love,
      what_you_are_good_at:     (overrideData ?? data).what_you_are_good_at,
      what_world_needs:         (overrideData ?? data).what_world_needs,
      what_you_can_be_paid_for: (overrideData ?? data).what_you_can_be_paid_for,
      ikigai_statement:         (overrideData ?? data).ikigai_statement,
      updated_at:               new Date().toISOString(),
    };
    if (data.id) {
      await supabase.from("ikigai_profiles").update(payload).eq("id", data.id);
    } else {
      const { data: nd } = await supabase.from("ikigai_profiles").insert(payload).select().single();
      if (nd) setData(prev => ({ ...prev, id: nd.id, updated_at: nd.updated_at }));
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    load();
  }

  // ── Guided flow: extract with AI ──────────────────────────────────────────
  async function extractWithAI(quadrant: QuadrantKey, answers: GuidedAnswer[]) {
    setAiExtracting(true);
    try {
      const meta = QUADRANT_META[quadrant];
      const prompt = `Eres un coach de IKIGAI experto. Analiza las siguientes respuestas de una persona y extrae de 3 a 5 ítems concretos para el cuadrante "${meta.label}" de su IKIGAI.

RESPUESTAS DEL USUARIO:
${answers.map((a, i) => `Pregunta ${i+1}: ${GUIDED_QUESTIONS[quadrant][a.questionIdx].question}\nRespuesta: ${a.answer}`).join("\n\n")}

INSTRUCCIONES:
- Extrae frases cortas (5-10 palabras máximo) que representen lo esencial
- Usa sustantivos o frases nominales, no oraciones largas
- Sé específico con los detalles que el usuario mencionó
- No inventes cosas que el usuario no dijo
- Responde SOLO con JSON, sin texto adicional, sin bloques de código

Formato exacto: {"items": ["ítem 1", "ítem 2", "ítem 3", "ítem 4"]}`;

      const res  = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "coaching", prompt }),
      });
      const json = await res.json();

      // Parse response
      let items: string[] = [];
      const text = (json.content ?? json.result ?? "").replace(/```json|```/g, "").trim();
      try {
        const parsed = JSON.parse(text);
        items = parsed.items ?? [];
      } catch {
        // Fallback: extract from answers directly
        items = answers.map(a => a.answer.split(".")[0].slice(0, 60).trim()).filter(Boolean);
      }
      setExtracted(items);
    } catch {
      // Fallback: use raw answers
      setExtracted(answers.map(a => a.answer.split(".")[0].slice(0, 60).trim()).filter(Boolean));
    } finally {
      setAiExtracting(false);
    }
  }

  // ── Guided: save extracted items to quadrant ──────────────────────────────
  function acceptExtracted(quadrant: QuadrantKey, items: string[]) {
    const updated = { ...data, [quadrant]: [...data[quadrant], ...items.filter(i => i.trim())] };
    setData(updated);
    save(updated);
    setGuidedQuadrant(null);
    setGuidedStep(0);
    setGuidedAnswer("");
    setExtracted([]);
    setGuidedAnswers(prev => ({ ...prev, [quadrant]: [] }));
  }

  // ── Guided: submit one answer ─────────────────────────────────────────────
  async function submitGuidedAnswer() {
    if (!guidedQuadrant || !guidedAnswer.trim()) return;
    const questions = GUIDED_QUESTIONS[guidedQuadrant];
    const newAnswer: GuidedAnswer = { questionIdx: guidedStep, answer: guidedAnswer, extracted: "" };
    const allAnswers = [...(guidedAnswers[guidedQuadrant] ?? []), newAnswer];
    setGuidedAnswers(prev => ({ ...prev, [guidedQuadrant]: allAnswers }));
    setGuidedAnswer("");

    const isLast = guidedStep >= questions.length - 1;
    if (isLast || allAnswers.length >= 2) {
      // Have enough answers — extract with AI
      await extractWithAI(guidedQuadrant, allAnswers);
    } else {
      setGuidedStep(prev => prev + 1);
    }
  }

  // ── Generate IKIGAI statement with AI ────────────────────────────────────
  async function generateStatement() {
    setStatementLoading(true);
    try {
      const prompt = `Con base en este IKIGAI, genera una declaración de propósito personal en 2-3 frases poderosas, en primera persona. Debe ser específica, inspiradora y accionable.

Lo que AMA: ${data.what_you_love.join(", ")}
En qué es BUENO: ${data.what_you_are_good_at.join(", ")}
Lo que el MUNDO necesita: ${data.what_world_needs.join(", ")}
Por lo que le PAGAN: ${data.what_you_can_be_paid_for.join(", ")}

Responde SOLO con la declaración, sin explicaciones ni comillas extra.`;

      const res  = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "coaching", prompt }),
      });
      const json = await res.json();
      const statement = (json.content ?? json.result ?? "").trim();
      if (statement) {
        const updated = { ...data, ikigai_statement: statement };
        setData(updated);
        save(updated);
      }
    } catch {}
    setStatementLoading(false);
  }

  // ── Manual item CRUD ──────────────────────────────────────────────────────
  function removeItem(key: QuadrantKey, idx: number) {
    const updated = { ...data, [key]: data[key].filter((_, i) => i !== idx) };
    setData(updated);
  }

  function saveEdit(key: QuadrantKey, idx: number) {
    const updated = { ...data, [key]: data[key].map((v, i) => i === idx ? editingVal : v) };
    setData(updated);
    setEditingKey(null); setEditingIdx(null); setEditingVal("");
  }

  function addManualItem(key: QuadrantKey) {
    const val = newItem[key]?.trim();
    if (!val) return;
    const updated = { ...data, [key]: [...data[key], val] };
    setData(updated);
    setNewItem(prev => ({ ...prev, [key]: "" }));
  }

  const totalItems = Object.values(QUADRANT_META).reduce((acc, _, i) => {
    const key = Object.keys(QUADRANT_META)[i] as QuadrantKey;
    return acc + data[key].length;
  }, 0);

  const isComplete = (Object.keys(QUADRANT_META) as QuadrantKey[]).every(k => data[k].length >= 2)
    && data.ikigai_statement.length > 20;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Cargando tu IKIGAI...</div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── HEADER ───────────────────────────────────────────────────────────*/}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">IKIGAI</h2>
          <p className="text-slate-400 text-sm mt-1">Tu razón de ser, descubierta con preguntas guiadas. Revisar cada 6 meses.</p>
          {data.updated_at && (
            <p className="text-xs text-slate-600 mt-0.5">
              Actualizado: {new Date(data.updated_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isComplete && <span className="text-xs text-green-400 bg-green-900/30 border border-green-500/30 px-2.5 py-1 rounded-full">✓ IKIGAI completo</span>}
          <button onClick={() => save()} disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors">
            {saving ? "Guardando..." : saved ? "✅ Guardado" : "Guardar"}
          </button>
        </div>
      </div>

      {/* ── PROGRESS ─────────────────────────────────────────────────────────*/}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
        <div className="text-xs text-slate-500 shrink-0">Progreso:</div>
        <div className="flex gap-3 flex-1">
          {(Object.entries(QUADRANT_META) as [QuadrantKey, typeof QUADRANT_META[QuadrantKey]][]).map(([key, meta]) => (
            <div key={key} className="flex-1 text-center">
              <div className={`text-lg font-black ${data[key].length >= 2 ? meta.color : "text-slate-600"}`}>{data[key].length}</div>
              <div className="text-xs text-slate-600 mt-0.5">ítems</div>
              <div className={`h-1 rounded-full mt-1 ${data[key].length >= 2 ? "bg-violet-500" : "bg-slate-700"}`} />
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500 shrink-0">{totalItems} total</div>
      </div>

      {/* ── VIEW TOGGLE ──────────────────────────────────────────────────────*/}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {([
          ["guided",    "🤖 Guiado con IA"],
          ["manual",    "✏️ Edición manual"],
          ["statement", "✦ Declaración IKIGAI"],
        ] as [typeof activeView, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === v ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
            }`}>{label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: GUIDED (AI questions)
      ════════════════════════════════════════════════════════════════════*/}
      {activeView === "guided" && (
        <div className="space-y-4">
          {/* Intro if nothing started */}
          {!guidedQuadrant && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">🧭</div>
              <div className="text-white font-semibold text-lg mb-2">Descubre tu IKIGAI respondiendo preguntas</div>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                En lugar de pensar en categorías abstractas, responde preguntas concretas sobre tu vida. La IA extrae los ítems automáticamente de tus respuestas.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {(Object.entries(QUADRANT_META) as [QuadrantKey, typeof QUADRANT_META[QuadrantKey]][]).map(([key, meta]) => (
                  <button key={key} onClick={() => { setGuidedQuadrant(key); setGuidedStep(0); setGuidedAnswer(""); setExtracted([]); }}
                    className={`border rounded-xl p-4 text-left transition-all hover:scale-[1.02] ${meta.border} ${meta.bg}`}>
                    <div className="font-medium text-white text-sm mb-0.5">{meta.label}</div>
                    <div className="text-xs text-slate-500">{meta.desc}</div>
                    <div className={`text-xs mt-2 ${meta.color}`}>
                      {data[key].length > 0 ? `✓ ${data[key].length} ítems` : "Sin responder"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active guided session */}
          {guidedQuadrant && extracted.length === 0 && !aiExtracting && (
            <div className="space-y-4">
              {/* Header */}
              <div className={`border rounded-2xl p-5 ${QUADRANT_META[guidedQuadrant].border} ${QUADRANT_META[guidedQuadrant].bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className={`font-bold text-lg ${QUADRANT_META[guidedQuadrant].color}`}>{QUADRANT_META[guidedQuadrant].label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{QUADRANT_META[guidedQuadrant].desc}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500">Pregunta {guidedStep + 1} / {GUIDED_QUESTIONS[guidedQuadrant].length}</div>
                    <button onClick={() => { setGuidedQuadrant(null); setGuidedStep(0); setGuidedAnswer(""); }}
                      className="text-slate-500 hover:text-slate-300 text-xs border border-slate-700 px-2 py-1 rounded transition-colors">← Volver</button>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1.5 mb-5">
                  {GUIDED_QUESTIONS[guidedQuadrant].map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                      i < guidedStep ? "bg-violet-500" : i === guidedStep ? "bg-violet-400" : "bg-slate-700"
                    }`} />
                  ))}
                </div>

                {/* Question */}
                <div className="bg-slate-900/60 rounded-xl p-4 mb-4">
                  <p className="text-white font-medium text-base leading-relaxed">
                    {GUIDED_QUESTIONS[guidedQuadrant][guidedStep].question}
                  </p>
                  <p className="text-slate-500 text-xs mt-2 italic">
                    {GUIDED_QUESTIONS[guidedQuadrant][guidedStep].example}
                  </p>
                </div>

                {/* Previous answers summary */}
                {(guidedAnswers[guidedQuadrant]?.length ?? 0) > 0 && (
                  <div className="mb-4 space-y-1">
                    {guidedAnswers[guidedQuadrant]?.map((a, i) => (
                      <div key={i} className="text-xs text-slate-500 flex gap-2">
                        <span className="text-slate-600 shrink-0">✓ P{i+1}:</span>
                        <span className="truncate">{a.answer.slice(0, 80)}{a.answer.length > 80 ? "..." : ""}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Answer input */}
                <textarea
                  value={guidedAnswer}
                  onChange={e => setGuidedAnswer(e.target.value)}
                  rows={4}
                  placeholder="Escribe tu respuesta aquí, con la mayor honestidad posible. No hay respuestas correctas ni incorrectas..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none text-sm"
                  autoFocus
                />

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={submitGuidedAnswer}
                    disabled={!guidedAnswer.trim()}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    {guidedStep >= GUIDED_QUESTIONS[guidedQuadrant].length - 1 || (guidedAnswers[guidedQuadrant]?.length ?? 0) >= 1
                      ? "🤖 Extraer ítems con IA"
                      : "Siguiente pregunta →"}
                  </button>
                  {(guidedAnswers[guidedQuadrant]?.length ?? 0) >= 1 && (
                    <button
                      onClick={submitGuidedAnswer}
                      disabled={!guidedAnswer.trim()}
                      className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-slate-700 transition-colors"
                    >
                      Extraer con lo que tengo
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI extracting spinner */}
          {aiExtracting && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-8 text-center">
              <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-white font-medium">Analizando tus respuestas...</div>
              <div className="text-slate-400 text-sm mt-1">La IA está extrayendo los ítems de tu IKIGAI</div>
            </div>
          )}

          {/* Extracted items preview */}
          {extracted.length > 0 && guidedQuadrant && (
            <div className={`border rounded-2xl p-5 space-y-4 ${QUADRANT_META[guidedQuadrant].border} ${QUADRANT_META[guidedQuadrant].bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-bold ${QUADRANT_META[guidedQuadrant].color}`}>{QUADRANT_META[guidedQuadrant].label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">La IA extrajo estos ítems de tus respuestas. Edítalos si es necesario.</div>
                </div>
              </div>

              <div className="space-y-2">
                {extracted.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                    <span className="text-violet-400 text-xs font-mono shrink-0">{String(i+1).padStart(2,"0")}</span>
                    <input
                      value={item}
                      onChange={e => setExtracted(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                    />
                    <button onClick={() => setExtracted(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-600 hover:text-red-400 text-xs shrink-0">✕</button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => acceptExtracted(guidedQuadrant, extracted)}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  ✅ Agregar al IKIGAI ({extracted.length} ítems)
                </button>
                <button onClick={() => { setExtracted([]); setGuidedAnswer(""); setGuidedStep(prev => Math.min(prev+1, GUIDED_QUESTIONS[guidedQuadrant].length-1)); }}
                  className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-slate-700 transition-colors">
                  Responder más preguntas
                </button>
                <button onClick={() => { setGuidedQuadrant(null); setExtracted([]); setGuidedAnswers({}); }}
                  className="text-slate-500 hover:text-slate-300 text-sm px-4 py-2 rounded-xl transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Summary of current items (when not in active session) */}
          {!guidedQuadrant && (
            <div className="grid grid-cols-2 gap-4">
              {(Object.entries(QUADRANT_META) as [QuadrantKey, typeof QUADRANT_META[QuadrantKey]][]).map(([key, meta]) => (
                <div key={key} className={`border rounded-2xl p-5 ${meta.border} ${meta.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`font-semibold text-white text-sm`}>{meta.label}</div>
                    <button onClick={() => { setGuidedQuadrant(key); setGuidedStep(0); setGuidedAnswer(""); setExtracted([]); }}
                      className={`text-xs ${meta.color} border rounded-lg px-2.5 py-1 transition-colors hover:bg-slate-800`}
                      style={{ borderColor: `${meta.color.replace("text-","color:")}40` }}>
                      {data[key].length > 0 ? "+ Agregar más" : "Responder →"}
                    </button>
                  </div>
                  {data[key].length === 0 ? (
                    <div className="text-slate-600 text-xs italic py-4 text-center">Sin ítems todavía</div>
                  ) : (
                    <ul className="space-y-1">
                      {data[key].map((item, i) => (
                        <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                          <span className="text-slate-600 shrink-0">•</span>{item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: MANUAL EDIT
      ════════════════════════════════════════════════════════════════════*/}
      {activeView === "manual" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {(Object.entries(QUADRANT_META) as [QuadrantKey, typeof QUADRANT_META[QuadrantKey]][]).map(([key, meta]) => (
              <div key={key} className={`border rounded-2xl p-5 ${meta.border} ${meta.bg}`}>
                <div className="mb-3">
                  <div className="font-semibold text-white">{meta.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{meta.desc}</div>
                </div>

                <ul className="space-y-1.5 mb-3 min-h-[60px]">
                  {data[key].map((item, i) => (
                    <li key={i} className="group flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                      {editingKey === key && editingIdx === i ? (
                        <div className="flex-1 flex gap-2">
                          <input value={editingVal} onChange={e => setEditingVal(e.target.value)}
                            onKeyDown={e => { if (e.key==="Enter") saveEdit(key,i); if (e.key==="Escape") { setEditingKey(null); setEditingIdx(null); } }}
                            className="flex-1 bg-slate-700 border border-violet-500 rounded px-2 py-0.5 text-white text-sm focus:outline-none" autoFocus />
                          <button onClick={() => saveEdit(key,i)} className="text-green-400 text-xs">✓</button>
                          <button onClick={() => { setEditingKey(null); setEditingIdx(null); }} className="text-slate-400 text-xs">✕</button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <span className="text-sm text-slate-200 flex-1">• {item}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingKey(key); setEditingIdx(i); setEditingVal(item); }} className="text-slate-500 hover:text-blue-400 text-xs">✎</button>
                            <button onClick={() => removeItem(key,i)} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                  {data[key].length === 0 && <li className="text-slate-600 text-xs italic text-center py-3">Sin ítems</li>}
                </ul>

                <div className="flex gap-2">
                  <input value={newItem[key] ?? ""} onChange={e => setNewItem(p => ({ ...p, [key]: e.target.value }))}
                    onKeyDown={e => { if (e.key==="Enter") addManualItem(key); }}
                    placeholder="Agregar ítem..."
                    className="flex-1 bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  />
                  <button onClick={() => addManualItem(key)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg text-sm transition-colors">+</button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => save()} disabled={saving}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
            {saving ? "Guardando..." : saved ? "✅ Guardado" : "Guardar cambios"}
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: IKIGAI STATEMENT
      ════════════════════════════════════════════════════════════════════*/}
      {activeView === "statement" && (
        <div className="space-y-4">
          {/* Intersections */}
          <div className="grid grid-cols-4 gap-3">
            {INTERSECTIONS.map(int => (
              <div key={int.label} className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-center">
                <div className="font-semibold text-white text-sm mb-1">{int.label}</div>
                <div className="text-xs text-violet-400 mb-2">{int.desc}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{int.note}</div>
              </div>
            ))}
          </div>

          {/* Statement */}
          <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-white">✦ Tu declaración de propósito</div>
                <div className="text-xs text-slate-500 mt-0.5">Generada por IA desde tu IKIGAI, o escríbela tú mismo</div>
              </div>
              <button
                onClick={generateStatement}
                disabled={statementLoading || totalItems < 4}
                title={totalItems < 4 ? "Completa al menos 1 ítem por cuadrante primero" : ""}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2"
              >
                {statementLoading
                  ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando...</>
                  : "🤖 Generar con IA"}
              </button>
            </div>

            <textarea
              value={data.ikigai_statement}
              onChange={e => setData(prev => ({ ...prev, ikigai_statement: e.target.value }))}
              rows={5}
              placeholder={`Escribe aquí tu declaración de propósito personal.\n\nEj: "Soy un constructor de sistemas que combina inteligencia financiera y tecnología para ayudar a personas a alcanzar libertad e impacto real."`}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none text-sm leading-relaxed"
            />
            {data.ikigai_statement && (
              <div className="text-xs text-slate-600 mt-1">{data.ikigai_statement.length} caracteres</div>
            )}

            <button onClick={() => save()} disabled={saving} className="mt-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors">
              {saving ? "Guardando..." : saved ? "✅ Guardado" : "Guardar declaración"}
            </button>
          </div>

          {/* IKIGAI visual summary */}
          {totalItems > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(QUADRANT_META) as [QuadrantKey, typeof QUADRANT_META[QuadrantKey]][]).map(([key, meta]) => (
                <div key={key} className={`border rounded-xl p-4 ${meta.border} ${meta.bg}`}>
                  <div className={`text-xs font-medium mb-2 ${meta.color}`}>{meta.label}</div>
                  {data[key].length === 0 ? (
                    <div className="text-slate-600 text-xs italic">Sin ítems</div>
                  ) : (
                    <ul className="space-y-0.5">
                      {data[key].map((item, i) => (
                        <li key={i} className="text-xs text-slate-300">• {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

