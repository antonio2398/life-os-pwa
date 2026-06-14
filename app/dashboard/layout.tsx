"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Target, Zap, CheckSquare, Heart, DollarSign, TrendingUp, Settings, LogOut, Compass, BarChart2 } from "lucide-react";
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/areas", label: "Areas de Vida", icon: BarChart2 },
  { href: "/dashboard/ikigai", label: "IKIGAI", icon: Compass },
  { href: "/dashboard/dofa", label: "DOFA", icon: Zap },
  { href: "/dashboard/goals", label: "Suenos & Metas", icon: Target },
  { href: "/dashboard/tasks", label: "Proyectos & Tareas", icon: CheckSquare },
  { href: "/dashboard/habits", label: "Habitos", icon: Heart },
  { href: "/dashboard/finances", label: "Finanzas", icon: DollarSign },
  { href: "/dashboard/wealth", label: "Riqueza", icon: TrendingUp },
  { href: "/dashboard/settings/ai", label: "Configurar IA", icon: Settings },
];
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const supabase = createClient();
  async function handleLogout() { await supabase.auth.signOut(); router.push("/auth/login"); }
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800"><h1 className="text-lg font-bold text-white">Life OS AI</h1><p className="text-xs text-slate-500 mt-0.5">Sistema Operativo Personal</p></div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-violet-600 text-white font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><Icon size={16} />{label}</Link>;
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 w-full"><LogOut size={16} />Cerrar sesion</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto"><div className="max-w-6xl mx-auto p-8">{children}</div></main>
    </div>
  );
}