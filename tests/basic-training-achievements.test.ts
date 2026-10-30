import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateKeyboardProgress,
  cumulativeErrorAccuracy,
  evaluateKeyboardAchievement,
  keyboardAchievementIsPerfect,
  keyboardAchievementMedal,
  mergeKeyboardAchievement,
  shouldPlayAchievementSound,
  validKeyboardAchievements,
} from "../src/lib/basic-training-achievements";
import {
  basicTypingScore,
  emptyLedger,
  recordGuidedKeystroke,
} from "../src/lib/basic-training";
import { keyboardLessons } from "../src/lib/basic-training-content";
import { KEYS, read, write } from "../src/lib/storage";

test("medal thresholds award only the highest qualifying tier", () => {
  assert.deepEqual(evaluateKeyboardAchievement(0, 84.99), {
    medal: null,
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(0, 85), {
    medal: "bronze",
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(29.99, 90), {
    medal: "bronze",
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(29.99, 95), {
    medal: "bronze",
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(30, 89.99), {
    medal: "bronze",
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(30, 90), {
    medal: "silver",
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(39.99, 94.99), {
    medal: "silver",
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(40, 94.99), {
    medal: "silver",
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(40, 95), {
    medal: "gold",
    perfect: false,
  });
  assert.deepEqual(evaluateKeyboardAchievement(90, 100), {
    medal: "gold",
    perfect: true,
  });
});

test("PERFECT is awarded independently of medal rank", () => {
  const result = evaluateKeyboardAchievement(15, 100);
  assert.deepEqual(result, { medal: "bronze", perfect: true });
  const saved = mergeKeyboardAchievement([], "lesson", result);
  assert.equal(keyboardAchievementMedal(saved[0]), "bronze");
  assert.equal(keyboardAchievementIsPerfect(saved[0]), true);
});

test("cumulative achievement accuracy retains corrected errors", () => {
  assert.equal(cumulativeErrorAccuracy(0, 0), 100);
  assert.equal(cumulativeErrorAccuracy(20, 0), 100);
  assert.equal(cumulativeErrorAccuracy(20, 1), 95);
  assert.equal(cumulativeErrorAccuracy(20, 2), 90);
  assert.equal(cumulativeErrorAccuracy(2, 5), 0);
  assert.deepEqual(
    evaluateKeyboardAchievement(25, cumulativeErrorAccuracy(20, 1)),
    { medal: "bronze", perfect: false },
  );
  assert.deepEqual(
    evaluateKeyboardAchievement(50, cumulativeErrorAccuracy(20, 4)),
    { medal: null, perfect: false },
  );
});

test("repeats keep the highest medal and can add PERFECT independently", () => {
  let achievements = mergeKeyboardAchievement([], "lesson-a", {
    medal: "bronze",
    perfect: false,
  });
  achievements = mergeKeyboardAchievement(achievements, "lesson-a", {
    medal: "silver",
    perfect: false,
  });
  achievements = mergeKeyboardAchievement(achievements, "lesson-a", {
    medal: "gold",
    perfect: false,
  });
  const gold = achievements;
  assert.strictEqual(
    mergeKeyboardAchievement(achievements, "lesson-a", {
      medal: "silver",
      perfect: false,
    }),
    gold,
  );
  achievements = mergeKeyboardAchievement(achievements, "lesson-a", {
    medal: "gold",
    perfect: true,
  });
  assert.equal(keyboardAchievementMedal(achievements[0]), "gold");
  assert.equal(keyboardAchievementIsPerfect(achievements[0]), true);
});

test("achievement sound plays only for first medal or a medal upgrade", () => {
  assert.equal(shouldPlayAchievementSound("bronze", null, true, true, false), true);
  assert.equal(shouldPlayAchievementSound("silver", "bronze", true, true, false), true);
  assert.equal(shouldPlayAchievementSound("gold", "silver", true, true, false), true);
  assert.equal(shouldPlayAchievementSound("gold", "gold", true, true, false), false);
  assert.equal(shouldPlayAchievementSound("silver", "gold", true, true, false), false);
  assert.equal(shouldPlayAchievementSound(null, null, true, true, false), false);
  assert.equal(shouldPlayAchievementSound("bronze", null, false, true, false), false);
  assert.equal(shouldPlayAchievementSound("bronze", null, true, false, false), false);
  assert.equal(shouldPlayAchievementSound("bronze", null, true, true, true), false);
});

test("legacy verified CLEAR and EXCELLENT records safely map to GOLD without PERFECT", () => {
  const legacy = [
    { lessonId: "clear", status: "clear" as const },
    { lessonId: "excellent", status: "excellent" as const },
    { lessonId: "completed", status: "completed" as const },
  ];
  assert.equal(validKeyboardAchievements(legacy), true);
  assert.equal(keyboardAchievementMedal(legacy[0]), "gold");
  assert.equal(keyboardAchievementMedal(legacy[1]), "gold");
  assert.equal(keyboardAchievementMedal(legacy[2]), null);
  assert.equal(keyboardAchievementIsPerfect(legacy[1]), false);
});

test("progress bars count each minimum medal tier and select the active challenge", () => {
  const ids = keyboardLessons.slice(0, 5).map((lesson) => lesson.id);
  const achievements = [
    { lessonId: ids[0], medal: "bronze" as const, attempted: true },
    { lessonId: ids[1], medal: "silver" as const, attempted: true },
    { lessonId: ids[2], medal: "gold" as const, attempted: true, perfect: true },
    { lessonId: ids[3], attempted: true },
    { lessonId: "outside-bank", medal: "gold" as const, attempted: true },
  ];
  assert.deepEqual(calculateKeyboardProgress(ids, achievements), {
    bronze: 3,
    silver: 2,
    gold: 1,
    bronzeMedals: 1,
    silverMedals: 1,
    goldMedals: 1,
    perfect: 1,
    cleared: 3,
    total: 5,
    percentage: 60,
    silverPercentage: 40,
    goldPercentage: 20,
    activeChallenge: "bronze",
    nextUnclearedIndex: 3,
  });
  const bronzeComplete = calculateKeyboardProgress(
    ids,
    ids.map((lessonId) => ({ lessonId, medal: "bronze" as const })),
  );
  assert.equal(bronzeComplete.activeChallenge, "silver");
  assert.equal(bronzeComplete.nextUnclearedIndex, 0);
  const silverComplete = calculateKeyboardProgress(
    ids,
    ids.map((lessonId) => ({ lessonId, medal: "silver" as const })),
  );
  assert.equal(silverComplete.activeChallenge, "gold");
  const goldComplete = calculateKeyboardProgress(
    ids,
    ids.map((lessonId) => ({ lessonId, medal: "gold" as const })),
  );
  assert.equal(goldComplete.activeChallenge, null);
  assert.equal(goldComplete.nextUnclearedIndex, null);
});

test("medaling the first bank exercise immediately produces 1/55 and 1.8%", () => {
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
  const accuracy = cumulativeErrorAccuracy(
    ledger.printableKeystrokes,
    ledger.errors,
  );
  assert.equal(score.wpm, 40);
  assert.equal(accuracy, 95);
  const awards = mergeKeyboardAchievement([], keyboardLessons[0].id,
    evaluateKeyboardAchievement(score.wpm, accuracy));
  const progress = calculateKeyboardProgress(lessonIds, awards);
  assert.equal(progress.cleared, 1);
  assert.equal(progress.total, 55);
  assert.equal(progress.percentage.toFixed(1), "1.8");
  assert.equal(progress.silverPercentage.toFixed(1), "1.8");
  assert.equal(progress.goldPercentage.toFixed(1), "1.8");
  assert.equal(progress.gold, 1);
  assert.equal(progress.nextUnclearedIndex, 1);
  assert.equal(calculateKeyboardProgress([...lessonIds, lessonIds[0]], awards).cleared, 1);
});

test("achievement records validate and persist while legacy progress remains compatible", () => {
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
      { lessonId: keyboardLessons[0].id, medal: "silver" as const, perfect: true, attempted: true },
    ];
    assert.equal(validKeyboardAchievements(records), true);
    assert.equal(write(KEYS.basicTrainingAchievements, records), true);
    const restored = read(KEYS.basicTrainingAchievements, [], validKeyboardAchievements);
    assert.deepEqual(restored, records);
    assert.equal(calculateKeyboardProgress(keyboardLessons.map((lesson) => lesson.id), restored).cleared, 1);
    assert.deepEqual(values.get(KEYS.history), undefined);

    values.set(KEYS.basicTrainingAchievements, '[{"lessonId":"home-01","status":"clear"}]');
    const legacy = read(KEYS.basicTrainingAchievements, [], validKeyboardAchievements);
    assert.equal(keyboardAchievementMedal(legacy[0]), "gold");
    assert.equal(keyboardAchievementIsPerfect(legacy[0]), false);
    values.set(KEYS.basicTrainingAchievements, '[{"lessonId":"home-01","status":"not-started"}]');
    assert.deepEqual(read(KEYS.basicTrainingAchievements, [], validKeyboardAchievements), []);
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, "localStorage");
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});

test("achievement sound preference persists locally and validates its boolean value", () => {
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
    assert.equal(write(KEYS.basicTrainingAchievementSound, false), true);
    assert.equal(read(KEYS.basicTrainingAchievementSound, true, (v) => typeof v === "boolean"), false);
    values.set(KEYS.basicTrainingAchievementSound, '"off"');
    assert.equal(read(KEYS.basicTrainingAchievementSound, true, (v) => typeof v === "boolean"), true);
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, "localStorage");
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});
