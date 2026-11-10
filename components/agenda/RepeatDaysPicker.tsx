"use client";
import { REPEAT_DAY_OPTIONS, REPEAT_PRESETS, WEEKDAYS } from "@/lib/agenda";

/** Selector de días de la semana (compartido por tareas diarias y hábitos). */
export default function RepeatDaysPicker({ value, onChange, label = "Repetir los días:" }: { value: number[]; onChange: (days: number[]) => void; label?: string }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-ocean-400">{label}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {REPEAT_DAY_OPTIONS.map(([day, lbl]) => {
          const on = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              title={WEEKDAYS[(day + 6) % 7]}
              onClick={() => onChange(on ? value.filter(d => d !== day) : [...value, day])}
              className={`w-9 h-9 rounded-full text-sm font-medium border transition-colors ${on ? "bg-brand-600 border-brand-600 text-white" : "border-ocean-700 text-ocean-400 hover:border-brand-500"}`}
            >
              {lbl}
            </button>
          );
        })}
        <span className="mx-1 text-ocean-700">|</span>
        {REPEAT_PRESETS.map(([lbl, days]) => (
          <button key={lbl} type="button" onClick={() => onChange([...days])} className="text-xs text-ocean-400 hover:text-white border border-ocean-700 rounded-lg px-2 py-1">{lbl}</button>
        ))}
      </div>
    </div>
  );
}
