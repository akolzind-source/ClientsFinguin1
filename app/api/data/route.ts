import { getDashboardData, saveDashboardData } from "@/lib/store";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DashboardData>;
  return typeof candidate.clientName === "string"
    && candidate.clientName.length <= 160
    && Array.isArray(candidate.tasks)
    && Array.isArray(candidate.ideas)
    && Array.isArray(candidate.meetings)
    && Array.isArray(candidate.regularTasks)
    && candidate.tasks.length <= 500
    && candidate.ideas.length <= 500
    && candidate.meetings.length <= 500
    && candidate.regularTasks.length <= 500;
}

export async function GET() {
  try {
    const data = await getDashboardData();
    return Response.json(
      { data, storage: process.env.DATABASE_URL ? "postgres" : "local" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to load dashboard data", error);
    return Response.json({ error: "Не удалось загрузить данные" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 1_500_000) {
      return Response.json({ error: "Слишком большой объём данных" }, { status: 413 });
    }

    const payload = await request.json() as { data?: unknown };
    if (!isDashboardData(payload.data)) {
      return Response.json({ error: "Некорректный формат данных" }, { status: 400 });
    }

    await saveDashboardData(payload.data);
    return Response.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to save dashboard data", error);
    return Response.json({ error: "Не удалось сохранить изменения" }, { status: 500 });
  }
}
