import test from "node:test";
import assert from "node:assert/strict";
import { elapsedMs } from "../src/lib/metrics";
import {
  read,
  write,
  KEYS,
  validHistory,
  type Session,
} from "../src/lib/storage";
import {
  basicTypingScore,
  characterStates,
  emptyLedger,
  nextLessonIndex,
  recordTypingEdit,
  shouldAdvanceItem,
  shouldCompleteTarget,
  validBasicTrainingDraft,
} from "../src/lib/basic-training";
import {
  keyboardLessons,
  sentenceLists,
  speedPassage,
  wordLists,
} from "../src/lib/basic-training-content";

test("keyboard lessons progress through home row, letters, shift, numbers and punctuation", () => {
  assert.match(keyboardLessons[0].text, /asdf.*jkl;/);
  assert.match(keyboardLessons[4].text, /quick brown fox/);
  assert.match(keyboardLessons[5].text, /[A-Z]/);
  assert.match(keyboardLessons[6].text, /\d/);
  assert.match(keyboardLessons[7].text, /[,!.]/);
  assert.equal(nextLessonIndex(0, keyboardLessons.length), 1);
  assert.equal(
    nextLessonIndex(keyboardLessons.length - 1, keyboardLessons.length),
    0,
  );
  assert.equal(nextLessonIndex(5, 0), 0);
});

test("word and sentence banks provide all difficulty levels and speed passage content", () => {
  for (const level of ["beginner", "intermediate", "advanced"] as const) {
    assert.ok(wordLists[level].length >= 5);
    assert.ok(sentenceLists[level].length >= 5);
  }
  assert.ok(speedPassage.length > 200);
});

test("character matching highlights current, correct, incorrect and pending positions", () => {
  assert.deepEqual(characterStates("Cat", "Cx"), [
    { character: "C", state: "correct" },
    { character: "a", state: "incorrect" },
    { character: "t", state: "current" },
  ]);
  assert.deepEqual(characterStates("ab", ""), [
    { character: "a", state: "current" },
    { character: "b", state: "pending" },
  ]);
});

test("completed lessons and target-driven items advance at the target boundary", () => {
  assert.equal(shouldCompleteTarget("keyboard", "abc", "ab"), false);
  assert.equal(shouldCompleteTarget("keyboard", "abc", "abc"), true);
  assert.equal(shouldCompleteTarget("speed", "abc", "abcd"), true);
  assert.equal(shouldCompleteTarget("free", "abc", "abc"), false);
  assert.equal(shouldAdvanceItem("words", "and", "an"), false);
  assert.equal(shouldAdvanceItem("words", "and", "and"), true);
  assert.equal(shouldAdvanceItem("sentences", "Hello.", "Hello!"), true);
  assert.equal(shouldAdvanceItem("speed", "abc", "abc"), false);
});

test("mistakes persist after backspace and corrected errors do not inflate net WPM", () => {
  let ledger = emptyLedger();
  ledger = recordTypingEdit("", "a", "a", ledger);
  ledger = recordTypingEdit("a", "", "a", ledger);
  ledger = recordTypingEdit("", "a", "a", ledger);
  assert.deepEqual(ledger, {
    printableKeystrokes: 2,
    errors: 0,
    retractedCorrect: 1,
    mistypedKeys: {},
  });
  assert.equal(basicTypingScore(ledger, 60_000).correctCharacters, 1);

  let wrong = recordTypingEdit("", "x", "a", emptyLedger());
  wrong = recordTypingEdit("x", "", "a", wrong);
  wrong = recordTypingEdit("", "a", "a", wrong);
  assert.equal(wrong.errors, 1);
  assert.equal(basicTypingScore(wrong, 60_000).correctCharacters, 1);
  assert.equal(basicTypingScore(wrong, 60_000).accuracy, 50);
});

test("WPM is correct characters divided by five and elapsed minutes; zero time is safe", () => {
  const ledger = {
    printableKeystrokes: 6,
    errors: 1,
    retractedCorrect: 0,
    mistypedKeys: { a: 1 },
  };
  assert.deepEqual(basicTypingScore(ledger, 60_000), {
    attempted: 6,
    correctCharacters: 5,
    errors: 1,
    accuracy: 83.33333333333334,
    wpm: 1,
  });
  assert.equal(basicTypingScore(ledger, 0).wpm, 0);
  assert.equal(basicTypingScore(emptyLedger(), 0).accuracy, 100);
});

test("elapsed time pauses cleanly and clamps a speed test at timeout", () => {
  const start = { elapsed: 0, started: 10_000 };
  assert.equal(elapsedMs(start, 20_000), 10_000);
  assert.equal(elapsedMs({ elapsed: 10_000, started: null }, 80_000), 10_000);
  assert.equal(elapsedMs(start, 99_000, 60_000), 60_000);
});

test("basic training state and session history persist through KEYFLOW local storage", () => {
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
    const draft = {
      version: 1 as const,
      mode: "keyboard" as const,
      difficulty: "beginner" as const,
      duration: 1 as const,
      lessonIndex: 2,
      itemIndex: 0,
      completedItems: 0,
      input: "qwe",
      practiceText: "",
      freeSource: "",
      elapsed: 1200,
      status: "paused" as const,
      ledger: recordTypingEdit(
        "",
        "qwe",
        keyboardLessons[2].text,
        emptyLedger(),
      ),
    };
    assert.equal(validBasicTrainingDraft(draft), true);
    assert.equal(write(KEYS.basicTraining, draft), true);
    assert.deepEqual(
      read(KEYS.basicTraining, null, validBasicTrainingDraft),
      draft,
    );
    const session: Session = {
      id: "basic-1",
      date: new Date(0).toISOString(),
      mode: "keyboard",
      title: "Top row",
      elapsed: 1200,
      wpm: 0,
      accuracy: 100,
      errors: 0,
      mistypedKeys: {},
      status: "completed",
    };
    assert.equal(validHistory([session]), true);
    write(KEYS.history, [session]);
    assert.deepEqual(read(KEYS.history, [], validHistory), [session]);
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
