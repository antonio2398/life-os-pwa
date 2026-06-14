"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
const LIFE_AREAS = [
  { id: 1, name: "Salud / Bienestar", weight: 25, icon: "ðŸ’š" },
  { id: 2, name: "Finanzas / Inversiones", weight: 25, icon: "ðŸ’°" },
  { id: 3, name: "Carrera / Negocios", weight: 20, icon: "ðŸ”µ" },
  { id: 4, name: "Relaciones / Redes", weight: 10, icon: "ðŸŸ£" },
  { id: 5, name: "Espiritualidad / Proposito", weight: 10, icon: "ðŸŸ " },
  { id: 6, name: "Aprendizaje / Crecimiento", weight: 5, icon: "ðŸ“˜" },
  { id: 7, name: "Impacto / Legado", weight: 5, icon: "â¤ï¸" },
];
const SCORECARD = [
  { label: "Tareas completadas", target: 10 }, { label: "Deep work (horas)", target: 10 },
  { label: "Entrenamiento (sesiones)", target: 4 }, { label: "Meditacion (dias)", target: 7 },
  { label: "Lectura (dias)", target: 5 }, { label: "Ahorro / inversion ($)", target: 100 },
];
export default function DashboardPage() {
  const [diagnosticScores, setDiagnosticScores] = useState<Record<number, number>>({});
  const [lifeScore, setLifeScore] = useState(0);
  const supabase = createClient();
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("diagnostic_scores").select("life_area_id, score").eq("user_id", user.id).order("evaluated_at", { ascending: false });
      if (data) {
        const latest: Record<number, number> = {};
        data.forEach(row => { if (!latest[row.life_area_id]) latest[row.life_area_id] = row.score; });
        setDiagnosticScores(latest);
        const score = LIFE_AREAS.reduce((acc, area) => acc + ((latest[area.id] || 0) * area.weight) / 100, 0);
        setLifeScore(Math.round(score));
      }
    }
    loadData();
  }, []);
  const scoreColor = lifeScore >= 70 ? "text-green-400" : lifeScore >= 40 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="space-y-8">
      <div><h2 className="text-2xl font-bold text-white">Dashboard</h2><p className="text-slate-400 text-sm mt-1">Tu resumen ejecutivo semanal</p></div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-8">
        <div className="text-center"><div className={`text-6xl font-black ${scoreColor}`}>{lifeScore}</div><div className="text-slate-400 text-sm mt-1">Life Score</div></div>
        <div className="flex-1 grid grid-cols-2 gap-3">
          {LIFE_AREAS.map(area => {
            const score = diagnosticScores[area.id] || 0;
            return (<div key={area.id} className="space-y-1"><div className="flex justify-between text-xs text-slate-400"><span>{area.icon} {area.name}</span><span className="text-white">{score}/100</span></div><div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${score}%` }} /></div></div>);
          })}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">ðŸ“Š Scorecard Semanal</h3>
        <div className="space-y-3">
          {SCORECARD.map((item, i) => {
            const pct = Math.floor(Math.random() * 120);
            const color = pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
            return (<div key={i} className="flex items-center gap-3"><div className="w-40 text-sm text-slate-300 truncate">{item.label}</div><div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div><div className="w-12 text-right text-xs text-slate-400">{pct}%</div></div>);
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{ href: "/habits", label: "âœ… Registrar Habitos", desc: "Check diario" },{ href: "/finances", label: "ðŸ’¸ Registrar Gasto", desc: "Movimiento nuevo" },{ href: "/tasks", label: "ðŸ“‹ Ver Tareas", desc: "Pendientes de hoy" }].map(item => (
          <a key={item.href} href={item.href} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-violet-600 transition-colors"><div className="font-medium text-white">{item.label}</div><div className="text-slate-400 text-sm mt-0.5">{item.desc}</div></a>
        ))}
      </div>
    </div>
  );
}