import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateDashboardStats,
  calculateStreaks,
  getWeeklyPerformance,
  isCompletedSession,
} from "../src/lib/dashboard-stats";
import {
  KEYS,
  read,
  validHistory,
  write,
  type Session,
} from "../src/lib/storage";

function session(
  id: string,
  date: Date,
  overrides: Partial<Session> = {},
): Session {
  return {
    id,
    date: date.toISOString(),
    mode: "keyboard",
    title: "Home row",
    elapsed: 60_000,
    wpm: 20,
    accuracy: 95,
    status: "completed",
    ...overrides,
  };
}

test("dashboard streaks use consecutive device-local calendar dates", () => {
  const today = new Date(2026, 9, 30, 12);
  const records = [28, 29, 30].map((day) =>
    session(String(day), new Date(2026, 9, day, 12)),
  );
  assert.deepEqual(calculateStreaks(records, today), {
    currentStreak: 3,
    longestStreak: 3,
  });
  assert.deepEqual(
    calculateStreaks(
      records.filter((record) => !record.id.includes("30")),
      today,
    ),
    { currentStreak: 2, longestStreak: 2 },
  );
});

test("streaks allow yesterday as active, reset after a gap, and ignore future days", () => {
  const today = new Date(2026, 9, 30, 12);
  const yesterday = session("yesterday", new Date(2026, 9, 29, 12));
  assert.deepEqual(calculateStreaks([yesterday], today), {
    currentStreak: 1,
    longestStreak: 1,
  });
  const old = session("old", new Date(2026, 9, 27, 12));
  const future = session("future", new Date(2026, 10, 1, 12));
  assert.deepEqual(calculateStreaks([old, future], today), {
    currentStreak: 0,
    longestStreak: 1,
  });
});

test("dashboard metrics include only completed unique sessions with valid typing metrics", () => {
  const today = new Date(2026, 9, 30, 12);
  const one = session("same", new Date(2026, 9, 30, 9), {
    wpm: 20,
    accuracy: 90,
    elapsed: 60_000,
  });
  const duplicate = session("same", new Date(2026, 9, 30, 10), {
    wpm: 40,
    accuracy: 98,
    elapsed: 120_000,
  });
  const second = session("second", new Date(2026, 9, 29, 15), {
    wpm: 40,
    accuracy: 100,
    elapsed: 180_000,
    status: "timed-out",
  });
  const writing = session("writing", new Date(2026, 9, 30, 11), {
    mode: "writing",
    wpm: 200,
    accuracy: 100,
    words: 170,
    elapsed: 300_000,
  });
  const invalidWpm = session("invalid-wpm", new Date(2026, 9, 30, 11), {
    wpm: Number.NaN,
    accuracy: 80,
  });
  const zeroTime = session("zero-time", new Date(2026, 9, 30, 11), {
    elapsed: 0,
    wpm: 120,
    accuracy: 100,
  });
  const unfinished = session("unfinished", new Date(2026, 9, 30, 11), {
    status: "paused",
  });
  const stats = calculateDashboardStats(
    [one, duplicate, second, writing, invalidWpm, zeroTime, unfinished],
    40,
    today,
  );

  assert.equal(stats.personalBest, 40);
  assert.equal(stats.averageWpm, 40);
  assert.ok(Math.abs(stats.averageAccuracy! - 92.6666666667) < 0.0001);
  assert.equal(stats.totalSessions, 4);
  assert.equal(stats.totalPracticeMs, 660_000);
  assert.equal(stats.recentSessions.length, 4);
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.goalProgress, 100);
  assert.equal(stats.recentSessions[0].id, "writing");
});

test("weekly performance contains seven local dates and aggregates daily typing metrics", () => {
  const today = new Date(2026, 9, 30, 12);
  const records = [
    session("a", new Date(2026, 9, 30, 8), { wpm: 20, accuracy: 90 }),
    session("b", new Date(2026, 9, 30, 10), { wpm: 40, accuracy: 100 }),
    session("writing", new Date(2026, 9, 30, 11), {
      mode: "writing",
      wpm: 90,
      accuracy: 90,
    }),
  ];
  const week = getWeeklyPerformance(records, today);
  assert.equal(week.length, 7);
  assert.equal(week.at(-1)?.date, "2026-10-30");
  assert.equal(week.at(-1)?.wpm, 30);
  assert.equal(week.at(-1)?.accuracy, 95);
  assert.equal(week.at(-1)?.sessions, 3);
  assert.equal(week[0].wpm, null);
});

test("new-user stats are empty and goal progress is clamped to its configured target", () => {
  const empty = calculateDashboardStats([], 40, new Date(2026, 9, 30, 12));
  assert.equal(empty.personalBest, null);
  assert.equal(empty.averageWpm, null);
  assert.equal(empty.averageAccuracy, null);
  assert.equal(empty.currentStreak, 0);
  assert.equal(empty.longestStreak, 0);
  assert.equal(empty.totalSessions, 0);
  assert.equal(empty.goalProgress, 0);

  const active = session("goal", new Date(2026, 9, 30, 12), { wpm: 25 });
  assert.equal(calculateDashboardStats([active], 50).goalProgress, 50);
  assert.equal(calculateDashboardStats([active], 5).goalWpm, 10);
  assert.equal(calculateDashboardStats([active], 500).goalWpm, 200);
});

test("sessions without a real completion and positive duration cannot affect dashboard totals", () => {
  const complete = session("done", new Date(2026, 9, 30, 12));
  assert.equal(isCompletedSession(complete), true);
  assert.equal(isCompletedSession({ ...complete, status: "active" }), false);
  assert.equal(isCompletedSession({ ...complete, elapsed: 0 }), false);
  assert.equal(isCompletedSession({ ...complete, date: "not-a-date" }), false);
});

test("history storage safely falls back for malformed dashboard data", () => {
  const previous = globalThis.localStorage;
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  try {
    values.set(KEYS.history, "{broken");
    assert.deepEqual(read(KEYS.history, [], validHistory), []);
    const records = [session("saved", new Date(2026, 9, 30, 12))];
    assert.equal(write(KEYS.history, records), true);
    assert.deepEqual(read(KEYS.history, [], validHistory), records);
  } finally {
    if (previous === undefined)
      Reflect.deleteProperty(globalThis, "localStorage");
    else
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previous,
      });
  }
});
