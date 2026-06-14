"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const router = useRouter(); const supabase = createClient();
  async function handleLogin() {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push("/"); router.refresh(); }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><h1 className="text-3xl font-bold text-white">Life OS AI</h1><p className="text-slate-400 mt-2">Tu sistema operativo de vida personal</p></div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-white">Iniciar sesion</h2>
          {error && <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}
          <div className="space-y-1"><label className="text-sm text-slate-400">Correo</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" placeholder="tu@email.com" /></div>
          <div className="space-y-1"><label className="text-sm text-slate-400">Contrasena</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" /></div>
          <button onClick={handleLogin} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg">{loading ? "Iniciando..." : "Iniciar sesion"}</button>
          <p className="text-center text-slate-400 text-sm">Sin cuenta? <Link href="/auth/register" className="text-violet-400">Registrate</Link></p>
        </div>
      </div>
    </div>
  );
}