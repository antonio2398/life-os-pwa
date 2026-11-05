"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALL_DAYS, computeRemindAt, repeatsOn, toLocalDate } from "@/lib/tasks/reminders";
import { enablePush, isPushEnabled } from "@/lib/push";
import { Ban, Bell, BellOff, Calendar, Check, Clock, Folder, Pencil, RotateCcw, Search, X } from "lucide-react";

const LIFE_AREAS = [
  { id: 1, name: "Salud" },
  { id: 2, name: "Finanzas" },
  { id: 3, name: "Carrera" },
  { id: 4, name: "Relaciones" },
  { id: 5, name: "Espiritualidad" },
  { id: 6, name: "Aprendizaje" },
  { id: 7, name: "Impacto" },
];

const PRIORITY_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  high:   { label: "Alta",  badge: "bg-red-500/20 text-red-400 border border-red-500/30",    dot: "bg-red-500" },
  medium: { label: "Media", badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", dot: "bg-yellow-500" },
  low:    { label: "Baja",  badge: "bg-green-500/20 text-green-400 border border-green-500/30",  dot: "bg-green-500" },
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Orden lunes→domingo con el índice de Date.getDay() (0 = domingo)
const REPEAT_DAY_OPTIONS = [[1, "L"], [2, "M"], [3, "X"], [4, "J"], [5, "V"], [6, "S"], [0, "D"]] as const;

function describeRepeat(days: number[]) {
  if (days.length === 7) return "Todos los días";
  const key = [...days].sort().join(",");
  if (key === "1,2,3,4,5") return "Lunes a viernes";
  if (key === "0,6") return "Fines de semana";
  return REPEAT_DAY_OPTIONS.filter(([d]) => days.includes(d)).map(([d]) => WEEKDAYS[(d + 6) % 7]).join(", ");
}

interface Project {
  id: string;
  goal_id: string | null;
  life_area_id: number;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface Task {
  id: string;
  project_id: string | null;
  life_area_id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  task_type: "daily" | "general";
  repeat_days: number[];
  due_date: string;
  due_time: string;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface ConfirmDialog {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "green" | "red";
  onConfirm: () => void;
}

const EMPTY_PROJECT: Omit<Project, "id"> = { goal_id: null, life_area_id: 1, title: "", description: "", status: "planned", start_date: "", end_date: "" };
const EMPTY_TASK: Omit<Task, "id"> = { project_id: null, life_area_id: 1, title: "", description: "", priority: "medium", status: "pending", task_type: "general", repeat_days: ALL_DAYS, due_date: "", due_time: "", completed_at: null, cancelled_at: null };

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Campos derivados al cambiar de estado (fechas de completada/cancelada y próximo aviso). */
function statusFields(task: Omit<Task, "id">, status: string) {
  const now = new Date().toISOString();
  return {
    status,
    completed_at: status === "completed" ? (task.status === "completed" && task.completed_at ? task.completed_at : now) : null,
    cancelled_at: status === "cancelled" ? (task.status === "cancelled" && task.cancelled_at ? task.cancelled_at : now) : null,
    remind_at: computeRemindAt({ ...task, status }),
  };
}

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"tasks" | "calendar" | "projects">("tasks");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "daily" | "general">("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Calendar
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(() => toLocalDate(new Date()));

  // Forms
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState<Omit<Project, "id">>(EMPTY_PROJECT);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState<Omit<Task, "id">>(EMPTY_TASK);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [savingTask, setSavingTask] = useState(false);

  const supabase = createClient();

  useEffect(() => { load(); isPushEnabled().then(setPushEnabled); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }).order("due_time", { ascending: true, nullsFirst: false }),
    ]);
    const loaded: Task[] = (t ?? []).map(x => ({ ...x, task_type: x.task_type ?? "general", repeat_days: x.repeat_days?.length ? x.repeat_days : ALL_DAYS, due_date: x.due_date ?? "", due_time: x.due_time?.slice(0, 5) ?? "" }));

    // Las tareas diarias completadas en un día anterior vuelven a pendiente
    const today = toLocalDate(new Date());
    const stale = loaded.filter(x => x.task_type === "daily" && x.status === "completed" && x.completed_at && toLocalDate(new Date(x.completed_at)) !== today);
    for (const task of stale) {
      const fields = statusFields(task, "pending");
      await supabase.from("tasks").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", task.id);
      Object.assign(task, fields);
    }

    setProjects(p ?? []);
    setTasks(loaded);
    setLoading(false);
  }

  async function handleEnablePush() {
    const res = await enablePush();
    if (!res.ok) { alert(res.error); return; }
    setPushEnabled(true);
  }

  // ── Projects CRUD ─────────────────────────────────────
  async function saveProject() {
    if (!projectForm.title.trim()) return;
    setSavingProject(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editingProjectId) {
      await supabase.from("projects").update({ ...projectForm, updated_at: new Date().toISOString() }).eq("id", editingProjectId);
    } else {
      await supabase.from("projects").insert({ ...projectForm, user_id: user.id });
    }
    setShowProjectForm(false);
    setEditingProjectId(null);
    setProjectForm(EMPTY_PROJECT);
    setSavingProject(false);
    load();
  }

  function openEditProject(project: Project) {
    setProjectForm({ goal_id: project.goal_id, life_area_id: project.life_area_id, title: project.title, description: project.description, status: project.status, start_date: project.start_date, end_date: project.end_date });
    setEditingProjectId(project.id);
    setShowProjectForm(true);
  }

  async function deleteProject(id: string) {
    if (!confirm("¿Eliminar este proyecto? Las tareas asociadas quedarán sin proyecto.")) return;
    await supabase.from("projects").delete().eq("id", id);
    load();
  }

  // ── Tasks CRUD ────────────────────────────────────────
  async function saveTask() {
    if (!taskForm.title.trim()) return;
    if (taskForm.task_type === "daily" && taskForm.repeat_days.length === 0) { alert("Elige al menos un día de repetición."); return; }
    setSavingTask(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const original = tasks.find(t => t.id === editingTaskId);
    const payload = {
      ...taskForm,
      ...statusFields(original ?? taskForm, taskForm.status),
      remind_at: computeRemindAt(taskForm),
      project_id: taskForm.project_id || null,
      due_date: taskForm.task_type === "daily" ? null : taskForm.due_date || null,
      due_time: taskForm.due_time || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    if (editingTaskId) {
      await supabase.from("tasks").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingTaskId);
    } else {
      await supabase.from("tasks").insert({ ...payload, user_id: user.id });
    }
    setShowTaskForm(false);
    setEditingTaskId(null);
    setTaskForm(EMPTY_TASK);
    setSavingTask(false);
    load();
  }

  function openNewTask(prefill: Partial<Omit<Task, "id">> = {}) {
    setTaskForm({ ...EMPTY_TASK, ...prefill });
    setEditingTaskId(null);
    setShowTaskForm(true);
    setActiveTab("tasks");
  }

  function openEditTask(task: Task) {
    setTaskForm({ project_id: task.project_id, life_area_id: task.life_area_id, title: task.title, description: task.description, priority: task.priority, status: task.status, task_type: task.task_type, repeat_days: task.repeat_days, due_date: task.due_date, due_time: task.due_time, completed_at: task.completed_at, cancelled_at: task.cancelled_at });
    setEditingTaskId(task.id);
    setShowTaskForm(true);
    setActiveTab("tasks");
  }

  async function deleteTask(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  async function setTaskStatus(task: Task, status: string) {
    const fields = statusFields(task, status);
    await supabase.from("tasks").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...fields } : t));
  }

  /** Completar y cancelar piden confirmación; el resto se aplica directo. */
  function requestStatus(task: Task, status: string) {
    if (status === "completed") {
      setConfirmDialog({
        title: "¿Marcar como completada?",
        message: `"${task.title}" pasará a Completadas${task.task_type === "daily" ? " por hoy (mañana vuelve a pendiente)" : ""}.`,
        confirmLabel: "Sí, completar",
        tone: "green",
        onConfirm: () => setTaskStatus(task, "completed"),
      });
    } else if (status === "cancelled") {
      setConfirmDialog({
        title: "¿Cancelar esta tarea?",
        message: `"${task.title}" pasará a Canceladas. Podrás recuperarla cuando quieras.`,
        confirmLabel: "Sí, cancelar",
        tone: "red",
        onConfirm: () => setTaskStatus(task, "cancelled"),
      });
    } else {
      setTaskStatus(task, status);
    }
  }

  function toggleTask(task: Task) {
    requestStatus(task, task.status === "completed" ? "pending" : "completed");
  }

  // Filters
  const query = search.trim().toLowerCase();
  const filteredTasks = tasks.filter(t => {
    if (filterType !== "all" && t.task_type !== filterType) return false;
    if (filterStatus === "active" && (t.status === "completed" || t.status === "cancelled")) return false;
    if (filterStatus !== "active" && filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterArea !== "all" && String(t.life_area_id) !== filterArea) return false;
    if (query) {
      const project = projects.find(p => p.id === t.project_id);
      const haystack = `${t.title} ${t.description ?? ""} ${project?.title ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }).sort((a, b) => {
    // Completadas / canceladas: las más recientes primero
    if (filterStatus === "completed") return (b.completed_at ?? "").localeCompare(a.completed_at ?? "");
    if (filterStatus === "cancelled") return (b.cancelled_at ?? "").localeCompare(a.cancelled_at ?? "");
    return 0;
  });

  const projectTasks = (projectId: string) => tasks.filter(t => t.project_id === projectId);
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const pendingCount = tasks.filter(t => t.status === "pending" || t.status === "in_progress").length;
  const cancelledCount = tasks.filter(t => t.status === "cancelled").length;
  const countable = tasks.length - cancelledCount;

  const getDaysLeft = (date: string) => Math.ceil((new Date(`${date}T00:00`).getTime() - new Date(`${toLocalDate(new Date())}T00:00`).getTime()) / 86400000);

  // Calendar data
  const dailyTasksOn = (day: string) => tasks.filter(t => t.task_type === "daily" && t.status !== "cancelled" && repeatsOn(t, new Date(`${day}T00:00`))).sort((a, b) => (a.due_time || "99").localeCompare(b.due_time || "99"));
  const tasksOn = (day: string) => tasks.filter(t => t.task_type === "general" && t.due_date === day && t.status !== "cancelled").sort((a, b) => (a.due_time || "99").localeCompare(b.due_time || "99"));
  const calendarDays = (() => {
    const first = new Date(calMonth);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  })();
  const todayStr = toLocalDate(new Date());

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400">Cargando...</div></div>;

  const renderTaskRow = (task: Task) => {
    const isCompleted = task.status === "completed";
    const isCancelled = task.status === "cancelled";
    const priority = PRIORITY_CONFIG[task.priority];
    const area = LIFE_AREAS.find(a => a.id === task.life_area_id);
    const project = projects.find(p => p.id === task.project_id);
    const daysLeft = task.task_type === "general" && task.due_date ? getDaysLeft(task.due_date) : null;
    const isOverdue = daysLeft !== null && daysLeft < 0 && !isCompleted && !isCancelled;
    return (
      <div key={task.id} className={`group flex items-start gap-4 bg-slate-900 border rounded-xl p-4 transition-colors ${isOverdue ? "border-red-500/30" : "border-slate-800"} ${isCompleted || isCancelled ? "opacity-70" : ""}`}>
        {/* Checkbox */}
        {isCancelled ? (
          <div className="mt-0.5 w-5 h-5 rounded border-2 border-slate-700 flex-shrink-0 flex items-center justify-center text-slate-600"><Ban size={12} /></div>
        ) : (
          <button
            onClick={() => toggleTask(task)}
            title={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isCompleted ? "bg-violet-600 border-violet-600" : "border-slate-600 hover:border-violet-500"}`}
          >
            {isCompleted && <Check size={12} className="text-white" />}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${isCompleted || isCancelled ? "line-through text-slate-500" : "text-white"}`}>{task.title}</div>
          {task.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</div>}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${task.task_type === "daily" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-slate-700/40 text-slate-400 border border-slate-600/40"}`}>
              {task.task_type === "daily" ? "Diaria" : "General"}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${priority.badge}`}>{priority.label}</span>
            <span className="text-xs text-slate-600">{area?.name}</span>
            {project && <span className="text-xs text-violet-400/70 inline-flex items-center gap-1"><Folder size={12} />{project.title}</span>}
            {task.task_type === "general" && task.due_date && (
              <span className={`text-xs inline-flex items-center gap-1 ${isOverdue ? "text-red-400" : daysLeft !== null && daysLeft <= 3 ? "text-yellow-400" : "text-slate-500"}`}>
                <Calendar size={12} />{task.due_date}{task.due_time && ` ${task.due_time}`} {daysLeft !== null && !isCompleted && !isCancelled && `(${isOverdue ? `${Math.abs(daysLeft)}d vencida` : daysLeft === 0 ? "hoy" : `${daysLeft}d`})`}
              </span>
            )}
            {task.task_type === "daily" && <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Clock size={12} />{describeRepeat(task.repeat_days)}{task.due_time && ` ${task.due_time}`}</span>}
          </div>
          {isCompleted && task.completed_at && <div className="text-xs text-green-400/80 mt-1.5">Completada el {formatDateTime(task.completed_at)}</div>}
          {isCancelled && task.cancelled_at && <div className="text-xs text-red-400/80 mt-1.5">Cancelada el {formatDateTime(task.cancelled_at)}</div>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {isCancelled ? (
            <button onClick={() => setTaskStatus(task, "pending")} className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/40 rounded-lg px-2 py-1 inline-flex items-center gap-1"><RotateCcw size={12} />Recuperar</button>
          ) : (
            <>
              <select
                value={task.status}
                onChange={e => requestStatus(task, e.target.value)}
                className="hidden sm:block bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-400 text-xs focus:outline-none focus:border-violet-500"
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
              <button onClick={() => requestStatus(task, "cancelled")} title="Cancelar tarea" className="text-slate-500 hover:text-orange-400 transition-colors"><Ban size={14} /></button>
            </>
          )}
          <button onClick={() => openEditTask(task)} className="text-slate-500 hover:text-blue-400 text-xs transition-colors"><Pencil size={14} /></button>
          <button onClick={() => deleteTask(task.id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors"><X size={14} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-semibold text-white">{confirmDialog.title}</div>
            <p className="text-sm text-slate-400">{confirmDialog.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDialog(null)} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">No</button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className={`text-white text-sm px-5 py-2 rounded-lg font-medium ${confirmDialog.tone === "green" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Proyectos & Tareas</h2>
          <p className="text-slate-400 text-sm mt-1">Motor de ejecución semanal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnablePush}
            disabled={pushEnabled}
            title={pushEnabled ? "Recibirás un aviso 10 min antes de cada tarea con hora" : "Activar notificaciones push"}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors inline-flex items-center gap-2 ${pushEnabled ? "border-green-500/40 text-green-400" : "border-slate-700 text-slate-300 hover:text-white hover:border-violet-500"}`}
          >
            {pushEnabled ? <><Bell size={14} />Avisos activos</> : <><BellOff size={14} />Activar avisos</>}
          </button>
          <button
            onClick={() => {
              if (activeTab === "projects") { setShowProjectForm(true); setEditingProjectId(null); setProjectForm(EMPTY_PROJECT); }
              else openNewTask(activeTab === "calendar" ? { due_date: selectedDay } : {});
            }}
            className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            + {activeTab === "projects" ? "Nuevo Proyecto" : "Nueva Tarea"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Proyectos activos",  value: projects.filter(p => p.status === "in_progress").length, color: "text-blue-400" },
          { label: "Tareas pendientes",  value: pendingCount, color: "text-yellow-400" },
          { label: "Completadas",        value: completedCount, color: "text-green-400" },
          { label: "Completion rate",    value: countable > 0 ? `${Math.round((completedCount / countable) * 100)}%` : "0%", color: "text-violet-400" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {(["tasks", "calendar", "projects"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
            {tab === "tasks" ? `Tareas (${tasks.length})` : tab === "calendar" ? "Calendario" : `Proyectos (${projects.length})`}
          </button>
        ))}
      </div>

      {/* Task Form (compartido por Tareas y Calendario) */}
      {showTaskForm && activeTab === "tasks" && (
        <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">{editingTaskId ? "Editar tarea" : "Nueva tarea"}</div>
          <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 w-fit">
            {([["general", "General"], ["daily", "Diaria"]] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => setTaskForm(p => ({ ...p, task_type: val }))} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${taskForm.task_type === val ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>{lbl}</button>
            ))}
          </div>
          <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="¿Qué hay que hacer?" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
          <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción (opcional)" rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={taskForm.project_id ?? ""} onChange={e => setTaskForm(p => ({ ...p, project_id: e.target.value || null }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
              <option value="">Sin proyecto</option>
              {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.title}</option>)}
            </select>
            <select value={taskForm.life_area_id} onChange={e => setTaskForm(p => ({ ...p, life_area_id: Number(e.target.value) }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
              {LIFE_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
            <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
              <option value="pending">Pendiente</option>
              <option value="in_progress">En progreso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            {taskForm.task_type === "general" ? (
              <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 text-sm truncate">{describeRepeat(taskForm.repeat_days) || "Sin días"}</div>
            )}
            <input type="time" value={taskForm.due_time} onChange={e => setTaskForm(p => ({ ...p, due_time: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
          </div>
          {taskForm.task_type === "daily" && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400">Repetir los días:</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {REPEAT_DAY_OPTIONS.map(([day, lbl]) => {
                  const on = taskForm.repeat_days.includes(day);
                  return (
                    <button
                      key={day}
                      title={WEEKDAYS[(day + 6) % 7]}
                      onClick={() => setTaskForm(p => ({ ...p, repeat_days: on ? p.repeat_days.filter(d => d !== day) : [...p.repeat_days, day] }))}
                      className={`w-9 h-9 rounded-full text-sm font-medium border transition-colors ${on ? "bg-violet-600 border-violet-600 text-white" : "border-slate-700 text-slate-400 hover:border-violet-500"}`}
                    >
                      {lbl}
                    </button>
                  );
                })}
                <span className="mx-1 text-slate-700">|</span>
                {([["Todos", ALL_DAYS], ["L-V", [1, 2, 3, 4, 5]], ["Fin de semana", [0, 6]]] as const).map(([lbl, days]) => (
                  <button key={lbl} onClick={() => setTaskForm(p => ({ ...p, repeat_days: [...days] }))} className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg px-2 py-1">{lbl}</button>
                ))}
              </div>
            </div>
          )}
          {taskForm.due_time && (taskForm.task_type === "daily" || taskForm.due_date) && (
            <div className="text-xs text-slate-500">Recibirás un aviso 10 minutos antes{!pushEnabled && " (activa los avisos arriba)"}.</div>
          )}
          <div className="flex gap-2">
            <button onClick={saveTask} disabled={savingTask} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">{savingTask ? "Guardando..." : "Guardar"}</button>
            <button onClick={() => { setShowTaskForm(false); setEditingTaskId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── TASKS ────────────────────────────────────────── */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Search size={16} /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tareas por título, descripción o proyecto..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={16} /></button>}
          </div>

          {/* Daily / General */}
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
            {([["all", "Todas"], ["daily", "Diarias"], ["general", "Generales"]] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => setFilterType(val)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filterType === val ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
                {lbl} ({val === "all" ? tasks.length : tasks.filter(t => t.task_type === val).length})
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 flex-wrap">
              {[["active", "Activas"], ["pending", "Pendientes"], ["completed", "Completadas"], ["cancelled", `Canceladas (${cancelledCount})`], ["all", "Todas"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setFilterStatus(val)} className={`px-3 py-1 text-xs rounded-md transition-colors ${filterStatus === val ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>{lbl}</button>
              ))}
            </div>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400 text-xs focus:outline-none">
              <option value="all">Prioridad: Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
            <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400 text-xs focus:outline-none">
              <option value="all">Área: Todas</option>
              {LIFE_AREAS.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
            </select>
            <span className="text-xs text-slate-500 ml-auto">{filteredTasks.length} tarea{filteredTasks.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <div className="text-slate-500">{query ? `Sin resultados para "${search}"` : filterStatus === "cancelled" ? "No hay tareas canceladas" : "No hay tareas con estos filtros"}</div>
            </div>
          ) : (
            <div className="space-y-2">{filteredTasks.map(renderTaskRow)}</div>
          )}
        </div>
      )}

      {/* ── CALENDAR ─────────────────────────────────────── */}
      {activeTab === "calendar" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="text-slate-400 hover:text-white px-3 py-1 rounded-lg border border-slate-700">‹</button>
              <div className="text-white font-semibold capitalize">{calMonth.toLocaleDateString("es", { month: "long", year: "numeric" })}</div>
              <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="text-slate-400 hover:text-white px-3 py-1 rounded-lg border border-slate-700">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-1">
              {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const key = toLocalDate(day);
                const dayTasks = tasksOn(key);
                const inMonth = day.getMonth() === calMonth.getMonth();
                const isSelected = key === selectedDay;
                const hasOverdue = key < todayStr && dayTasks.some(t => t.status !== "completed");
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-[64px] sm:min-h-[84px] rounded-lg border p-1 text-left align-top transition-colors ${isSelected ? "border-violet-500 bg-violet-500/10" : "border-slate-800 hover:border-slate-600"} ${inMonth ? "" : "opacity-40"}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${key === todayStr ? "bg-violet-600 text-white rounded-full w-5 h-5 flex items-center justify-center" : "text-slate-400"}`}>{day.getDate()}</div>
                    <div className="space-y-0.5 hidden sm:block">
                      {dayTasks.slice(0, 2).map(t => (
                        <div key={t.id} className={`text-[10px] truncate rounded px-1 ${t.status === "completed" ? "text-slate-500 line-through" : "text-slate-200 bg-slate-800"}`}>
                          {t.due_time && `${t.due_time} `}{t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && <div className="text-[10px] text-slate-500">+{dayTasks.length - 2} más</div>}
                    </div>
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5 sm:hidden">
                        {dayTasks.slice(0, 3).map(t => <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[t.priority].dot}`} />)}
                      </div>
                    )}
                    {hasOverdue && <div className="text-[10px] text-red-400 hidden sm:block">vencida</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 h-fit">
            <div className="flex items-center justify-between">
              <div className="text-white font-semibold capitalize">
                {new Date(`${selectedDay}T00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <button onClick={() => openNewTask({ due_date: selectedDay })} className="text-xs text-violet-400 hover:text-violet-300">+ Tarea</button>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Generales</div>
              {tasksOn(selectedDay).length === 0 ? (
                <div className="text-sm text-slate-600">Sin tareas este día</div>
              ) : tasksOn(selectedDay).map(t => (
                <button key={t.id} onClick={() => openEditTask(t)} className="w-full flex items-center gap-2 text-left text-sm bg-slate-800/60 hover:bg-slate-800 rounded-lg px-3 py-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_CONFIG[t.priority].dot}`} />
                  <span className="text-xs text-slate-500 w-10 shrink-0">{t.due_time || "—"}</span>
                  <span className={`flex-1 truncate ${t.status === "completed" ? "line-through text-slate-500" : "text-slate-200"}`}>{t.title}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Diarias</div>
              {dailyTasksOn(selectedDay).length === 0 ? (
                <div className="text-sm text-slate-600">Ninguna se repite este día</div>
              ) : dailyTasksOn(selectedDay).map(t => (
                <button key={t.id} onClick={() => openEditTask(t)} className="w-full flex items-center gap-2 text-left text-sm bg-slate-800/60 hover:bg-slate-800 rounded-lg px-3 py-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_CONFIG[t.priority].dot}`} />
                  <span className="text-xs text-slate-500 w-10 shrink-0">{t.due_time || "—"}</span>
                  <span className={`flex-1 truncate ${selectedDay === todayStr && t.status === "completed" ? "line-through text-slate-500" : "text-slate-200"}`}>{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PROJECTS ─────────────────────────────────────── */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          {showProjectForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">{editingProjectId ? "Editar proyecto" : "Nuevo proyecto"}</div>
              <input value={projectForm.title} onChange={e => setProjectForm(p => ({ ...p, title: e.target.value }))} placeholder="Nombre del proyecto" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
              <textarea value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción y objetivo del proyecto" rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <select value={projectForm.life_area_id} onChange={e => setProjectForm(p => ({ ...p, life_area_id: Number(e.target.value) }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {LIFE_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={projectForm.status} onChange={e => setProjectForm(p => ({ ...p, status: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  <option value="planned">Planificado</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completado</option>
                  <option value="paused">En pausa</option>
                </select>
                <input type="date" value={projectForm.end_date} onChange={e => setProjectForm(p => ({ ...p, end_date: e.target.value }))} placeholder="Fecha fin" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProject} disabled={savingProject} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">{savingProject ? "Guardando..." : "Guardar"}</button>
                <button onClick={() => { setShowProjectForm(false); setEditingProjectId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <div className="text-slate-500">Sin proyectos. Agrupa tus tareas en proyectos.</div>
            </div>
          ) : (
            projects.map(project => {
              const pTasks = projectTasks(project.id).filter(t => t.status !== "cancelled");
              const completedT = pTasks.filter(t => t.status === "completed").length;
              const progress = pTasks.length > 0 ? Math.round((completedT / pTasks.length) * 100) : 0;
              const area = LIFE_AREAS.find(a => a.id === project.life_area_id);
              const statusColor: Record<string, string> = { planned: "text-slate-400", in_progress: "text-blue-400", completed: "text-green-400", paused: "text-yellow-400" };
              return (
                <div key={project.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="font-semibold text-white text-base">{project.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{area?.name}{project.end_date && ` · Fin: ${project.end_date}`}</div>
                      {project.description && <div className="text-sm text-slate-400 mt-2">{project.description}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium ${statusColor[project.status]}`}>{project.status}</span>
                      <button onClick={() => openEditProject(project)} className="text-slate-500 hover:text-blue-400 text-xs transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteProject(project.id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors"><X size={14} /></button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{completedT}/{pTasks.length} tareas completadas</span>
                      <span className="text-white font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progress >= 100 ? "bg-green-500" : "bg-violet-500"}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {pTasks.length > 0 && (
                    <div className="space-y-1.5">
                      {pTasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          <span className={task.status === "completed" ? "text-green-500" : "text-slate-600"}>
                            {task.status === "completed" ? <Check size={14} /> : <span className="inline-block w-3 h-3 rounded-full border border-slate-600" />}
                          </span>
                          <span className={`flex-1 ${task.status === "completed" ? "line-through text-slate-500" : "text-slate-300"}`}>{task.title}</span>
                          <span className={`text-xs ${PRIORITY_CONFIG[task.priority].badge.split(" ")[1]}`}>{task.priority}</span>
                        </div>
                      ))}
                      {pTasks.length > 5 && <div className="text-xs text-slate-600 pl-4">+{pTasks.length - 5} más...</div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
