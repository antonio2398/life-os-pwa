"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-white">¿Olvidaste tu contraseña?</h1>
          <p className="text-slate-400 text-sm mt-2">
            Ingresa tu email y te enviamos un enlace para restablecerla.
          </p>
        </div>

        {sent ? (
          <div className="bg-green-900/30 border border-green-500/40 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">📧</div>
            <div className="text-green-400 font-semibold mb-1">Revisa tu correo</div>
            <p className="text-slate-400 text-sm">
              Enviamos un enlace a <strong className="text-white">{email}</strong>. 
              Válido por 60 minutos.
            </p>
            <Link href="/auth/login" className="block mt-4 text-violet-400 text-sm hover:text-violet-300 transition-colors">
              ← Volver al login
            </Link>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="tu@email.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                autoFocus
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !email.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <div className="text-center">
              <Link href="/auth/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                ← Volver al login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
