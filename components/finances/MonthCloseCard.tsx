"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Cierre de mes: transfiere el balance (ingresos − egresos) del mes a uno o varios activos de Riqueza.
// Cada mes se cierra una sola vez (unique user_id + month en month_closings).

interface AssetOption { id: string; name: string; type: string; current_value: number }
interface Allocation  { asset_id: string; asset_name: string; amount: number }
interface Closing     { id: string; month: string; balance: number; allocations: Allocation[]; closed_at: string }

function previousMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

const money = (n: number) => `$${Math.abs(n).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MonthCloseCard({ month, totalIncome, totalExpense }: { month: string; totalIncome: number; totalExpense: number }) {
  const supabase = createClient();
  const balance = Math.round((totalIncome - totalExpense) * 100) / 100;
  const sign = balance >= 0 ? 1 : -1;

  const [closing,      setClosing]      = useState<Closing | null>(null);
  const [assets,       setAssets]       = useState<AssetOption[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [rows,         setRows]         = useState<{ asset_id: string; amount: string }[]>([]);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [confirmReopen, setConfirmReopen] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  // Solo el mes actual y el anterior: los meses viejos ya están reflejados en los valores de los activos
  const closable = month <= currentMonth && month >= previousMonth(currentMonth);

  useEffect(() => { load(); setShowForm(false); setError(null); setConfirmReopen(false); }, [month]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: c, error: cErr }, { data: a }] = await Promise.all([
      supabase.from("month_closings").select("id, month, balance, allocations, closed_at").eq("user_id", user.id).eq("month", month).maybeSingle(),
      supabase.from("assets").select("id, name, type, current_value").eq("user_id", user.id).order("current_value", { ascending: false }),
    ]);
    setTableMissing(!!cErr && (cErr.code === "42P01" || cErr.code === "PGRST205" || /month_closings/.test(cErr.message)));
    setClosing((c as Closing) ?? null);
    setAssets(a ?? []);
    setLoading(false);
  }

  function openForm() {
    const defaultAsset = assets.find(a => a.type === "cash") ?? assets[0];
    setRows([{ asset_id: defaultAsset?.id ?? "", amount: String(Math.abs(balance)) }]);
    setError(null);
    setShowForm(true);
  }

  const allocated = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const remaining = Math.round((Math.abs(balance) - allocated) * 100) / 100;

  async function closeMonth() {
    setError(null);
    if (balance !== 0) {
      if (rows.some(r => !r.asset_id || !(Number(r.amount) > 0))) return setError("Cada fila necesita un activo y un monto mayor a 0.");
      if (Math.abs(remaining) > 0.009) return setError(`Debes asignar exactamente ${money(balance)} (faltan ${money(remaining)}).`);
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setBusy(false);

    const allocations: Allocation[] = balance === 0 ? [] : rows.map(r => ({
      asset_id: r.asset_id,
      asset_name: assets.find(a => a.id === r.asset_id)?.name ?? "",
      amount: sign * Number(r.amount),
    }));

    // Primero se registra el cierre: si el mes ya estaba cerrado, la restricción única lo rechaza y no se suma dos veces
    const { error: insErr } = await supabase.from("month_closings").insert({
      user_id: user.id, month, total_income: totalIncome, total_expense: totalExpense, balance, allocations,
    });
    if (insErr) {
      setBusy(false);
      return setError(insErr.code === "23505" ? "Este mes ya fue cerrado." : `No se pudo cerrar el mes: ${insErr.message}`);
    }

    const failed = await applyToAssets(allocations, 1);
    if (failed.length) setError(`El mes se cerró, pero no se pudieron actualizar: ${failed.join(", ")}. Revísalos en Riqueza.`);
    setBusy(false);
    setShowForm(false);
    load();
  }

  async function reopenMonth() {
    if (!closing) return;
    setBusy(true); setError(null);
    const failed = await applyToAssets(closing.allocations ?? [], -1);
    if (failed.length) {
      setBusy(false); setConfirmReopen(false);
      return setError(`No se pudieron revertir: ${failed.join(", ")}. El mes sigue cerrado.`);
    }
    await supabase.from("month_closings").delete().eq("id", closing.id);
    setBusy(false); setConfirmReopen(false);
    load();
  }

  // Suma (direction = 1) o revierte (direction = -1) las asignaciones sobre el valor actual de cada activo
  async function applyToAssets(allocations: Allocation[], direction: 1 | -1): Promise<string[]> {
    const failed: string[] = [];
    for (const al of allocations) {
      const { data: asset } = await supabase.from("assets").select("current_value").eq("id", al.asset_id).maybeSingle();
      if (!asset) { failed.push(al.asset_name || al.asset_id); continue; }
      const newValue = Math.round((Number(asset.current_value) + direction * al.amount) * 100) / 100;
      const { error: upErr } = await supabase.from("assets")
        .update({ current_value: newValue, updated_at: new Date().toISOString() }).eq("id", al.asset_id);
      if (upErr) failed.push(al.asset_name || al.asset_id);
    }
    return failed;
  }

  if (loading) return null;

  if (tableMissing) return (
    <div className="bg-yellow-950/20 border border-yellow-500/30 rounded-2xl p-4 text-sm text-yellow-300">
      🔒 El cierre de mes necesita la tabla <code>month_closings</code> en Supabase. Ejecuta <code>sql/2026-10-08_month_closings_and_dofa.sql</code> en el SQL Editor.
    </div>
  );

  // ── Mes ya cerrado ──────────────────────────────────────────────────────────
  if (closing) return (
    <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-white font-semibold">✅ Mes cerrado · {new Date(closing.closed_at).toLocaleDateString("es-CO")}</div>
        {closable && !confirmReopen && (
          <button onClick={() => setConfirmReopen(true)} className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg">↩ Reabrir</button>
        )}
      </div>
      <div className="text-xs text-slate-400">
        Balance {closing.balance >= 0 ? "+" : "-"}{money(closing.balance)}
        {(closing.allocations ?? []).length > 0 && <> → {closing.allocations.map(a => `${a.asset_name} (${a.amount >= 0 ? "+" : "-"}${money(a.amount)})`).join(", ")}</>}
      </div>
      {Math.abs(Number(closing.balance) - balance) > 0.009 && (
        <div className="text-xs text-yellow-400">
          ⚠️ El balance cambió desde el cierre (ahora {balance >= 0 ? "+" : "-"}{money(balance)}). Reabre y vuelve a cerrar el mes para ajustar Riqueza.
        </div>
      )}
      {confirmReopen && (
        <div className="flex items-center gap-2 flex-wrap bg-slate-800/60 rounded-xl p-3">
          <span className="text-xs text-slate-300 flex-1">Se revertirán los montos en Riqueza y podrás volver a cerrar el mes.</span>
          <button onClick={reopenMonth} disabled={busy} className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">{busy ? "Revirtiendo..." : "Sí, reabrir"}</button>
          <button onClick={() => setConfirmReopen(false)} className="text-xs text-slate-400 border border-slate-700 px-3 py-1.5 rounded-lg">Cancelar</button>
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );

  // ── Mes abierto ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm text-white font-semibold">🔐 Cierre de mes</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {balance > 0 ? `Te sobraron ${money(balance)}: asígnalos a tus activos en Riqueza.`
              : balance < 0 ? `Gastaste ${money(balance)} más de lo que ingresó: indica de qué activo salió.`
              : "Balance en cero: no hay nada que transferir."}
          </div>
        </div>
        {closable && !showForm && (
          <button onClick={balance === 0 ? closeMonth : openForm} disabled={busy}
            className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
            Cerrar mes
          </button>
        )}
      </div>

      {!closable && (
        <div className="text-xs text-slate-500">Solo se pueden cerrar el mes actual y el anterior. Los meses anteriores ya están reflejados en el valor de tus activos.</div>
      )}

      {closable && showForm && (
        assets.length === 0 ? (
          <div className="text-xs text-yellow-400">No tienes activos en Riqueza. Crea primero una cuenta (por ejemplo tu banco) para poder asignar el balance.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select value={row.asset_id} onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, asset_id: e.target.value } : r))}
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500">
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({money(a.current_value)})</option>)}
                </select>
                <input type="number" min={0} step="0.01" value={row.amount}
                  onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                  className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
                {rows.length > 1 && (
                  <button onClick={() => setRows(p => p.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400 text-xs px-1">✕</button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button onClick={() => setRows(p => [...p, { asset_id: assets[0].id, amount: String(Math.max(remaining, 0)) }])}
                className="text-xs text-violet-400 hover:text-violet-300">+ Repartir en otro activo</button>
              <span className={`text-xs ${Math.abs(remaining) > 0.009 ? "text-yellow-400" : "text-green-400"}`}>
                {Math.abs(remaining) > 0.009 ? `Sin asignar: ${remaining < 0 ? "-" : ""}${money(remaining)}` : "✓ Todo asignado"}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {balance >= 0 ? "Los montos se sumarán" : "Los montos se restarán"} al valor del activo en Riqueza.
            </div>
            <div className="flex gap-2">
              <button onClick={closeMonth} disabled={busy} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
                {busy ? "Cerrando..." : "Confirmar cierre"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-xs text-slate-400 border border-slate-700 px-4 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        )
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}
