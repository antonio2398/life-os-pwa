export function buildWeeklyReportPrompt(data: {
  lifeScore: number; diagnosticScores: Array<{ area: string; score: number }>;
  completedTasks: number; totalTasks: number; habitCompletion: number;
  topPriorities: string[]; ikigaiStatement?: string;
}): string {
  return `Eres el coach personal de Life OS AI. Analiza estos datos y genera un reporte semanal.

Life Score General: ${data.lifeScore}/100
IKIGAI: ${data.ikigaiStatement || "No definido"}
Puntajes por area: ${data.diagnosticScores.map(s => `${s.area}: ${s.score}/100`).join(", ")}
Tareas completadas: ${data.completedTasks}/${data.totalTasks}
Habitos: ${data.habitCompletion}%

Genera: 3 victorias, 2 areas de mejora, 3 prioridades para la proxima semana, 1 insight estrategico.
Responde en espanol, directo y basado en datos.`;
}

export function buildDofaPrompt(data: {
  diagnosticScores: Array<{ area: string; score: number }>;
  ikigai: { strengths: string[]; passions: string[]; worldNeeds: string[]; paidFor: string[] };
  recentGoals: string[];
}): string {
  return `Eres un estratega de vida. Genera un DOFA dinamico basado en estos datos.

Diagnostico: ${data.diagnosticScores.map(s => `${s.area}: ${s.score}/100`).join(", ")}
Fortalezas IKIGAI: ${data.ikigai.strengths.join(", ")}
Pasiones: ${data.ikigai.passions.join(", ")}
Metas activas: ${data.recentGoals.join(", ")}

Responde SOLO con JSON: {"strengths":[],"weaknesses":[],"opportunities":[],"threats":[],"strategies":{"FO":"","DO":"","FA":"","DA":""}}`;
}

export function buildCoachingPrompt(userMessage: string, context: {
  lifeScore: number; topChallenges: string[]; ikigaiStatement?: string;
}): string {
  return `Coach de Life OS AI. Life Score: ${context.lifeScore}/100. Desafios: ${context.topChallenges.join(", ")}. IKIGAI: ${context.ikigaiStatement || "No definido"}.

Usuario: ${userMessage}

Responde como coach empatico y orientado a resultados. Espanol. Max 200 palabras.`;
}