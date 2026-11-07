"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SharkSymbol } from "@/components/brand/SharkLogo";
export default function RegisterPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); const supabase = createClient();
  async function handleRegister() {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { setSuccess(true); setTimeout(() => router.push("/auth/login"), 3000); }
  }
  if (success) return <div className="min-h-screen flex items-center justify-center"><div className="text-center space-y-4"><div className="text-5xl"></div><h2 className="text-2xl font-bold text-white">Cuenta creada</h2><p className="text-ocean-400">Revisa tu correo para confirmar.</p></div></div>;
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><SharkSymbol size={60} className="mx-auto mb-4" /><h1 className="text-3xl font-bold text-white tracking-tight">Shark Life</h1><p className="text-ocean-400 mt-2">Comienza tu transformación</p></div>
        <div className="bg-ocean-900 border border-ocean-800 rounded-2xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-white">Crear cuenta</h2>
          {error && <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}
          <div className="space-y-1"><label className="text-sm text-ocean-400">Correo</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-ocean-800 border border-ocean-700 rounded-lg px-4 py-2.5 text-white placeholder-ocean-500 focus:outline-none focus:border-brand-500" placeholder="tu@email.com" /></div>
          <div className="space-y-1"><label className="text-sm text-ocean-400">Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRegister()} className="w-full bg-ocean-800 border border-ocean-700 rounded-lg px-4 py-2.5 text-white placeholder-ocean-500 focus:outline-none focus:border-brand-500" placeholder="Mínimo 8 caracteres" /></div>
          <button onClick={handleRegister} disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg">{loading ? "Creando..." : "Crear cuenta gratis"}</button>
          <p className="text-center text-ocean-400 text-sm">¿Ya tienes cuenta? <Link href="/auth/login" className="text-brand-400">Inicia sesión</Link></p>
        </div>
      </div>
    </div>
  );
}