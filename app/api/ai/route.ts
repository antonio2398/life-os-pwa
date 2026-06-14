import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWeeklyReportPrompt, buildCoachingPrompt } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { data: userData } = await supabase.from("users").select("gemini_api_key").eq("id", user.id).single();
    const { type, message } = await req.json();
    if (type === "test") return NextResponse.json({ message: userData?.gemini_api_key ? "API Key detectada âœ…" : "No hay API key configurada." });
    if (!userData?.gemini_api_key) return NextResponse.json({ error: "Configura tu API Key en Ajustes > IA" }, { status: 400 });
    const prompt = type === "coaching" && message ? buildCoachingPrompt(message, { lifeScore: 70, topChallenges: ["Habitos", "Metas"] }) : buildWeeklyReportPrompt({ lifeScore: 70, diagnosticScores: [], completedTasks: 5, totalTasks: 10, habitCompletion: 75, topPriorities: [] });
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${userData.gemini_api_key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const geminiData = await geminiRes.json();
    const content = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";
    await supabase.from("ai_recommendations").insert({ user_id: user.id, type: type as "dofa" | "weekly_report" | "coaching", content, generated_at: new Date().toISOString() });
    return NextResponse.json({ content, type });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}