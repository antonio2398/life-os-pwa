"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  due_date: string;
  completed_at: string | null;
}

const EMPTY_PROJECT: Omit<Project, "id"> = { goal_id: null, life_area_id: 1, title: "", description: "", status: "planned", start_date: "", end_date: "" };
const EMPTY_TASK: Omit<Task, "id"> = { project_id: null, life_area_id: 1, title: "", description: "", priority: "medium", status: "pending", due_date: "", completed_at: null };

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"tasks" | "projects">("tasks");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");

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

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }),
    ]);
    setProjects(p ?? []);
    setTasks(t ?? []);
    setLoading(false);
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
    setSavingTask(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { ...taskForm, project_id: taskForm.project_id || null };
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

  function openEditTask(task: Task) {
    setTaskForm({ project_id: task.project_id, life_area_id: task.life_area_id, title: task.title, description: task.description, priority: task.priority, status: task.status, due_date: task.due_date ?? "", completed_at: task.completed_at });
    setEditingTaskId(task.id);
    setShowTaskForm(true);
  }

  async function deleteTask(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  async function toggleTask(task: Task) {
    const isCompleted = task.status === "completed";
    const newStatus = isCompleted ? "pending" : "completed";
    const completed_at = isCompleted ? null : new Date().toISOString();
    await supabase.from("tasks").update({ status: newStatus, completed_at, updated_at: new Date().toISOString() }).eq("id", task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at } : t));
  }

  async function updateTaskStatus(id: string, status: string) {
    const completed_at = status === "completed" ? new Date().toISOString() : null;
    await supabase.from("tasks").update({ status, completed_at, updated_at: new Date().toISOString() }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, completed_at } : t));
  }

  // Filters
  const filteredTasks = tasks.filter(t => {
    if (filterStatus === "active" && (t.status === "completed" || t.status === "cancelled")) return false;
    if (filterStatus === "completed" && t.status !== "completed") return false;
    if (filterStatus === "pending" && t.status !== "pending") return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterArea !== "all" && String(t.life_area_id) !== filterArea) return false;
    return true;
  });

  const projectTasks = (projectId: string) => tasks.filter(t => t.project_id === projectId);
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const pendingCount = tasks.filter(t => t.status === "pending").length;

  const getDaysLeft = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400">Cargando...</div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Proyectos & Tareas</h2>
          <p className="text-slate-400 text-sm mt-1">Motor de ejecución semanal</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "tasks") { setShowTaskForm(true); setEditingTaskId(null); setTaskForm(EMPTY_TASK); }
            else { setShowProjectForm(true); setEditingProjectId(null); setProjectForm(EMPTY_PROJECT); }
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          + {activeTab === "tasks" ? "Nueva Tarea" : "Nuevo Proyecto"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Proyectos activos",  value: projects.filter(p => p.status === "in_progress").length, color: "text-blue-400" },
          { label: "Tareas pendientes",  value: pendingCount, color: "text-yellow-400" },
          { label: "Completadas",        value: completedCount, color: "text-green-400" },
          { label: "Completion rate",    value: tasks.length > 0 ? `${Math.round((completedCount / tasks.length) * 100)}%` : "0%", color: "text-violet-400" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {(["tasks", "projects"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
            {tab === "tasks" ? `✅ Tareas (${tasks.length})` : `📁 Proyectos (${projects.length})`}
          </button>
        ))}
      </div>

      {/* ── TASKS ────────────────────────────────────────── */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Task Form */}
          {showTaskForm && (
            <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-white">{editingTaskId ? "Editar tarea" : "Nueva tarea"}</div>
              <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="¿Qué hay que hacer?" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
              <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción (opcional)" rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={taskForm.project_id ?? ""} onChange={e => setTaskForm(p => ({ ...p, project_id: e.target.value || null }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  <option value="">Sin proyecto</option>
                  {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.title}</option>)}
                </select>
                <select value={taskForm.life_area_id} onChange={e => setTaskForm(p => ({ ...p, life_area_id: Number(e.target.value) }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  {LIFE_AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  <option value="high">🔴 Alta</option>
                  <option value="medium">🟡 Media</option>
                  <option value="low">🟢 Baja</option>
                </select>
                <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm">
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveTask} disabled={savingTask} className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50">{savingTask ? "Guardando..." : "Guardar"}</button>
                <button onClick={() => { setShowTaskForm(false); setEditingTaskId(null); }} className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-slate-700">Cancelar</button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              {[["active", "Activas"], ["pending", "Pendientes"], ["completed", "Completadas"], ["all", "Todas"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setFilterStatus(val)} className={`px-3 py-1 text-xs rounded-md transition-colors ${filterStatus === val ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>{lbl}</button>
              ))}
            </div>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400 text-xs focus:outline-none">
              <option value="all">Prioridad: Todas</option>
              <option value="high">🔴 Alta</option>
              <option value="medium">🟡 Media</option>
              <option value="low">🟢 Baja</option>
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
              <div className="text-4xl mb-3">✅</div>
              <div className="text-slate-500">No hay tareas con estos filtros</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => {
                const isCompleted = task.status === "completed";
                const priority = PRIORITY_CONFIG[task.priority];
                const area = LIFE_AREAS.find(a => a.id === task.life_area_id);
                const project = projects.find(p => p.id === task.project_id);
                const daysLeft = task.due_date ? getDaysLeft(task.due_date) : null;
                const isOverdue = daysLeft !== null && daysLeft < 0 && !isCompleted;
                return (
                  <div key={task.id} className={`group flex items-start gap-4 bg-slate-900 border rounded-xl p-4 transition-colors ${isOverdue ? "border-red-500/30" : "border-slate-800"} ${isCompleted ? "opacity-60" : ""}`}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task)}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isCompleted ? "bg-violet-600 border-violet-600" : "border-slate-600 hover:border-violet-500"}`}
                    >
                      {isCompleted && <span className="text-white text-xs">✓</span>}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${isCompleted ? "line-through text-slate-500" : "text-white"}`}>{task.title}</div>
                      {task.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</div>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${priority.badge}`}>{priority.label}</span>
                        <span className="text-xs text-slate-600">{area?.name}</span>
                        {project && <span className="text-xs text-violet-400/70">📁 {project.title}</span>}
                        {task.due_date && (
                          <span className={`text-xs ${isOverdue ? "text-red-400" : daysLeft !== null && daysLeft <= 3 ? "text-yellow-400" : "text-slate-500"}`}>
                            📅 {task.due_date} {daysLeft !== null && !isCompleted && `(${isOverdue ? `${Math.abs(daysLeft)}d vencida` : daysLeft === 0 ? "hoy" : `${daysLeft}d`})`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={task.status}
                        onChange={e => updateTaskStatus(task.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-400 text-xs focus:outline-none focus:border-violet-500"
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                      <button onClick={() => openEditTask(task)} className="text-slate-500 hover:text-blue-400 text-xs transition-colors">✎</button>
                      <button onClick={() => deleteTask(task.id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              <div className="text-4xl mb-3">📁</div>
              <div className="text-slate-500">Sin proyectos. Agrupa tus tareas en proyectos.</div>
            </div>
          ) : (
            projects.map(project => {
              const pTasks = projectTasks(project.id);
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
                      <button onClick={() => openEditProject(project)} className="text-slate-500 hover:text-blue-400 text-xs transition-colors">✎</button>
                      <button onClick={() => deleteProject(project.id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors">✕</button>
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
                            {task.status === "completed" ? "✓" : "○"}
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
