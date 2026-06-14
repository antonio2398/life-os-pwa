"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function AISettingsPage() {
  const [apiKey, setApiKey] = useState(""); const [saved, setSaved] = useState(false); const [saving, setSaving] = useState(false);
  const supabase = createClient();
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("gemini_api_key").eq("id", user.id).single();
      if (data?.gemini_api_key) setApiKey(data.gemini_api_key);
    }
    load();
  }, []);
  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("users").upsert({ id: user.id, gemini_api_key: apiKey, ai_provider: "gemini" });
    setSaved(true); setSaving(false); setTimeout(() => setSaved(false), 3000);
  }
  return (
    <div className="space-y-6 max-w-2xl">
      <div><h2 className="text-2xl font-bold text-white">Configuracion de IA</h2><p className="text-slate-400 text-sm mt-1">Conecta tu cuenta de Google Gemini</p></div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-slate-400">API Key de Gemini</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono text-sm" />
        </div>
        <button onClick={save} disabled={saving || !apiKey} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium text-sm">{saving ? "Guardando..." : saved ? "âœ… Guardado" : "Guardar API Key"}</button>
        <div className="pt-2 border-t border-slate-700 space-y-2">
          <p className="text-sm text-white font-medium">Como obtener tu clave gratis:</p>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline text-sm block">1. Ve a Google AI Studio â†’</a>
          <p className="text-sm text-slate-400">2. Crea una API Key para Gemini 2.0 Flash</p>
          <p className="text-sm text-slate-400">3. Pega la clave arriba y guarda</p>
        </div>
      </div>
    </div>
  );
}