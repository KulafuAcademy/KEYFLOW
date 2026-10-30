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
  basicTrainingSpaceAction,
  basicTrainingSpaceInstruction,
  basicTypingScore,
  characterStates,
  emptyLedger,
  isUnmodifiedPrintableKey,
  isSpacebarShortcut,
  normalizeTrainingKey,
  resolveBasicTrainingSpaceEvent,
  nextLessonIndex,
  recordGuidedKeystroke,
  recordTypingEdit,
  restoreBasicTrainingDraft,
  shouldAdvanceItem,
  shouldCompleteTarget,
  shouldPlayIncorrectKeySound,
  validKeyboardLessonProgress,
  validBasicTrainingDraft,
} from "../src/lib/basic-training";
import {
  characterNeedsShift,
  fingerForCharacter,
  fingerOrder,
  keyboardKeyForCharacter,
  nextRequiredCharacter,
  shiftFingerForCharacter,
} from "../src/lib/keyboard-fingers";
import {
  keyboardLessons,
  keyboardStages,
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

test("keyboard curriculum has five ordered stages and at least 55 distinct exercises", () => {
  assert.deepEqual(
    keyboardStages.map((stage) => stage.exercises.length),
    [10, 10, 10, 15, 10],
  );
  assert.equal(keyboardLessons.length, 55);
  assert.equal(new Set(keyboardLessons.map((lesson) => lesson.id)).size, 55);
  for (const lesson of keyboardLessons) {
    assert.ok(lesson.title.length > 0);
    assert.ok(lesson.objective.length > 0);
    assert.ok(lesson.keys.length > 0);
    assert.ok(lesson.text.length >= 15);
    assert.ok(
      ["beginner", "intermediate", "advanced"].includes(lesson.difficulty),
    );
  }
  const containsOnly = (text: string, allowed: string) =>
    Array.from(text.toLowerCase()).every((character) =>
      allowed.includes(character),
    );
  for (const lesson of keyboardStages[0].exercises) {
    assert.ok(containsOnly(lesson.text, "asdfghjkl; "), lesson.id);
  }
  for (const lesson of keyboardStages[1].exercises.slice(0, 8)) {
    assert.ok(containsOnly(lesson.text, "qwertyuiop "), lesson.id);
  }
  for (const lesson of keyboardStages[2].exercises.slice(0, 8)) {
    assert.ok(containsOnly(lesson.text, "zxcvbnm,./ "), lesson.id);
  }
  const allLetters = new Set(
    keyboardStages[3].exercises.flatMap((lesson) =>
      Array.from(lesson.text.toLowerCase()).filter((char) =>
        /[a-z]/.test(char),
      ),
    ),
  );
  assert.deepEqual(
    [...allLetters].sort(),
    Array.from("abcdefghijklmnopqrstuvwxyz"),
  );
  const extendedText = keyboardStages[4].exercises
    .map((exercise) => exercise.text)
    .join(" ");
  for (const digit of "0123456789") assert.ok(extendedText.includes(digit));
  for (const symbol of '!@#$%^&*()_+-={}":;<>.?~/|')
    assert.ok(extendedText.includes(symbol));
  assert.equal(nextLessonIndex(0, keyboardLessons.length), 1);
  assert.equal(
    nextLessonIndex(keyboardLessons.length - 1, keyboardLessons.length),
    0,
  );
  assert.equal(nextLessonIndex(5, 0), 0);
});

test("guided keyboard progression accepts only the expected character and counts errors", () => {
  const target = "a B! ";
  const wrong = recordGuidedKeystroke("", "s", target, emptyLedger());
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.input, "");
  assert.equal(wrong.ledger.errors, 1);
  assert.equal(wrong.ledger.mistypedKeys.a, 1);
  const correct = recordGuidedKeystroke("", "a", target, wrong.ledger);
  assert.equal(correct.input, "a");
  assert.equal(correct.accepted, true);
  assert.equal(nextRequiredCharacter(target, correct.input), " ");
  assert.equal(
    recordGuidedKeystroke("a", " ", target, correct.ledger).input,
    "a ",
  );
});

test("keyboard lesson completion progress is validated and shift fingers use the opposite hand", () => {
  assert.equal(validKeyboardLessonProgress(["home-01", "top-02"]), true);
  assert.equal(validKeyboardLessonProgress(["home-01", "home-01"]), false);
  assert.equal(validKeyboardLessonProgress(["home-01", 2]), false);
  assert.equal(validKeyboardLessonProgress("home-01"), false);
  assert.equal(shiftFingerForCharacter("T"), "right-pinky");
  assert.equal(shiftFingerForCharacter("Y"), "left-pinky");
  assert.equal(shiftFingerForCharacter("!"), "right-pinky");
  assert.equal(shiftFingerForCharacter("?"), "left-pinky");
  assert.equal(shiftFingerForCharacter("t"), null);
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

  const repeated = recordGuidedKeystroke(first.input, "x", "aB", first.ledger);
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
  assert.equal(
    basicTypingScore(corrected.ledger, 60_000).accuracy,
    33.33333333333333,
  );
  assert.equal(nextRequiredCharacter("aB", corrected.input), "B");
});

test("incorrect key sound only applies to enabled, expected-character errors", () => {
  assert.equal(shouldPlayIncorrectKeySound(false, "a", true), true);
  assert.equal(shouldPlayIncorrectKeySound(true, "a", true), false);
  assert.equal(shouldPlayIncorrectKeySound(false, "", true), false);
  assert.equal(shouldPlayIncorrectKeySound(false, "a", false), false);
  const wrong = recordTypingEdit("", "x", "a", emptyLedger());
  const correct = recordTypingEdit("", "a", "a", emptyLedger());
  assert.equal(wrong.errors, 1);
  assert.equal(correct.errors, 0);
});

test("guided training ignores modifiers and non-printable keys", () => {
  assert.equal(isUnmodifiedPrintableKey("a", {}), true);
  assert.equal(isUnmodifiedPrintableKey("?", { shiftKey: true }), true);
  assert.equal(isUnmodifiedPrintableKey("a", { ctrlKey: true }), false);
  assert.equal(isUnmodifiedPrintableKey("a", { metaKey: true }), false);
  assert.equal(isUnmodifiedPrintableKey("a", { altKey: true }), false);
  assert.equal(isUnmodifiedPrintableKey("Backspace", {}), false);
  assert.equal(isUnmodifiedPrintableKey("ArrowLeft", {}), false);
});

test("Space action follows the current Basic Training state", () => {
  assert.equal(basicTrainingSpaceAction("ready"), "start");
  assert.equal(basicTrainingSpaceAction("active"), "type");
  assert.equal(basicTrainingSpaceAction("paused"), "resume");
  assert.equal(basicTrainingSpaceAction("completed"), "restart");
  assert.equal(basicTrainingSpaceAction("timed-out"), "restart");
});

test("Space instructions match the requested visible labels", () => {
  assert.equal(basicTrainingSpaceInstruction("ready"), "Press Space to Start");
  assert.equal(
    basicTrainingSpaceInstruction("paused"),
    "Press Space to Resume",
  );
  assert.equal(
    basicTrainingSpaceInstruction("completed"),
    "Press Space to Restart",
  );
  assert.equal(
    basicTrainingSpaceInstruction("timed-out"),
    "Press Space to Restart",
  );
  assert.equal(
    basicTrainingSpaceInstruction("active"),
    "Typing active · Space types normally",
  );
});

test("Space detection accepts Safari key values and physical Space code only without modifiers", () => {
  assert.equal(isSpacebarShortcut({ key: " ", code: "" }), true);
  assert.equal(isSpacebarShortcut({ key: "Spacebar", code: "" }), true);
  assert.equal(
    isSpacebarShortcut({ key: "Unidentified", code: "Space" }),
    true,
  );
  assert.equal(isSpacebarShortcut({ key: "a", code: "KeyA" }), false);
  assert.equal(
    isSpacebarShortcut({ key: " ", code: "Space", shiftKey: true }),
    false,
  );
  assert.equal(
    isSpacebarShortcut({ key: " ", code: "Space", metaKey: true }),
    false,
  );
  assert.equal(
    isSpacebarShortcut({ key: " ", code: "Space", isComposing: true }),
    false,
  );
});

test("physical Space key values normalize to a literal typing character", () => {
  assert.equal(normalizeTrainingKey({ key: " ", code: "Space" }), " ");
  assert.equal(normalizeTrainingKey({ key: "Spacebar", code: "" }), " ");
  assert.equal(
    normalizeTrainingKey({ key: "Unidentified", code: "Space" }),
    " ",
  );
  assert.equal(normalizeTrainingKey({ key: "", code: "Space" }), " ");
  assert.equal(normalizeTrainingKey({ key: "a", code: "KeyA" }), "a");
});

test("physical Space routes by training state and respects focus ownership", () => {
  const event = { key: "Unidentified", code: "Space" };
  const surfaceFocused = {
    guidedMode: true,
    trainingSurfaceFocused: true,
    otherControlFocused: false,
  };
  assert.equal(
    resolveBasicTrainingSpaceEvent("ready", event, surfaceFocused),
    "start",
  );
  assert.equal(
    resolveBasicTrainingSpaceEvent("active", event, surfaceFocused),
    "type",
  );
  assert.equal(
    resolveBasicTrainingSpaceEvent("paused", event, surfaceFocused),
    "resume",
  );
  assert.equal(
    resolveBasicTrainingSpaceEvent("completed", event, surfaceFocused),
    "restart",
  );
  assert.equal(
    resolveBasicTrainingSpaceEvent("timed-out", event, surfaceFocused),
    "restart",
  );
  assert.equal(
    resolveBasicTrainingSpaceEvent("active", event, {
      ...surfaceFocused,
      trainingSurfaceFocused: false,
    }),
    "ignore",
  );
  assert.equal(
    resolveBasicTrainingSpaceEvent("ready", event, {
      ...surfaceFocused,
      otherControlFocused: true,
    }),
    "ignore",
  );
  assert.equal(
    resolveBasicTrainingSpaceEvent("active", event, {
      ...surfaceFocused,
      guidedMode: false,
    }),
    "ignore",
  );
  assert.equal(
    resolveBasicTrainingSpaceEvent(
      "active",
      { ...event, ctrlKey: true },
      surfaceFocused,
    ),
    "ignore",
  );
});

test("Running Space is ledgered as a normal character and cannot advance on error", () => {
  const key = normalizeTrainingKey({ key: "Unidentified", code: "Space" });
  const wrong = recordGuidedKeystroke("", key, "a", emptyLedger());
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.input, "");
  assert.equal(wrong.ledger.errors, 1);

  const expected = recordGuidedKeystroke("", key, " ", emptyLedger());
  assert.equal(expected.accepted, true);
  assert.equal(expected.input, " ");
  assert.equal(expected.ledger.errors, 0);
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
    assert.equal(
      read(
        KEYS.basicTrainingSound,
        true,
        (value) => typeof value === "boolean",
      ),
      true,
    );
    assert.equal(write(KEYS.basicTrainingSound, false), true);
    assert.equal(
      read(
        KEYS.basicTrainingSound,
        true,
        (value) => typeof value === "boolean",
      ),
      false,
    );
    assert.equal(write(KEYS.basicTrainingLessons, ["home-01", "top-03"]), true);
    assert.deepEqual(
      read(KEYS.basicTrainingLessons, [], validKeyboardLessonProgress),
      ["home-01", "top-03"],
    );
    values.set(KEYS.basicTrainingLessons, '["home-01","home-01"]');
    assert.deepEqual(
      read(KEYS.basicTrainingLessons, [], validKeyboardLessonProgress),
      [],
    );
    values.set(KEYS.basicTrainingSound, '"invalid"');
    assert.equal(
      read(
        KEYS.basicTrainingSound,
        true,
        (value) => typeof value === "boolean",
      ),
      true,
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
