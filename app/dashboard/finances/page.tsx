"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Currency config ───────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", flag: "🇺🇸", name: "Dólar USD" },
  { code: "COP", flag: "🇨🇴", name: "Peso COP" },
  { code: "EUR", flag: "🇪🇺", name: "Euro EUR" },
  { code: "MXN", flag: "🇲🇽", name: "Peso MXN" },
  { code: "GBP", flag: "🇬🇧", name: "Libra GBP" },
  { code: "BRL", flag: "🇧🇷", name: "Real BRL" },
  { code: "ARS", flag: "🇦🇷", name: "Peso ARS" },
  { code: "CAD", flag: "🇨🇦", name: "Dólar CAD" },
  { code: "CLP", flag: "🇨🇱", name: "Peso CLP" },
  { code: "PEN", flag: "🇵🇪", name: "Sol PEN" },
  { code: "BTC", flag: "₿",   name: "Bitcoin" },
  { code: "ETH", flag: "Ξ",   name: "Ethereum" },
];

const INCOME_CATEGORIES = ["Salario", "Freelance", "Inversiones", "Negocio", "Bienes raíces", "Dividendos", "Bono", "Reembolso", "Otro"];
const EXPENSE_CATEGORIES = [
  { name: "Vivienda", icon: "🏠" }, { name: "Alimentación", icon: "🍽️" },
  { name: "Transporte", icon: "🚗" }, { name: "Entretenimiento", icon: "🎬" },
  { name: "Servicios", icon: "⚡" }, { name: "Salud", icon: "💊" },
  { name: "Educación", icon: "📚" }, { name: "Ropa", icon: "👕" },
  { name: "Networking", icon: "🤝" }, { name: "Inversión", icon: "📈" },
  { name: "Deuda", icon: "💳" }, { name: "Suscripciones", icon: "📱" },
  { name: "Donaciones", icon: "❤️" }, { name: "Otro", icon: "➕" },
];

interface Income  { id: string; category: string; description: string; amount: number; date: string; notes: string; currency?: string; amount_usd?: number }
interface Expense { id: string; category: string; description: string; amount: number; date: string; is_debt: boolean; notes: string }
interface Budget  { id: string; category: string; monthly_limit: number; month: string }

// Metric history row (saved in weekly_scorecards as metrics JSONB)
interface MetricSnapshot {
  id: string;
  week_start: string;
  life_score: number;
  metrics: {
    total_income: number;
    total_expense: number;
    balance: number;
    savings_rate: number;
    burn_rate: number;
  };
}

type Tab = "overview" | "incomes" | "expenses" | "budget" | "history";

function getCurrentMonth() { return new Date().toISOString().slice(0, 7); }

// ── Currency Converter Widget ─────────────────────────────────────────────────
function CurrencyConverter({ amount, fromCurrency, onApply }: {
  amount: number;
  fromCurrency: string;
  onApply: (converted: number, toCurrency: string) => void;
}) {
  const [to,       setTo]       = useState("COP");
  const [result,   setResult]   = useState<{ converted: number; rate: number; formatted: { original: string; converted: string } } | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const convert = useCallback(async (amt: number, from: string, target: string) => {
    if (!amt || amt <= 0 || from === target) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/currency?amount=${amt}&from=${from}&to=${target}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Error obteniendo tasa");
      setResult(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => convert(amount, fromCurrency, to), 500);
    return () => clearTimeout(debounceRef.current);
  }, [amount, fromCurrency, to, convert]);

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          💱 Conversor de divisas
        </div>
        <div className="text-xs text-slate-600">Tiempo real · Fuente: ExchangeRate-API</div>
      </div>

      {/* From (read-only) → To (selectable) */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Desde</div>
          <div className="text-white font-bold text-sm">{CURRENCIES.find(c => c.code === fromCurrency)?.flag} {fromCurrency}</div>
          <div className="text-green-400 font-mono text-sm">{amount > 0 ? amount.toLocaleString("es-CO", { minimumFractionDigits: 2 }) : "—"}</div>
        </div>

        <div className="text-slate-500 text-lg shrink-0">→</div>

        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-1 text-center">Hacia</div>
          <select value={to} onChange={e => setTo(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-violet-500 text-center">
            {CURRENCIES.filter(c => c.code !== fromCurrency).map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      {loading && (
        <div className="text-center text-slate-400 text-sm py-2 flex items-center justify-center gap-2">
          <span className="w-3 h-3 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          Consultando tasas...
        </div>
      )}

      {error && <div className="text-red-400 text-xs text-center py-1">{error}</div>}

      {result && !loading && (
        <div className="bg-slate-900/80 rounded-xl p-3 text-center space-y-1">
          <div className="text-2xl font-black text-green-400">{result.formatted.converted}</div>
          <div className="text-xs text-slate-500">
            1 {fromCurrency} = {result.rate.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {to}
          </div>
          <div className="text-xs text-slate-600">{result.formatted.original} → {result.formatted.converted}</div>
          <button onClick={() => onApply(result.converted, to)}
            className="mt-2 bg-violet-600 hover:bg-violet-700 text-white text-xs px-4 py-1.5 rounded-lg transition-colors font-medium">
            Usar {result.formatted.converted} como monto
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const [incomes,   setIncomes]   = useState<Income[]>([]);
  const [expenses,  setExpenses]  = useState<Expense[]>([]);
  const [budgets,   setBudgets]   = useState<Budget[]>([]);
  const [history,   setHistory]   = useState<MetricSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);

  // Income form state
  const [showIncomeForm,  setShowIncomeForm]  = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [savingIncome,    setSavingIncome]    = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    category: "Salario", description: "", amount: "", date: new Date().toISOString().split("T")[0],
    notes: "", currency: "USD",
  });
  const [showConverter, setShowConverter] = useState(false);

  // Expense form state
  const [showExpenseForm,  setShowExpenseForm]  = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [savingExpense,    setSavingExpense]    = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Alimentación", description: "", amount: "", date: new Date().toISOString().split("T")[0], is_debt: false, notes: "",
  });

  // Budget form
  const [showBudgetForm,  setShowBudgetForm]  = useState(false);
  const [savingBudget,    setSavingBudget]    = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: "Alimentación", monthly_limit: "" });

  const supabase = createClient();

  useEffect(() => { load(); }, [selectedMonth]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const monthStart = `${selectedMonth}-01`;
    const monthEnd   = `${selectedMonth}-31`;

    const [{ data: i }, { data: e }, { data: b }, { data: h }] = await Promise.all([
      supabase.from("incomes").select("*").eq("user_id", user.id).gte("date", monthStart).lte("date", monthEnd).order("date", { ascending: false }),
      supabase.from("expenses").select("*").eq("user_id", user.id).gte("date", monthStart).lte("date", monthEnd).order("date", { ascending: false }),
      supabase.from("budgets").select("*").eq("user_id", user.id).eq("month", selectedMonth),
      supabase.from("weekly_scorecards").select("id, week_start, life_score, metrics").eq("user_id", user.id).order("week_start", { ascending: false }).limit(12),
    ]);

    setIncomes(i ?? []);
    setExpenses(e ?? []);
    setBudgets(b ?? []);
    // Only history rows that have finance metrics
    setHistory((h ?? []).filter((row: any) => row.metrics?.total_income !== undefined));
    setLoading(false);
  }

  // ── Save metric snapshot ───────────────────────────────────────────────────
  async function saveMetricSnapshot() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const weekStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
      return d.toISOString().split("T")[0];
    })();

    const metrics = {
      total_income: totalIncome, total_expense: totalExpense,
      balance, savings_rate: savingsRate, burn_rate: burnRate,
      month: selectedMonth,
    };

    await supabase.from("weekly_scorecards").upsert({
      user_id: user.id, week_start: weekStart,
      metrics, life_score: 0,
    }, { onConflict: "user_id,week_start" });

    load();
  }

  // ── Income CRUD ────────────────────────────────────────────────────────────
  async function saveIncome() {
    if (!incomeForm.description.trim() || !incomeForm.amount) return;
    setSavingIncome(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      category:    incomeForm.category,
      description: incomeForm.description,
      amount:      Number(incomeForm.amount),
      date:        incomeForm.date,
      notes:       incomeForm.notes,
      currency:    incomeForm.currency,
    };
    if (editingIncomeId) {
      await supabase.from("incomes").update(payload).eq("id", editingIncomeId);
    } else {
      await supabase.from("incomes").insert({ ...payload, user_id: user.id });
    }
    resetIncomeForm(); setSavingIncome(false); load();
  }

  function resetIncomeForm() {
    setShowIncomeForm(false); setEditingIncomeId(null); setShowConverter(false);
    setIncomeForm({ category: "Salario", description: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "", currency: "USD" });
  }

  function openEditIncome(income: Income) {
    setIncomeForm({
      category: income.category, description: income.description,
      amount: String(income.amount), date: income.date,
      notes: income.notes ?? "", currency: income.currency ?? "USD",
    });
    setEditingIncomeId(income.id); setShowIncomeForm(true);
  }

  async function deleteIncome(id: string) {
    if (!confirm("¿Eliminar este ingreso?")) return;
    await supabase.from("incomes").delete().eq("id", id); load();
  }

  // ── Expense CRUD ───────────────────────────────────────────────────────────
  async function saveExpense() {
    if (!expenseForm.description.trim() || !expenseForm.amount) return;
    setSavingExpense(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { ...expenseForm, amount: Number(expenseForm.amount) };
    if (editingExpenseId) {
      await supabase.from("expenses").update(payload).eq("id", editingExpenseId);
    } else {
      await supabase.from("expenses").insert({ ...payload, user_id: user.id });
    }
    setShowExpenseForm(false); setEditingExpenseId(null); setSavingExpense(false);
    setExpenseForm({ category: "Alimentación", description: "", amount: "", date: new Date().toISOString().split("T")[0], is_debt: false, notes: "" });
    load();
  }

  function openEditExpense(expense: Expense) {
    setExpenseForm({ category: expense.category, description: expense.description, amount: String(expense.amount), date: expense.date, is_debt: expense.is_debt, notes: expense.notes ?? "" });
    setEditingExpenseId(expense.id); setShowExpenseForm(true);
  }

  async function deleteExpense(id: string) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("expenses").delete().eq("id", id); load();
  }

  // ── Budget CRUD ────────────────────────────────────────────────────────────
  async function saveBudget() {
    if (!budgetForm.monthly_limit) return;
    setSavingBudget(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("budgets").upsert(
      { user_id: user.id, category: budgetForm.category, monthly_limit: Number(budgetForm.monthly_limit), month: selectedMonth, current_spent: 0 },
      { onConflict: "user_id,category,month" }
    );
    setShowBudgetForm(false); setBudgetForm({ category: "Alimentación", monthly_limit: "" }); setSavingBudget(false); load();
  }

  async function deleteBudget(id: string) {
    await supabase.from("budgets").delete().eq("id", id); load();
  }

  // ── Computed KPIs ──────────────────────────────────────────────────────────
  const totalIncome  = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const burnRate     = totalExpense;

  // Expenses by category for overview
  const expByCategory = EXPENSE_CATEGORIES.map(cat => {
    const spent  = expenses.filter(e => e.category === cat.name).reduce((s, e) => s + Number(e.amount), 0);
    const budget = budgets.find(b => b.category === cat.name);
    const limit  = budget?.monthly_limit ?? 0;
    const pct    = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    return { ...cat, spent, limit, pct };
  }).filter(c => c.spent > 0 || c.limit > 0);

  const alertColor = (pct: number) =>
    pct >= 100 ? "text-red-400 border-red-500/30 bg-red-900/20"
    : pct >= 80 ? "text-yellow-400 border-yellow-500/30 bg-yellow-900/20"
    : "text-green-400 border-green-500/30 bg-green-900/20";

  const barColor = (pct: number) => pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-green-500";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400">Cargando finanzas...</div></div>;

  return (
    <div className="space-y-6">

      {/* ── HEADER ────────────────────────────────────────────────────────────*/}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Finanzas</h2>
          <p className="text-slate-400 text-sm mt-1">Control de flujo de caja mensual con conversión de divisas</p>
        </div>
        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────────*/}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "💰 Ingresos", value: totalIncome,  color: "text-green-400" },
          { label: "💸 Egresos",  value: totalExpense, color: "text-red-400" },
          { label: "📊 Balance",  value: balance,      color: balance >= 0 ? "text-blue-400" : "text-red-400" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-xs text-slate-500 mb-2">{kpi.label}</div>
            <div className={`text-2xl font-black tabular-nums ${kpi.color}`}>
              ${Math.abs(kpi.value).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "📈 Savings Rate",  value: `${savingsRate}%`,                                                                    color: savingsRate >= 20 ? "text-green-400" : savingsRate >= 10 ? "text-yellow-400" : "text-red-400" },
          { label: "🔥 Burn Rate",     value: `$${burnRate.toLocaleString()}`,                                                      color: "text-orange-400" },
          { label: "📋 Transacciones", value: `${incomes.length + expenses.length}`,                                               color: "text-slate-300" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">{kpi.label}</div>
            <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────────*/}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {([
          ["overview",  "📊 Resumen"],
          ["incomes",   `💰 Ingresos (${incomes.length})`],
          ["expenses",  `💸 Egresos (${expenses.length})`],
          ["budget",    "📋 Presupuesto"],
          ["history",   `📈 Historial (${history.length})`],
        ] as [Tab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
            }`}>{label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-white">Gastos por categoría</h3>
            <button onClick={saveMetricSnapshot}
              className="text-xs text-violet-400 border border-violet-500/40 px-3 py-1.5 rounded-lg hover:bg-violet-900/20 transition-colors">
              💾 Guardar snapshot mensual
            </button>
          </div>

          {expByCategory.length === 0 ? (
            <div className="text-center py-10 text-slate-600">Sin movimientos este mes</div>
          ) : (
            <div className="space-y-2">
              {expByCategory.sort((a, b) => b.spent - a.spent).map(cat => (
                <div key={cat.name} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span><span className="text-sm text-white font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white">${cat.spent.toLocaleString()}</span>
                      {cat.limit > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${alertColor(cat.pct)}`}>
                          {cat.pct}%{cat.pct >= 100 ? " ⚠️" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {cat.limit > 0 && (
                    <>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(cat.pct)}`} style={{ width: `${Math.min(cat.pct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-600 mt-1">
                        <span>Presupuesto: ${cat.limit.toLocaleString()}</span>
                        <span>Disponible: ${Math.max(cat.limit - cat.spent, 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: INCOMES — with currency converter
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "incomes" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowIncomeForm(true); setEditingIncomeId(null); setIncomeForm({ category: "Salario", description: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "", currency: "USD" }); }}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg">+ Nuevo Ingreso</button>
          </div>

          {/* Income form */}
          {showIncomeForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">{editingIncomeId ? "Editar ingreso" : "Nuevo ingreso"}</div>

              <div className="grid grid-cols-2 gap-3">
                <input value={incomeForm.description} onChange={e => setIncomeForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción del ingreso"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                <select value={incomeForm.category} onChange={e => setIncomeForm(p => ({ ...p, category: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Amount + currency selector */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex gap-2">
                  <input type="number" step="0.01" value={incomeForm.amount}
                    onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Monto"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                  <select value={incomeForm.currency} onChange={e => setIncomeForm(p => ({ ...p, currency: e.target.value }))}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                </div>
                <input type="date" value={incomeForm.date} onChange={e => setIncomeForm(p => ({ ...p, date: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
              </div>

              {/* Toggle converter */}
              <div>
                <button onClick={() => setShowConverter(p => !p)}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5">
                  💱 {showConverter ? "Ocultar conversor" : "Convertir a otra divisa"}
                </button>

                {showConverter && (
                  <div className="mt-3">
                    <CurrencyConverter
                      amount={Number(incomeForm.amount) || 0}
                      fromCurrency={incomeForm.currency}
                      onApply={(converted, toCurrency) => {
                        setIncomeForm(p => ({ ...p, amount: converted.toFixed(2), currency: toCurrency }));
                        setShowConverter(false);
                      }}
                    />
                  </div>
                )}
              </div>

              <textarea value={incomeForm.notes} onChange={e => setIncomeForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Notas (opcional)" rows={1}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm" />

              <div className="flex gap-2">
                <button onClick={saveIncome} disabled={savingIncome}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg font-medium">
                  {savingIncome ? "Guardando..." : "Guardar"}</button>
                <button onClick={resetIncomeForm} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}

          {/* Income list */}
          {incomes.length === 0 ? (
            <div className="text-center py-10 text-slate-600">Sin ingresos este mes</div>
          ) : (
            <div className="space-y-2">
              {incomes.map(income => (
                <div key={income.id} className="group flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-sm text-white font-medium">{income.description}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {income.category} · {income.date}
                      {income.currency && income.currency !== "USD" && (
                        <span className="ml-2 text-violet-400">{CURRENCIES.find(c => c.code === income.currency)?.flag} {income.currency}</span>
                      )}
                    </div>
                    {income.notes && <div className="text-xs text-slate-600 italic mt-0.5">{income.notes}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-400 font-bold text-right">
                      +${Number(income.amount).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                      <div className="text-xs text-slate-500 font-normal">{income.currency ?? "USD"}</div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditIncome(income)} className="text-slate-500 hover:text-blue-400 text-xs">✎</button>
                      <button onClick={() => deleteIncome(income.id)} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold px-4 py-2.5 bg-slate-900 border border-green-500/20 rounded-xl">
                <span className="text-slate-400">Total ingresos</span>
                <span className="text-green-400">+${totalIncome.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: EXPENSES
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowExpenseForm(true); setEditingExpenseId(null); }}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg">+ Nuevo Egreso</button>
          </div>

          {showExpenseForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">{editingExpenseId ? "Editar egreso" : "Nuevo egreso"}</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
                <input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="Monto $" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {EXPENSE_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                </select>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={expenseForm.is_debt} onChange={e => setExpenseForm(p => ({ ...p, is_debt: e.target.checked }))} className="accent-violet-500" />
                <span className="text-sm text-slate-400">¿Es deuda / pago de crédito?</span>
              </label>
              <div className="flex gap-2">
                <button onClick={saveExpense} disabled={savingExpense} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg font-medium">{savingExpense ? "Guardando..." : "Guardar"}</button>
                <button onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="text-center py-10 text-slate-600">Sin egresos este mes</div>
          ) : (
            <div className="space-y-2">
              {expenses.map(expense => {
                const cat = EXPENSE_CATEGORIES.find(c => c.name === expense.category);
                return (
                  <div key={expense.id} className="group flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{cat?.icon}</span>
                        <span className="text-sm text-white font-medium">{expense.description}</span>
                        {expense.is_debt && <span className="text-xs text-orange-400 bg-orange-900/30 border border-orange-500/30 px-1.5 py-0.5 rounded-full">Deuda</span>}
                      </div>
                      <div className="text-xs text-slate-500">{expense.category} · {expense.date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-red-400 font-bold">-${Number(expense.amount).toLocaleString("es-CO", { minimumFractionDigits: 2 })}</div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditExpense(expense)} className="text-slate-500 hover:text-blue-400 text-xs">✎</button>
                        <button onClick={() => deleteExpense(expense.id)} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between text-sm font-semibold px-4 py-2.5 bg-slate-900 border border-red-500/20 rounded-xl">
                <span className="text-slate-400">Total egresos</span>
                <span className="text-red-400">-${totalExpense.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: BUDGET
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "budget" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowBudgetForm(true)} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg">+ Nuevo Presupuesto</button>
          </div>
          {showBudgetForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">Presupuesto para {selectedMonth}</div>
              <div className="grid grid-cols-2 gap-3">
                <select value={budgetForm.category} onChange={e => setBudgetForm(p => ({ ...p, category: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {EXPENSE_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                </select>
                <input type="number" value={budgetForm.monthly_limit} onChange={e => setBudgetForm(p => ({ ...p, monthly_limit: e.target.value }))}
                  placeholder="Límite mensual $" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveBudget} disabled={savingBudget} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg font-medium">{savingBudget ? "Guardando..." : "Guardar"}</button>
                <button onClick={() => setShowBudgetForm(false)} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}
          {budgets.length === 0 ? (
            <div className="text-center py-10 text-slate-600">Sin presupuestos definidos</div>
          ) : (
            budgets.map(budget => {
              const cat   = EXPENSE_CATEGORIES.find(c => c.name === budget.category);
              const spent = expenses.filter(e => e.category === budget.category).reduce((s, e) => s + Number(e.amount), 0);
              const pct   = budget.monthly_limit > 0 ? Math.round((spent / budget.monthly_limit) * 100) : 0;
              return (
                <div key={budget.id} className={`bg-slate-900 border rounded-2xl p-5 ${pct >= 100 ? "border-red-500/30" : pct >= 80 ? "border-yellow-500/30" : "border-slate-800"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat?.icon}</span>
                      <span className="font-medium text-white">{budget.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${alertColor(pct)}`}>
                        {pct}%{pct >= 100 ? " DÉFICIT" : pct >= 80 ? " Alerta" : " OK"}
                      </span>
                      <button onClick={() => deleteBudget(budget.id)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-3 text-center text-xs">
                    <div><div className="text-white font-medium">${budget.monthly_limit.toLocaleString()}</div><div className="text-slate-600">Presupuesto</div></div>
                    <div><div className="text-red-400 font-medium">${spent.toLocaleString()}</div><div className="text-slate-600">Gastado</div></div>
                    <div><div className={`font-medium ${spent <= budget.monthly_limit ? "text-green-400" : "text-red-400"}`}>${Math.max(budget.monthly_limit - spent, 0).toLocaleString()}</div><div className="text-slate-600">Disponible</div></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: HISTORY — metric snapshots over time
      ════════════════════════════════════════════════════════════════════*/}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Historial de métricas financieras</h3>
              <p className="text-xs text-slate-500 mt-0.5">Snapshots guardados desde la pestaña Resumen</p>
            </div>
            <button onClick={saveMetricSnapshot}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              💾 Guardar mes actual
            </button>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-4xl mb-3">📈</div>
              <div className="text-slate-400 font-medium mb-1">Sin historial guardado</div>
              <p className="text-slate-600 text-sm max-w-xs mx-auto mb-4">
                Guarda un snapshot cada mes desde la pestaña Resumen para ver tu evolución financiera aquí.
              </p>
              <button onClick={saveMetricSnapshot} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium">
                Guardar snapshot ahora
              </button>
            </div>
          ) : (
            <>
              {/* Trend bars */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="text-sm font-medium text-white mb-4">Evolución de ingresos vs egresos</div>
                <div className="space-y-3">
                  {[...history].reverse().map((snap, i) => {
                    const m = snap.metrics;
                    const maxIncome = Math.max(...history.map(h => h.metrics.total_income), 1);
                    return (
                      <div key={snap.id} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{snap.week_start}</span>
                          <span className={m.balance >= 0 ? "text-green-400" : "text-red-400"}>
                            {m.balance >= 0 ? "+" : ""}${m.balance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-1 h-4">
                          <div className="bg-green-500/60 rounded-sm" style={{ width: `${(m.total_income / maxIncome) * 100}%` }} title={`Ingresos: $${m.total_income.toLocaleString()}`} />
                          <div className="bg-red-500/60 rounded-sm"   style={{ width: `${(m.total_expense / maxIncome) * 100}%` }} title={`Egresos: $${m.total_expense.toLocaleString()}`} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-4 text-xs text-slate-600 mt-2">
                    <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500/60 rounded-sm inline-block" /> Ingresos</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-500/60 rounded-sm inline-block" /> Egresos</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-5 py-3 text-slate-400 font-medium text-xs">Período</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Ingresos</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Egresos</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Balance</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Ahorro %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(snap => {
                      const m = snap.metrics;
                      return (
                        <tr key={snap.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3 text-slate-300">{snap.week_start}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-medium tabular-nums">${m.total_income.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-red-400 font-medium tabular-nums">${m.total_expense.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${m.balance >= 0 ? "text-blue-400" : "text-red-400"}`}>
                            {m.balance >= 0 ? "+" : ""}${m.balance.toLocaleString()}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium tabular-nums ${m.savings_rate >= 20 ? "text-green-400" : m.savings_rate >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                            {m.savings_rate ?? 0}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
