import { neon } from "@neondatabase/serverless";
import { resolveDatabaseUrl } from "@/lib/store";

export const dynamic = "force-dynamic";

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username ? "****" : ""}${parsed.username ? "@" : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    return "не удалось разобрать адрес";
  }
}

export async function GET() {
  const source = resolveDatabaseUrl();

  if (!source) {
    return Response.json(
      {
        configured: false,
        message: "Ни одна переменная окружения не содержит рабочий адрес Postgres (DATABASE_URL, POSTGRES_URL и т.п.).",
      },
      { status: 200 }
    );
  }

  const base = { configured: true, envName: source.envName, host: maskUrl(source.url) };

  try {
    const sql = neon(source.url);
    await sql`SELECT 1`;
    const tables = await sql`SELECT to_regclass('public.dashboard_state') AS exists`;
    const tableExists = Boolean((tables[0] as { exists: string | null }).exists);
    return Response.json({ ...base, reachable: true, tableExists });
  } catch (error) {
    return Response.json({
      ...base,
      reachable: false,
      error: error instanceof Error ? error.message : "Неизвестная ошибка подключения",
    });
  }
}
