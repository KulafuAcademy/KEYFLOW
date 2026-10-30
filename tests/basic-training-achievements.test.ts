import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateKeyboardProgress,
  cumulativeErrorAccuracy,
  evaluateKeyboardAchievement,
  mergeKeyboardAchievement,
  validKeyboardAchievements,
} from "../src/lib/basic-training-achievements";
import { keyboardLessons } from "../src/lib/basic-training-content";
import { KEYS, read, write } from "../src/lib/storage";

test("achievement thresholds include their exact WPM and accuracy boundaries", () => {
  assert.equal(evaluateKeyboardAchievement(39.99, 100), "completed");
  assert.equal(evaluateKeyboardAchievement(40, 94.99), "completed");
  assert.equal(evaluateKeyboardAchievement(40, 95), "clear");
  assert.equal(evaluateKeyboardAchievement(50, 97.99), "clear");
  assert.equal(evaluateKeyboardAchievement(50, 98), "excellent");
  assert.equal(evaluateKeyboardAchievement(80, 100), "excellent");
});

test("achievement accuracy keeps corrected mistakes in the denominator", () => {
  assert.equal(cumulativeErrorAccuracy(0, 0), 100);
  assert.equal(cumulativeErrorAccuracy(20, 0), 100);
  assert.equal(cumulativeErrorAccuracy(20, 1), 95);
  assert.equal(cumulativeErrorAccuracy(20, 2), 90);
  assert.equal(cumulativeErrorAccuracy(2, 5), 0);
  assert.equal(
    evaluateKeyboardAchievement(55, cumulativeErrorAccuracy(20, 1)),
    "clear",
  );
  assert.equal(
    evaluateKeyboardAchievement(55, cumulativeErrorAccuracy(20, 2)),
    "completed",
  );
});

test("repeating lessons preserves achievements and upgrades the best level", () => {
  const completed = mergeKeyboardAchievement([], "lesson-a", "completed");
  const cleared = mergeKeyboardAchievement(completed, "lesson-a", "clear");
  assert.deepEqual(
    mergeKeyboardAchievement(cleared, "lesson-a", "completed"),
    cleared,
  );
  const excellent = mergeKeyboardAchievement(cleared, "lesson-a", "excellent");
  assert.deepEqual(excellent, [{ lessonId: "lesson-a", status: "excellent" }]);
  assert.deepEqual(
    mergeKeyboardAchievement(excellent, "lesson-a", "clear"),
    excellent,
  );
});

test("progress derives its denominator from the bank and excludes completed-but-uncleared", () => {
  const ids = keyboardLessons.slice(0, 4).map((lesson) => lesson.id);
  const progress = calculateKeyboardProgress(ids, [
    { lessonId: ids[0], status: "clear" },
    { lessonId: ids[1], status: "excellent" },
    { lessonId: ids[2], status: "completed" },
    { lessonId: "outside-bank", status: "excellent" },
  ]);
  assert.deepEqual(progress, {
    cleared: 2,
    excellent: 1,
    total: 4,
    percentage: 50,
    nextUnclearedIndex: 2,
  });
  assert.equal(
    calculateKeyboardProgress(
      ids,
      ids.map((lessonId) => ({ lessonId, status: "clear" as const })),
    ).nextUnclearedIndex,
    null,
  );
});

test("achievement records validate and persist without changing session history", () => {
  const original = globalThis.localStorage;
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  try {
    const records = [
      { lessonId: keyboardLessons[0].id, status: "clear" as const },
    ];
    assert.equal(validKeyboardAchievements(records), true);
    assert.equal(write(KEYS.basicTrainingAchievements, records), true);
    assert.deepEqual(
      read(KEYS.basicTrainingAchievements, [], validKeyboardAchievements),
      records,
    );
    assert.deepEqual(values.get(KEYS.history), undefined);
    values.set(
      KEYS.basicTrainingAchievements,
      '[{"lessonId":"home-01","status":"not-started"}]',
    );
    assert.deepEqual(
      read(KEYS.basicTrainingAchievements, [], validKeyboardAchievements),
      [],
    );
  } finally {
    if (original === undefined)
      Reflect.deleteProperty(globalThis, "localStorage");
    else
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
  }
});
