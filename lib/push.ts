function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function isPushEnabled() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

/** Pide permiso, suscribe este dispositivo y lo guarda en Supabase. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Este navegador no soporta notificaciones push. En iPhone, instala la app en la pantalla de inicio primero." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Permiso de notificaciones denegado." };

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return { ok: false, error: "Service worker no registrado (las notificaciones solo funcionan en la versión de producción)." };

  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }));

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
  return res.ok ? { ok: true } : { ok: false, error: "No se pudo guardar la suscripción." };
}
