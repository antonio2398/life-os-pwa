"use client";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface DetailInfo {
  title: string;
  /** Etiqueta corta: "Hábito", "Tarea diaria", "Tarea general". */
  kind: string;
  color?: string;
  description?: string | null;
  meta: [string, string][];
  done?: boolean;
}

/** Ficha de detalle de una tarea o un hábito (muestra la descripción completa). */
export default function DetailModal({ info, onClose, actions }: { info: DetailInfo; onClose: () => void; actions?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-ocean-900 border border-ocean-700 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {info.color && <span className="w-3 h-3 rounded-full mt-2 shrink-0" style={{ backgroundColor: info.color }} />}
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide text-ocean-500">{info.kind}</div>
            <div className={`text-lg font-semibold break-words ${info.done ? "line-through text-ocean-400" : "text-white"}`}>{info.title}</div>
          </div>
          <button onClick={onClose} className="text-ocean-500 hover:text-white" title="Cerrar"><X size={18} /></button>
        </div>
        <div>
          <div className="text-xs text-ocean-500 mb-1">Descripción</div>
          {info.description?.trim()
            ? <p className="text-sm text-ocean-200 whitespace-pre-wrap break-words">{info.description}</p>
            : <p className="text-sm text-ocean-600 italic">Sin descripción</p>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {info.meta.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ocean-500">{k}</dt>
              <dd className="text-ocean-200">{v}</dd>
            </div>
          ))}
        </dl>
        {actions && <div className="flex gap-2 justify-end flex-wrap pt-1">{actions}</div>}
      </div>
    </div>
  );
}
