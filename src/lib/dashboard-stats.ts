import type { Session } from "./storage";

export const DEFAULT_WPM_GOAL = 40;
export const MIN_WPM_GOAL = 10;
export const MAX_WPM_GOAL = 200;

export type DailyPerformance = {
  date: string;
  label: string;
  wpm: number | null;
  accuracy: number | null;
  sessions: number;
};

export type DashboardStats = {
  currentStreak: number;
  longestStreak: number;
  personalBest: number | null;
  averageWpm: number | null;
  averageAccuracy: number | null;
  totalPracticeMs: number;
  totalSessions: number;
  recentSessions: Session[];
  week: DailyPerformance[];
  goalWpm: number;
  goalProgress: number;
};

function localDateKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayNumber(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function uniqueSessions(sessions: Session[]) {
  const byId = new Map<string, Session>();
  sessions.forEach((session, index) => {
    const key = session.id || `__missing_id_${index}`;
    const existing = byId.get(key);
    if (!existing || Date.parse(session.date) >= Date.parse(existing.date))
      byId.set(key, session);
  });
  return [...byId.values()];
}

export function isCompletedSession(session: Session) {
  return (
    (session.status === "completed" || session.status === "timed-out") &&
    Number.isFinite(session.elapsed) &&
    session.elapsed > 0 &&
    Number.isFinite(new Date(session.date).getTime())
  );
}

export function isValidTypingWpm(session: Session) {
  return (
    isCompletedSession(session) &&
    session.mode !== "writing" &&
    typeof session.wpm === "number" &&
    Number.isFinite(session.wpm) &&
    session.wpm >= 0
  );
}

export function isValidAccuracy(session: Session) {
  return (
    isCompletedSession(session) &&
    session.mode !== "writing" &&
    typeof session.accuracy === "number" &&
    Number.isFinite(session.accuracy) &&
    session.accuracy >= 0 &&
    session.accuracy <= 100
  );
}

export function calculateStreaks(sessions: Session[], today = new Date()) {
  const todayKey = localDateKey(today)!;
  const practicedDays = new Set(
    uniqueSessions(sessions)
      .filter(isCompletedSession)
      .map((session) => localDateKey(session.date))
      .filter((key): key is string => key !== null && key <= todayKey),
  );
  const ordered = [...practicedDays].map(dayNumber).sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of ordered) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  const todayNumber = dayNumber(todayKey);
  const lastDay = ordered.at(-1);
  if (
    lastDay === undefined ||
    todayNumber - lastDay > 1 ||
    todayNumber < lastDay
  )
    return { currentStreak: 0, longestStreak };
  let currentStreak = 1;
  for (let day = lastDay - 1; practicedDays.has(dayKeyFromNumber(day)); day--)
    currentStreak++;
  return { currentStreak, longestStreak };
}

function dayKeyFromNumber(value: number) {
  const date = new Date(value * 86_400_000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

export function getWeeklyPerformance(
  sessions: Session[],
  today = new Date(),
): DailyPerformance[] {
  const todayKey = localDateKey(today)!;
  const [year, month, day] = todayKey.split("-").map(Number);
  const byDay = new Map<string, Session[]>();
  for (const session of uniqueSessions(sessions)) {
    if (!isCompletedSession(session)) continue;
    const key = localDateKey(session.date);
    if (!key) continue;
    const list = byDay.get(key) ?? [];
    list.push(session);
    byDay.set(key, list);
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(year, month - 1, day - (6 - index));
    const key = localDateKey(date)!;
    const records = byDay.get(key) ?? [];
    return {
      date: key,
      label: formatDay(key),
      wpm: average(
        records.filter(isValidTypingWpm).map((record) => record.wpm!),
      ),
      accuracy: average(
        records.filter(isValidAccuracy).map((record) => record.accuracy!),
      ),
      sessions: records.length,
    };
  });
}

export function calculateDashboardStats(
  sessions: Session[],
  goalWpm = DEFAULT_WPM_GOAL,
  today = new Date(),
): DashboardStats {
  const completed = uniqueSessions(sessions).filter(isCompletedSession);
  const speedRecords = completed.filter(isValidTypingWpm);
  const accuracyRecords = completed.filter(isValidAccuracy);
  const safeGoal = Number.isFinite(goalWpm)
    ? Math.min(MAX_WPM_GOAL, Math.max(MIN_WPM_GOAL, goalWpm))
    : DEFAULT_WPM_GOAL;
  const streaks = calculateStreaks(completed, today);
  const averageWpm = average(speedRecords.map((record) => record.wpm!));
  const personalBest = speedRecords.length
    ? Math.max(...speedRecords.map((record) => record.wpm!))
    : null;
  return {
    ...streaks,
    personalBest,
    averageWpm,
    averageAccuracy: average(accuracyRecords.map((record) => record.accuracy!)),
    totalPracticeMs: completed.reduce(
      (total, record) => total + record.elapsed,
      0,
    ),
    totalSessions: completed.length,
    recentSessions: [...completed]
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, 8),
    week: getWeeklyPerformance(completed, today),
    goalWpm: safeGoal,
    goalProgress: Math.min(100, ((averageWpm ?? 0) / safeGoal) * 100),
  };
}
