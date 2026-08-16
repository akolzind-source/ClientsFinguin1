import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { DEFAULT_DATA } from "./default-data";
import type { DashboardData } from "./types";

const localDataPath = path.join(process.cwd(), "work", "dashboard-data.json");

function normalizePerson(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniquePeople(values: string[]) {
  const seen = new Set<string>();
  return values.reduce<string[]>((result, item) => {
    const person = normalizePerson(item);
    const key = person.toLocaleLowerCase("ru");
    if (!person || seen.has(key)) return result;
    seen.add(key);
    result.push(person);
    return result;
  }, []);
}

function derivePeople(value: Partial<DashboardData>) {
  return uniquePeople([
    ...(value.tasks || []).map((task) => task.assignee),
    ...(value.ideas || []).map((idea) => idea.owner),
    ...(value.regularTasks || []).map((task) => task.assignee),
    ...(value.meetings || []).flatMap((meeting) => meeting.participants.split(",")),
  ]);
}

function normalizeDashboardData(value: Partial<DashboardData>): DashboardData {
  return {
    ...structuredClone(DEFAULT_DATA),
    ...value,
    tasks: Array.isArray(value.tasks) ? value.tasks : structuredClone(DEFAULT_DATA.tasks),
    ideas: Array.isArray(value.ideas) ? value.ideas : structuredClone(DEFAULT_DATA.ideas),
    meetings: Array.isArray(value.meetings) ? value.meetings.map((meeting) => ({ ...meeting, duration: meeting.duration || "" })) : structuredClone(DEFAULT_DATA.meetings),
    regularTasks: Array.isArray(value.regularTasks) ? value.regularTasks : structuredClone(DEFAULT_DATA.regularTasks),
    people: Array.isArray(value.people) ? uniquePeople(value.people) : derivePeople(value)
  };
}

async function ensureTable() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const sql = neon(databaseUrl);
  await sql`CREATE TABLE IF NOT EXISTS dashboard_state (
    id INTEGER PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  return sql;
}

export async function getDashboardData(): Promise<DashboardData> {
  const sql = await ensureTable();
  if (sql) {
    const seed = JSON.stringify(DEFAULT_DATA);
    await sql`INSERT INTO dashboard_state (id, data)
      VALUES (1, ${seed}::jsonb)
      ON CONFLICT (id) DO NOTHING`;
    const rows = await sql`SELECT data FROM dashboard_state WHERE id = 1`;
    return normalizeDashboardData(rows[0].data as Partial<DashboardData>);
  }

  try {
    return normalizeDashboardData(JSON.parse(await fs.readFile(localDataPath, "utf8")) as Partial<DashboardData>);
  } catch {
    await fs.mkdir(path.dirname(localDataPath), { recursive: true });
    await fs.writeFile(localDataPath, JSON.stringify(DEFAULT_DATA, null, 2), "utf8");
    return structuredClone(DEFAULT_DATA);
  }
}

export async function saveDashboardData(data: DashboardData): Promise<void> {
  const sql = await ensureTable();
  if (sql) {
    const payload = JSON.stringify(data);
    await sql`INSERT INTO dashboard_state (id, data, updated_at)
      VALUES (1, ${payload}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
    return;
  }

  await fs.mkdir(path.dirname(localDataPath), { recursive: true });
  const temporaryPath = localDataPath + ".tmp";
  await fs.writeFile(temporaryPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(temporaryPath, localDataPath);
}
