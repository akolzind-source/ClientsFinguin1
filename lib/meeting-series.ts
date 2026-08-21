import { differenceInDays, isLastDayOfMonth, isValidDateValue, monthsBetween, parseDate } from "./dates";
import type { Meeting, RegularFrequency } from "./types";

// Что именно правим или удаляем, когда встреча входит в серию повторов.
export type MeetingSeriesScope = "single" | "following" | "all";

const MONTH_STEPS: Array<{ frequency: RegularFrequency; months: number }> = [
  { frequency: "monthly", months: 1 },
  { frequency: "quarterly", months: 3 },
];

// Минимум встреч, при котором набор одинаковых встреч считается серией.
const MIN_SERIES_LENGTH = 2;

export function frequencyTitle(frequency: RegularFrequency) {
  if (frequency === "weekly") return "каждую неделю";
  if (frequency === "quarterly") return "каждый квартал";
  return "каждый месяц";
}

function monthStepMatches(previous: Date, next: Date, months: number) {
  if (monthsBetween(previous, next) !== months) return false;
  if (previous.getDate() === next.getDate()) return true;
  // Генератор повторов подрезает день до длины месяца, поэтому 31 января соседствует
  // с 28 февраля: считаем шагом месяца и пару, где хотя бы одна дата — последний день.
  return isLastDayOfMonth(previous) || isLastDayOfMonth(next);
}

// Периодичность шага между двумя соседними встречами или null, если шаг нерегулярный.
function detectStepFrequency(previousDate: string, nextDate: string): RegularFrequency | null {
  if (differenceInDays(previousDate, nextDate) === 7) return "weekly";
  const previous = parseDate(previousDate);
  const next = parseDate(nextDate);
  return MONTH_STEPS.find((step) => monthStepMatches(previous, next, step.months))?.frequency || null;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
}

function normalizeParticipants(value: string) {
  return value
    .split(",")
    .map(normalizeText)
    .filter(Boolean)
    .sort()
    .join(",");
}

// Признаки, по которым старые встречи (созданные до появления seriesId) считаются
// одним повтором: тема, время и состав участников совпадают.
function legacyGroupKey(meeting: Meeting) {
  return [normalizeText(meeting.title), meeting.plannedTime, normalizeParticipants(meeting.participants)].join("|");
}

export function sortKey(meeting: Meeting) {
  return meeting.plannedDate + " " + meeting.plannedTime + " " + meeting.id;
}

function byPlannedOrder(a: Meeting, b: Meeting) {
  return sortKey(a).localeCompare(sortKey(b));
}

// Разовая миграция данных: у встреч, созданных до появления серий, признака повтора нет,
// поэтому восстанавливаем его по совпадающим темам и ровному шагу дат. Встречи с уже
// проставленным seriesId не трогаем, а сам идентификатор выводим из первой встречи серии,
// чтобы повторные загрузки давали тот же результат.
export function linkLegacyMeetingSeries(meetings: Meeting[]): Meeting[] {
  const candidates = meetings.filter((meeting) => !meeting.seriesId && isValidDateValue(meeting.plannedDate));
  if (candidates.length < MIN_SERIES_LENGTH) return meetings;

  const groups = new Map<string, Meeting[]>();
  for (const meeting of candidates) {
    const key = legacyGroupKey(meeting);
    const group = groups.get(key);
    if (group) group.push(meeting);
    else groups.set(key, [meeting]);
  }

  const patches = new Map<string, { seriesId: string; seriesFrequency: RegularFrequency }>();
  for (const group of groups.values()) {
    if (group.length < MIN_SERIES_LENGTH) continue;
    const ordered = [...group].sort(byPlannedOrder);

    let runStart = 0;
    let runFrequency: RegularFrequency | null = null;
    const closeRun = (endIndex: number) => {
      const run = ordered.slice(runStart, endIndex + 1);
      if (!runFrequency || run.length < MIN_SERIES_LENGTH) return;
      const seriesId = "series-" + run[0].id;
      for (const meeting of run) patches.set(meeting.id, { seriesId, seriesFrequency: runFrequency });
    };

    for (let index = 1; index < ordered.length; index += 1) {
      const frequency = detectStepFrequency(ordered[index - 1].plannedDate, ordered[index].plannedDate);
      if (frequency && (runFrequency === null || runFrequency === frequency)) {
        runFrequency = frequency;
        continue;
      }
      closeRun(index - 1);
      runStart = index;
      runFrequency = null;
    }
    closeRun(ordered.length - 1);
  }

  if (patches.size === 0) return meetings;
  return meetings.map((meeting) => {
    const patch = patches.get(meeting.id);
    return patch ? { ...meeting, ...patch } : meeting;
  });
}

// Все встречи серии по возрастанию плановой даты. Для одиночной встречи — она сама.
export function getSeriesOccurrences(meetings: Meeting[], meeting: Meeting): Meeting[] {
  if (!meeting.seriesId) return [meeting];
  const occurrences = meetings.filter((item) => item.seriesId === meeting.seriesId);
  if (occurrences.length === 0) return [meeting];
  return occurrences.sort(byPlannedOrder);
}

export function isSeriesMeeting(meetings: Meeting[], meeting: Meeting) {
  return Boolean(meeting.seriesId) && getSeriesOccurrences(meetings, meeting).length > 1;
}

// Встречи, к которым применяется выбранное действие. «Последующие» считаются по плановой
// дате: перенесённая назад встреча в хвост серии не попадает.
export function selectSeriesScope(meetings: Meeting[], meeting: Meeting, scope: MeetingSeriesScope): Meeting[] {
  if (scope === "single" || !meeting.seriesId) return [meeting];
  const occurrences = getSeriesOccurrences(meetings, meeting);
  if (scope === "all") return occurrences;
  const cutoff = sortKey(meeting);
  return occurrences.filter((item) => item.id === meeting.id || sortKey(item).localeCompare(cutoff) >= 0);
}

// Сколько встреч затронет каждый из вариантов — показываем прямо в диалоге выбора.
export function getScopeCounts(meetings: Meeting[], meeting: Meeting) {
  return {
    single: 1,
    following: selectSeriesScope(meetings, meeting, "following").length,
    all: selectSeriesScope(meetings, meeting, "all").length,
  };
}
