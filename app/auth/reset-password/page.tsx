"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [ready,     setReady]     = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase embeds the token in the URL hash — we need to let it process
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
      }
      // If user is already logged in via the recovery link
      if (event === "SIGNED_IN" && session) {
        setReady(true);
      }
    });

    // Also check if there's already a session (token already consumed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleReset() {
    if (!password || password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  }

  if (!ready) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
        <div className="text-slate-400 text-sm">Verificando enlace de recuperación...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
          <p className="text-slate-400 text-sm mt-2">Elige una contraseña segura para tu cuenta.</p>
        </div>

        {done ? (
          <div className="bg-green-900/30 border border-green-500/40 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">✅</div>
            <div className="text-green-400 font-semibold mb-1">Contraseña actualizada</div>
            <p className="text-slate-400 text-sm">Redirigiendo al dashboard...</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 block mb-2">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleReset(); }}
                placeholder="Repite la contraseña"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            {password && confirm && (
              <div className={`text-xs ${password === confirm ? "text-green-400" : "text-red-400"}`}>
                {password === confirm ? "✓ Las contraseñas coinciden" : "✗ No coinciden"}
              </div>
            )}

            <button
              onClick={handleReset}
              disabled={loading || !password || !confirm}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {loading ? "Actualizando..." : "Guardar nueva contraseña"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
