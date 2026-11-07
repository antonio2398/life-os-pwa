"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SharkSymbol } from "@/components/brand/SharkLogo";

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <SharkSymbol size={44} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">¿Olvidaste tu contraseña?</h1>
          <p className="text-ocean-400 text-sm mt-2">
            Ingresa tu email y te enviamos un enlace para restablecerla.
          </p>
        </div>

        {sent ? (
          <div className="bg-green-900/30 border border-green-500/40 rounded-2xl p-6 text-center">
            <div className="text-green-400 font-semibold mb-1">Revisa tu correo</div>
            <p className="text-ocean-400 text-sm">
              Enviamos un enlace a <strong className="text-white">{email}</strong>. 
              Válido por 60 minutos.
            </p>
            <Link href="/auth/login" className="block mt-4 text-brand-400 text-sm hover:text-brand-300 transition-colors">
              ← Volver al login
            </Link>
          </div>
        ) : (
          <div className="bg-ocean-900 border border-ocean-800 rounded-2xl p-6 space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-ocean-400 block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="tu@email.com"
                className="w-full bg-ocean-800 border border-ocean-700 rounded-xl px-4 py-3 text-white placeholder-ocean-500 focus:outline-none focus:border-brand-500"
                autoFocus
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !email.trim()}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <div className="text-center">
              <Link href="/auth/login" className="text-ocean-500 hover:text-ocean-300 text-sm transition-colors">
                ← Volver al login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
