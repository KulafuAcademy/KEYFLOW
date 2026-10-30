import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateKeyboardProgress,
  cumulativeErrorAccuracy,
  evaluateKeyboardAchievement,
  mergeKeyboardAchievement,
  validKeyboardAchievements,
} from "../src/lib/basic-training-achievements";
import {
  basicTypingScore,
  emptyLedger,
  recordGuidedKeystroke,
} from "../src/lib/basic-training";
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

test("one qualifying exercise immediately produces 1/55 and 1.8% progress", () => {
  const lessonIds = keyboardLessons.map((lesson) => lesson.id);
  let input = "";
  let ledger = emptyLedger();
  const target = keyboardLessons[0].text;
  const first = recordGuidedKeystroke(input, "?", target, ledger);
  ledger = first.ledger;
  assert.equal(first.accepted, false);
  for (const key of target) {
    const attempt = recordGuidedKeystroke(input, key, target, ledger);
    input = attempt.input;
    ledger = attempt.ledger;
  }
  const score = basicTypingScore(ledger, 5700);
  assert.equal(score.wpm, 40);
  assert.equal(
    cumulativeErrorAccuracy(ledger.printableKeystrokes, ledger.errors),
    95,
  );
  const achievement = evaluateKeyboardAchievement(
    score.wpm,
    cumulativeErrorAccuracy(ledger.printableKeystrokes, ledger.errors),
  );
  assert.equal(achievement, "clear");

  const awards = mergeKeyboardAchievement(
    [],
    keyboardLessons[0].id,
    achievement,
  );
  const progress = calculateKeyboardProgress(lessonIds, awards);
  assert.equal(progress.cleared, 1);
  assert.equal(progress.total, 55);
  assert.equal(progress.percentage.toFixed(1), "1.8");
  assert.equal(progress.nextUnclearedIndex, 1);

  const repeated = mergeKeyboardAchievement(
    awards,
    keyboardLessons[0].id,
    "clear",
  );
  assert.strictEqual(repeated, awards);
  assert.equal(calculateKeyboardProgress(lessonIds, repeated).cleared, 1);
  assert.equal(
    calculateKeyboardProgress([...lessonIds, lessonIds[0]], repeated).cleared,
    1,
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
    const restored = read(
      KEYS.basicTrainingAchievements,
      [],
      validKeyboardAchievements,
    );
    assert.deepEqual(restored, records);
    const restoredProgress = calculateKeyboardProgress(
      keyboardLessons.map((lesson) => lesson.id),
      restored,
    );
    assert.equal(restoredProgress.cleared, 1);
    assert.equal(restoredProgress.percentage.toFixed(1), "1.8");
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
