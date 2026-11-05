import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { nextDailyRemind } from "@/lib/tasks/reminders";

export const dynamic = "force-dynamic";

// Avisos con más retraso que esto (p. ej. si el cron estuvo caído) no se envían, solo se reprograman
const STALE_MS = 15 * 60 * 1000;

// Llamado cada minuto por pg_cron en Supabase (ver sql/2026-11-03_tasks_daily_cancel_push.sql)
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const now = Date.now();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, user_id, title, task_type, status, due_time, remind_at, repeat_days, timezone")
    .not("remind_at", "is", null)
    .lte("remind_at", new Date(now).toISOString())
    .neq("status", "cancelled");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const task of tasks ?? []) {
    const remindAt = new Date(task.remind_at).getTime();
    const isDaily = task.task_type === "daily";
    // Una diaria marcada hoy como completada no necesita aviso
    const skip = now - remindAt > STALE_MS || (isDaily && task.status === "completed");

    if (!skip) {
      const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", task.user_id);
      const payload = JSON.stringify({
        title: `En 10 min: ${task.title}`,
        body: `${isDaily ? "Tarea diaria" : "Tarea"} a las ${String(task.due_time).slice(0, 5)}`,
        tag: `task-${task.id}`,
        url: "/dashboard/tasks",
      });
      for (const sub of subs ?? []) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
          sent++;
        } catch (err: any) {
          // Suscripción expirada o revocada → se elimina
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    // Diaria → siguiente día de repetición; general → aviso consumido
    let next: string | null = null;
    if (isDaily) {
      const t = nextDailyRemind(remindAt, now, task.repeat_days, task.timezone);
      next = t === null ? null : new Date(t).toISOString();
    }
    await supabase.from("tasks").update({ remind_at: next }).eq("id", task.id);
  }

  return NextResponse.json({ processed: tasks?.length ?? 0, sent });
}
