import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const today = new Date();
  if (today.getDay() !== 0) return NextResponse.json({ message: "Solo se ejecuta los domingos" });
  return NextResponse.json({ message: "Cron ejecutado correctamente" });
}