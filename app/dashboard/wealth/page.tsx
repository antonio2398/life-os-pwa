"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ASSET_TYPES = [
  { value: "cash",         label: "Efectivo / Cuenta",     icon: "🏦" },
  { value: "investment",   label: "Inversiones",            icon: "📈" },
  { value: "real_estate",  label: "Bienes raíces",          icon: "🏠" },
  { value: "business",     label: "Negocio / Empresa",      icon: "🏢" },
  { value: "crypto",       label: "Criptomonedas",          icon: "₿"  },
  { value: "other",        label: "Otro",                   icon: "💼" },
];

const LIABILITY_TYPES = [
  { value: "credit_card",    label: "Tarjeta de crédito",  icon: "💳" },
  { value: "personal_loan",  label: "Préstamo personal",   icon: "🤝" },
  { value: "mortgage",       label: "Hipoteca",            icon: "🏠" },
  { value: "auto_loan",      label: "Financiamiento auto", icon: "🚗" },
  { value: "other",          label: "Otro",                icon: "📄" },
];

const ASSET_ROLES = [
  "Liquidez operativa", "Fondo de emergencia", "Protección (hedge)",
  "Especulación", "Crecimiento pasivo", "Crecimiento activo",
  "Generación de cashflow", "Ahorro a largo plazo", "Otro",
];

interface Asset {
  id: string;
  type: string;
  name: string;
  current_value: number;
  target_percentage: number;
  role: string;
  notes: string;
  updated_at: string;
}

interface Liability {
  id: string;
  type: string;
  name: string;
  balance: number;
  interest_rate: number;
  monthly_payment: number;
  priority: string;
  strategy: string;
  updated_at: string;
}

interface NetWorthRecord {
  month: string;
  assets: number;
  liabilities: number;
  net_worth: number;
}

const EMPTY_ASSET = { type: "cash", name: "", current_value: "", target_percentage: "0", role: "Liquidez operativa", notes: "" };
const EMPTY_LIABILITY = { type: "credit_card", name: "", balance: "", interest_rate: "", monthly_payment: "", priority: "high", strategy: "" };

export default function WealthPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "assets" | "liabilities" | "plan">("overview");
  const [loading, setLoading] = useState(true);

  // Asset form
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState(EMPTY_ASSET);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [savingAsset, setSavingAsset] = useState(false);

  // Liability form
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [liabilityForm, setLiabilityForm] = useState(EMPTY_LIABILITY);
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
  const [savingLiability, setSavingLiability] = useState(false);

  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase.from("assets").select("*").eq("user_id", user.id).order("current_value", { ascending: false }),
      supabase.from("liabilities").select("*").eq("user_id", user.id).order("balance", { ascending: false }),
    ]);
    setAssets(a ?? []);
    setLiabilities(l ?? []);
    setLoading(false);
  }

  // ── Assets CRUD ───────────────────────────────────────
  async function saveAsset() {
    if (!assetForm.name.trim() || !assetForm.current_value) return;
    setSavingAsset(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { ...assetForm, current_value: Number(assetForm.current_value), target_percentage: Number(assetForm.target_percentage), updated_at: new Date().toISOString() };
    if (editingAssetId) {
      await supabase.from("assets").update(payload).eq("id", editingAssetId);
    } else {
      await supabase.from("assets").insert({ ...payload, user_id: user.id });
    }
    setShowAssetForm(false);
    setEditingAssetId(null);
    setAssetForm(EMPTY_ASSET);
    setSavingAsset(false);
    load();
  }

  function openEditAsset(asset: Asset) {
    setAssetForm({ type: asset.type, name: asset.name, current_value: String(asset.current_value), target_percentage: String(asset.target_percentage), role: asset.role ?? "", notes: asset.notes ?? "" });
    setEditingAssetId(asset.id);
    setShowAssetForm(true);
  }

  async function deleteAsset(id: string) {
    if (!confirm("¿Eliminar este activo?")) return;
    await supabase.from("assets").delete().eq("id", id);
    load();
  }

  async function updateAssetValue(id: string, value: number) {
    await supabase.from("assets").update({ current_value: value, updated_at: new Date().toISOString() }).eq("id", id);
    setAssets(prev => prev.map(a => a.id === id ? { ...a, current_value: value } : a));
  }

  // ── Liabilities CRUD ──────────────────────────────────
  async function saveLiability() {
    if (!liabilityForm.name.trim() || !liabilityForm.balance) return;
    setSavingLiability(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { ...liabilityForm, balance: Number(liabilityForm.balance), interest_rate: Number(liabilityForm.interest_rate), monthly_payment: Number(liabilityForm.monthly_payment), updated_at: new Date().toISOString() };
    if (editingLiabilityId) {
      await supabase.from("liabilities").update(payload).eq("id", editingLiabilityId);
    } else {
      await supabase.from("liabilities").insert({ ...payload, user_id: user.id });
    }
    setShowLiabilityForm(false);
    setEditingLiabilityId(null);
    setLiabilityForm(EMPTY_LIABILITY);
    setSavingLiability(false);
    load();
  }

  function openEditLiability(liability: Liability) {
    setLiabilityForm({ type: liability.type, name: liability.name, balance: String(liability.balance), interest_rate: String(liability.interest_rate), monthly_payment: String(liability.monthly_payment), priority: liability.priority, strategy: liability.strategy ?? "" });
    setEditingLiabilityId(liability.id);
    setShowLiabilityForm(true);
  }

  async function deleteLiability(id: string) {
    if (!confirm("¿Eliminar este pasivo?")) return;
    await supabase.from("liabilities").delete().eq("id", id);
    load();
  }

  // ── Computed values ───────────────────────────────────
  const totalAssets = assets.reduce((s, a) => s + Number(a.current_value), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.balance), 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtRatio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0;
  const totalMonthlyPayments = liabilities.reduce((s, l) => s + Number(l.monthly_payment), 0);

  // Assets by type
  const assetsByType = ASSET_TYPES.map(t => ({
    ...t,
    total: assets.filter(a => a.type === t.value).reduce((s, a) => s + Number(a.current_value), 0),
    count: assets.filter(a => a.type === t.value).length,
    pct: totalAssets > 0 ? Math.round((assets.filter(a => a.type === t.value).reduce((s, a) => s + Number(a.current_value), 0) / totalAssets) * 100) : 0,
  })).filter(t => t.total > 0);

  const priorityConfig: Record<string, { label: string; color: string; badge: string }> = {
    high:   { label: "Alta",  color: "text-red-400",    badge: "bg-red-900/30 border border-red-500/30 text-red-400" },
    medium: { label: "Media", color: "text-yellow-400", badge: "bg-yellow-900/30 border border-yellow-500/30 text-yellow-400" },
    low:    { label: "Baja",  color: "text-green-400",  badge: "bg-green-900/30 border border-green-500/30 text-green-400" },
  };

  const sortedLiabilities = [...liabilities].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority as keyof typeof order] ?? 3) - (order[b.priority as keyof typeof order] ?? 3);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400">Cargando patrimonio...</div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Riqueza & Patrimonio</h2>
        <p className="text-slate-400 text-sm mt-1">Activos, pasivos y patrimonio neto</p>
      </div>

      {/* Net Worth Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="text-center mb-6">
          <div className="text-xs text-slate-500 mb-1">PATRIMONIO NETO</div>
          <div className={`text-5xl font-black ${netWorth >= 0 ? "text-violet-400" : "text-red-400"}`}>
            ${Math.abs(netWorth).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            {netWorth < 0 && <span className="text-2xl ml-2 text-red-400">negativo</span>}
          </div>
          <div className="text-slate-500 text-sm mt-1">Activos − Pasivos</div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-500 mb-1">🏦 Activos</div>
            <div className="text-xl font-bold text-green-400">${totalAssets.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">🏧 Pasivos</div>
            <div className="text-xl font-bold text-red-400">${totalLiabilities.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">📉 Debt Ratio</div>
            <div className={`text-xl font-bold ${debtRatio <= 30 ? "text-green-400" : debtRatio <= 60 ? "text-yellow-400" : "text-red-400"}`}>{debtRatio}%</div>
          </div>
        </div>

        {/* Portfolio distribution bar */}
        {assetsByType.length > 0 && (
          <div className="mt-5">
            <div className="text-xs text-slate-500 mb-2">Distribución del portafolio</div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {assetsByType.map((t, i) => {
                const colors = ["#7c3aed", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#06b6d4"];
                return (
                  <div
                    key={t.value}
                    style={{ width: `${t.pct}%`, backgroundColor: colors[i % colors.length] }}
                    title={`${t.label}: ${t.pct}%`}
                  />
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {assetsByType.map((t, i) => {
                const colors = ["#7c3aed", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#06b6d4"];
                return (
                  <div key={t.value} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="text-xs text-slate-400">{t.icon} {t.label} {t.pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {([["overview", "📊 Resumen"], ["assets", `🏦 Activos (${assets.length})`], ["liabilities", `🏧 Pasivos (${liabilities.length})`], ["plan", "🗺️ Plan deuda"]] as ["overview" | "assets" | "liabilities" | "plan", string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === tab ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Assets summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">🏦 Activos por tipo</h3>
              {assetsByType.length === 0 ? <div className="text-slate-600 text-sm">Sin activos registrados</div> : (
                <div className="space-y-3">
                  {assetsByType.map(t => (
                    <div key={t.value}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{t.icon} {t.label}</span>
                        <span className="text-white font-medium">${t.total.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${t.pct}%` }} />
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">{t.pct}% del portafolio · {t.count} activo{t.count !== 1 ? "s" : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liabilities summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">🏧 Resumen de deudas</h3>
              {liabilities.length === 0 ? <div className="text-slate-600 text-sm">Sin pasivos registrados</div> : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Deuda total</span>
                    <span className="text-red-400 font-bold">${totalLiabilities.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Pagos mensuales</span>
                    <span className="text-yellow-400 font-medium">${totalMonthlyPayments.toLocaleString()}/mes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Ratio deuda/activos</span>
                    <span className={`font-medium ${debtRatio <= 30 ? "text-green-400" : debtRatio <= 60 ? "text-yellow-400" : "text-red-400"}`}>{debtRatio}%</span>
                  </div>
                  <div className="border-t border-slate-700 pt-3 space-y-2">
                    {sortedLiabilities.slice(0, 3).map(l => (
                      <div key={l.id} className="flex justify-between text-xs">
                        <span className="text-slate-400">{l.name}</span>
                        <span className={priorityConfig[l.priority]?.color}>${Number(l.balance).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ASSETS ───────────────────────────────────────── */}
      {activeTab === "assets" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowAssetForm(true); setEditingAssetId(null); setAssetForm(EMPTY_ASSET); }} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg">+ Nuevo Activo</button>
          </div>

          {showAssetForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">{editingAssetId ? "Editar activo" : "Nuevo activo"}</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del activo" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                <input type="number" step="0.01" value={assetForm.current_value} onChange={e => setAssetForm(p => ({ ...p, current_value: e.target.value }))} placeholder="Valor actual $" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={assetForm.type} onChange={e => setAssetForm(p => ({ ...p, type: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
                <select value={assetForm.role} onChange={e => setAssetForm(p => ({ ...p, role: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {ASSET_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400 shrink-0">% objetivo en portafolio:</label>
                <input type="number" min={0} max={100} value={assetForm.target_percentage} onChange={e => setAssetForm(p => ({ ...p, target_percentage: e.target.value }))} className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 text-sm" />
              </div>
              <textarea value={assetForm.notes} onChange={e => setAssetForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notas adicionales" rows={1} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm" />
              <div className="flex gap-2">
                <button onClick={saveAsset} disabled={savingAsset} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">{savingAsset ? "Guardando..." : "Guardar"}</button>
                <button onClick={() => { setShowAssetForm(false); setEditingAssetId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}

          {assets.length === 0 ? (
            <div className="text-center py-12 text-slate-600"><div className="text-4xl mb-3">🏦</div><div className="text-slate-500">Sin activos registrados</div></div>
          ) : (
            <div className="space-y-3">
              {assets.map(asset => {
                const typeInfo = ASSET_TYPES.find(t => t.value === asset.type);
                const pctOfTotal = totalAssets > 0 ? Math.round((Number(asset.current_value) / totalAssets) * 100) : 0;
                return (
                  <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{typeInfo?.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-white">{asset.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{typeInfo?.label} · {asset.role}</div>
                          {asset.notes && <div className="text-xs text-slate-500 italic mt-0.5">{asset.notes}</div>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-green-400">${Number(asset.current_value).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{pctOfTotal}% del portafolio</div>
                        {asset.target_percentage > 0 && (
                          <div className={`text-xs mt-0.5 ${Math.abs(pctOfTotal - Number(asset.target_percentage)) <= 5 ? "text-green-400" : "text-yellow-400"}`}>
                            Objetivo: {asset.target_percentage}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick value update */}
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-xs text-slate-500">Actualizar valor:</span>
                      <input
                        type="number"
                        step="100"
                        defaultValue={asset.current_value}
                        key={asset.id}
                        onBlur={e => { const v = Number(e.target.value); if (v !== asset.current_value && v > 0) updateAssetValue(asset.id, v); }}
                        className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                      <div className="flex gap-2 ml-auto">
                        <button onClick={() => openEditAsset(asset)} className="text-slate-500 hover:text-blue-400 text-xs transition-colors">✎ Editar</button>
                        <button onClick={() => deleteAsset(asset.id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors">✕ Eliminar</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between text-sm font-semibold px-4 py-3 bg-slate-900 border border-green-500/20 rounded-xl">
                <span className="text-slate-400">Total activos</span>
                <span className="text-green-400 text-lg">${totalAssets.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LIABILITIES ──────────────────────────────────── */}
      {activeTab === "liabilities" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowLiabilityForm(true); setEditingLiabilityId(null); setLiabilityForm(EMPTY_LIABILITY); }} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg">+ Nuevo Pasivo</button>
          </div>

          {showLiabilityForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">{editingLiabilityId ? "Editar pasivo" : "Nuevo pasivo"}</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={liabilityForm.name} onChange={e => setLiabilityForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre de la deuda" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                <select value={liabilityForm.type} onChange={e => setLiabilityForm(p => ({ ...p, type: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {LIABILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Saldo $</label>
                  <input type="number" step="0.01" value={liabilityForm.balance} onChange={e => setLiabilityForm(p => ({ ...p, balance: e.target.value }))} placeholder="0" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tasa %</label>
                  <input type="number" step="0.1" value={liabilityForm.interest_rate} onChange={e => setLiabilityForm(p => ({ ...p, interest_rate: e.target.value }))} placeholder="0" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Pago mensual $</label>
                  <input type="number" step="0.01" value={liabilityForm.monthly_payment} onChange={e => setLiabilityForm(p => ({ ...p, monthly_payment: e.target.value }))} placeholder="0" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={liabilityForm.priority} onChange={e => setLiabilityForm(p => ({ ...p, priority: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  <option value="high">🔴 Alta prioridad</option>
                  <option value="medium">🟡 Media prioridad</option>
                  <option value="low">🟢 Baja prioridad</option>
                </select>
                <input value={liabilityForm.strategy} onChange={e => setLiabilityForm(p => ({ ...p, strategy: e.target.value }))} placeholder="Estrategia (pagar primero, mínimo...)" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveLiability} disabled={savingLiability} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">{savingLiability ? "Guardando..." : "Guardar"}</button>
                <button onClick={() => { setShowLiabilityForm(false); setEditingLiabilityId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}

          {liabilities.length === 0 ? (
            <div className="text-center py-12 text-slate-600"><div className="text-4xl mb-3">🎉</div><div className="text-slate-500">Sin pasivos registrados.</div></div>
          ) : (
            <div className="space-y-3">
              {sortedLiabilities.map(liability => {
                const typeInfo = LIABILITY_TYPES.find(t => t.value === liability.type);
                const priority = priorityConfig[liability.priority];
                const pctOfDebt = totalLiabilities > 0 ? Math.round((Number(liability.balance) / totalLiabilities) * 100) : 0;
                return (
                  <div key={liability.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{typeInfo?.icon}</span>
                        <div>
                          <div className="font-semibold text-white">{liability.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{typeInfo?.label}</div>
                          {liability.strategy && <div className="text-xs text-violet-400 mt-0.5">→ {liability.strategy}</div>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-red-400">${Number(liability.balance).toLocaleString()}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority?.badge}`}>{priority?.label} prioridad</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center text-xs bg-slate-800/50 rounded-xl p-3 mb-3">
                      <div><div className="text-white font-medium">{liability.interest_rate}%</div><div className="text-slate-500">Tasa anual</div></div>
                      <div><div className="text-yellow-400 font-medium">${Number(liability.monthly_payment).toLocaleString()}</div><div className="text-slate-500">Pago mensual</div></div>
                      <div><div className="text-slate-300 font-medium">{pctOfDebt}%</div><div className="text-slate-500">de la deuda total</div></div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => openEditLiability(liability)} className="text-slate-500 hover:text-blue-400 text-xs transition-colors">✎ Editar</button>
                      <button onClick={() => deleteLiability(liability.id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors">✕ Eliminar</button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between text-sm font-semibold px-4 py-3 bg-slate-900 border border-red-500/20 rounded-xl">
                <span className="text-slate-400">Total pasivos · ${totalMonthlyPayments.toLocaleString()}/mes</span>
                <span className="text-red-400 text-lg">${totalLiabilities.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEBT PLAN ────────────────────────────────────── */}
      {activeTab === "plan" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-semibold text-white mb-4">🗺️ Plan de Eliminación de Deuda</h3>
            <p className="text-slate-400 text-sm mb-4">Prioridad por tasa de interés más alta primero (método avalancha).</p>
            {liabilities.length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-6">Sin deudas registradas. ¡Excelente!</div>
            ) : (
              <div className="space-y-4">
                {[...liabilities].sort((a, b) => Number(b.interest_rate) - Number(a.interest_rate)).map((l, idx) => {
                  const monthsLeft = l.monthly_payment > 0 ? Math.ceil(Number(l.balance) / Number(l.monthly_payment)) : null;
                  const totalInterest = monthsLeft ? Math.round(Number(l.balance) * (Number(l.interest_rate) / 100 / 12) * monthsLeft) : null;
                  return (
                    <div key={l.id} className="flex items-start gap-4 bg-slate-800/50 rounded-xl p-4">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${idx === 0 ? "bg-red-600" : idx === 1 ? "bg-orange-600" : "bg-slate-600"}`}>{idx + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-white">{l.name}</div>
                          <div className="text-red-400 font-bold">${Number(l.balance).toLocaleString()}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-500">
                          <span>📈 Tasa: {l.interest_rate}%</span>
                          <span>💳 Pago: ${Number(l.monthly_payment).toLocaleString()}/mes</span>
                          {monthsLeft && <span>⏰ ~{monthsLeft} meses</span>}
                        </div>
                        {totalInterest && totalInterest > 0 && (
                          <div className="text-xs text-red-400/70 mt-1">⚠️ Interés estimado total: ~${totalInterest.toLocaleString()}</div>
                        )}
                        {idx === 0 && <div className="text-xs text-green-400 mt-1 font-medium">← Enfocar pagos extras aquí primero</div>}
                      </div>
                    </div>
                  );
                })}

                {/* Summary */}
                <div className="bg-slate-800 rounded-xl p-4 mt-4 space-y-2">
                  <div className="text-sm font-semibold text-white">Resumen del plan</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-400">Deuda total: </span><span className="text-red-400 font-bold">${totalLiabilities.toLocaleString()}</span></div>
                    <div><span className="text-slate-400">Pagos/mes: </span><span className="text-yellow-400 font-bold">${totalMonthlyPayments.toLocaleString()}</span></div>
                    <div><span className="text-slate-400">Deuda/activos: </span><span className={`font-bold ${debtRatio <= 30 ? "text-green-400" : "text-red-400"}`}>{debtRatio}%</span></div>
                    <div><span className="text-slate-400">Deudas activas: </span><span className="text-white font-bold">{liabilities.length}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
