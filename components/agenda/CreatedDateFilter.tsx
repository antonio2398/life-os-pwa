"use client";
import { X } from "lucide-react";

/** Filtro "creada desde / hasta" para los buscadores de tareas y hábitos. */
export default function CreatedDateFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const input = "bg-ocean-900 border border-ocean-800 rounded-lg px-2 py-1 text-ocean-300 text-xs focus:outline-none focus:border-brand-500 [color-scheme:dark]";
  return (
    <div className="flex items-center gap-1.5 text-xs text-ocean-500 flex-wrap">
      <span>Creada:</span>
      <input type="date" value={from} max={to || undefined} onChange={e => onChange(e.target.value, to)} className={input} aria-label="Creada desde" />
      <span>a</span>
      <input type="date" value={to} min={from || undefined} onChange={e => onChange(from, e.target.value)} className={input} aria-label="Creada hasta" />
      {(from || to) && <button onClick={() => onChange("", "")} title="Quitar filtro de fecha" className="text-ocean-500 hover:text-white"><X size={14} /></button>}
    </div>
  );
}
