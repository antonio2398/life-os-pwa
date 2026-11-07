"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Target, Zap, CheckSquare, Heart,
  DollarSign, TrendingUp, Settings, LogOut, Compass,
  BarChart2, Menu, X,
} from "lucide-react";
import { SharkLogo } from "@/components/brand/SharkLogo";

const navItems = [
  { href: "/dashboard",           label: "Dashboard",          icon: LayoutDashboard },
  { href: "/dashboard/areas",     label: "Áreas de Vida",      icon: BarChart2 },
  { href: "/dashboard/ikigai",    label: "IKIGAI",             icon: Compass },
  { href: "/dashboard/dofa",      label: "DOFA",               icon: Zap },
  { href: "/dashboard/goals",     label: "Sueños & Metas",     icon: Target },
  { href: "/dashboard/tasks",     label: "Proyectos & Tareas", icon: CheckSquare },
  { href: "/dashboard/habits",    label: "Hábitos",            icon: Heart },
  { href: "/dashboard/finances",  label: "Finanzas",           icon: DollarSign },
  { href: "/dashboard/wealth",    label: "Riqueza",            icon: TrendingUp },
  { href: "/dashboard/settings/ai", label: "Configurar IA",   icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const NavContent = () => (
    <>
      <div className="px-5 py-5 border-b border-ocean-800/80">
        <SharkLogo size={30} subtitle="Sistema operativo de vida" />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-brand-500/10 text-brand-300 font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-brand-400"
                  : "text-ocean-400 hover:text-white hover:bg-ocean-800/70"
              }`}
            >
              <Icon size={16} className={active ? "text-brand-400" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-ocean-800/80">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ocean-400 hover:text-white hover:bg-ocean-800 w-full"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar desktop ─────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-ocean-900/80 backdrop-blur border-r border-ocean-800/80 flex-col shrink-0">
        <NavContent />
      </aside>

      {/* ── Mobile drawer overlay ────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-ocean-950/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-ocean-900 border-r border-ocean-800 flex flex-col z-50 transition-transform duration-300 md:hidden ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="absolute top-4 right-4">
          <button onClick={() => setOpen(false)} className="text-ocean-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <NavContent />
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-ocean-900/90 backdrop-blur border-b border-ocean-800/80 shrink-0">
          <button onClick={() => setOpen(true)} className="text-ocean-400 hover:text-white">
            <Menu size={22} />
          </button>
          <SharkLogo size={24} />
          <div className="ml-auto text-xs text-ocean-500">
            {navItems.find(n => n.href === pathname)?.label ?? ""}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
