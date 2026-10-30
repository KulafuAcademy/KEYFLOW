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
  recordGuidedKeystroke,
  recordTypingEdit,
  restoreBasicTrainingDraft,
  shouldAdvanceItem,
  shouldCompleteTarget,
  validBasicTrainingDraft,
} from "../src/lib/basic-training";
import {
  characterNeedsShift,
  fingerForCharacter,
  fingerOrder,
  keyboardKeyForCharacter,
  nextRequiredCharacter,
} from "../src/lib/keyboard-fingers";
import {
  keyboardLessons,
  sentenceLists,
  speedPassage,
  wordLists,
} from "../src/lib/basic-training-content";

const emptyDraft = {
  version: 1 as const,
  mode: "keyboard" as const,
  difficulty: "beginner" as const,
  duration: 1 as const,
  lessonIndex: 0,
  itemIndex: 0,
  completedItems: 0,
  input: "",
  practiceText: "",
  freeSource: "",
  elapsed: 0,
  status: "ready" as const,
  ledger: emptyLedger(),
};

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

test("finger guide uses standard assignments and keeps both hands in left-to-right order", () => {
  assert.deepEqual(fingerOrder, [
    "left-pinky",
    "left-ring",
    "left-middle",
    "left-index",
    "left-thumb",
    "right-thumb",
    "right-index",
    "right-middle",
    "right-ring",
    "right-pinky",
  ]);
  assert.equal(fingerForCharacter("a"), "left-pinky");
  assert.equal(fingerForCharacter("w"), "left-ring");
  assert.equal(fingerForCharacter("e"), "left-middle");
  assert.equal(fingerForCharacter("t"), "left-index");
  assert.equal(fingerForCharacter("y"), "right-index");
  assert.equal(fingerForCharacter("i"), "right-middle");
  assert.equal(fingerForCharacter("o"), "right-ring");
  assert.equal(fingerForCharacter("p"), "right-pinky");
  assert.equal(fingerForCharacter(" "), "right-thumb");
  assert.equal(fingerForCharacter("?"), "right-pinky");
});

test("key highlight follows the physical key for capitals and shifted punctuation", () => {
  assert.equal(keyboardKeyForCharacter("a"), "A");
  assert.equal(keyboardKeyForCharacter("T"), "T");
  assert.equal(keyboardKeyForCharacter("!"), "1");
  assert.equal(keyboardKeyForCharacter("?"), "/");
  assert.equal(keyboardKeyForCharacter(" "), "Space");
  assert.equal(characterNeedsShift("T"), true);
  assert.equal(characterNeedsShift("!"), true);
  assert.equal(characterNeedsShift("t"), false);
  assert.equal(characterNeedsShift(" "), false);
});

test("finger target follows the next expected character and responds to edits", () => {
  assert.equal(nextRequiredCharacter("aB c", ""), "a");
  assert.equal(nextRequiredCharacter("aB c", "a"), "B");
  assert.equal(nextRequiredCharacter("aB c", "aB"), " ");
  assert.equal(nextRequiredCharacter("aB c", "a"), "B");
  assert.equal(nextRequiredCharacter("aB c", "aB c"), "");
});

test("guided typing rejects wrong keys without advancing and counts every attempt", () => {
  const first = recordGuidedKeystroke("", "x", "aB", emptyLedger());
  assert.equal(first.accepted, false);
  assert.equal(first.expected, "a");
  assert.equal(first.input, "");
  assert.equal(first.ledger.printableKeystrokes, 1);
  assert.equal(first.ledger.errors, 1);
  assert.deepEqual(first.ledger.mistypedKeys, { a: 1 });

  const repeated = recordGuidedKeystroke(
    first.input,
    "x",
    "aB",
    first.ledger,
  );
  assert.equal(repeated.input, "");
  assert.equal(repeated.ledger.errors, 2);
  assert.equal(repeated.ledger.mistypedKeys.a, 2);

  const corrected = recordGuidedKeystroke(
    repeated.input,
    "a",
    "aB",
    repeated.ledger,
  );
  assert.equal(corrected.accepted, true);
  assert.equal(corrected.input, "a");
  assert.equal(corrected.ledger.errors, 2);
  assert.equal(basicTypingScore(corrected.ledger, 60_000).accuracy, 33.33333333333333);
  assert.equal(nextRequiredCharacter("aB", corrected.input), "B");
});

test("guided word and sentence items advance only after their final correct character", () => {
  let input = "";
  let ledger = emptyLedger();
  for (const key of "and") {
    const attempt = recordGuidedKeystroke(input, key, "and", ledger);
    assert.equal(attempt.accepted, true);
    input = attempt.input;
    ledger = attempt.ledger;
    assert.equal(shouldAdvanceItem("words", "and", input), key === "d");
  }

  input = "";
  for (const key of "Go.") {
    const attempt = recordGuidedKeystroke(input, key, "Go.", emptyLedger());
    input = attempt.input;
    assert.equal(attempt.accepted, true);
    assert.equal(shouldAdvanceItem("sentences", "Go.", input), key === ".");
  }
});

test("restored active training pauses safely and explicit pause remains resumable", () => {
  const active = { ...emptyDraft, status: "active" as const, elapsed: 2500 };
  const paused = restoreBasicTrainingDraft(active);
  assert.equal(paused.status, "paused");
  assert.equal(paused.elapsed, 2500);
  assert.equal(restoreBasicTrainingDraft(paused).status, "paused");
  assert.equal(restoreBasicTrainingDraft(emptyDraft).status, "ready");
});

test("restoring legacy guided input truncates the first wrong character without credit", () => {
  const input = "asxf";
  const draft = {
    ...emptyDraft,
    input,
    status: "paused" as const,
    ledger: recordTypingEdit("", input, "asdf", emptyLedger()),
  };
  const restored = restoreBasicTrainingDraft(draft, "asdf");
  assert.equal(restored.input, "as");
  assert.equal(restored.ledger.errors, 1);
  assert.equal(restored.ledger.retractedCorrect, 1);
  assert.equal(basicTypingScore(restored.ledger, 60_000).correctCharacters, 2);
  assert.equal(nextRequiredCharacter("asdf", restored.input), "d");
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
