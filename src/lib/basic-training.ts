import type { Status } from "./metrics";
import type { BasicTrainingMode, Difficulty } from "./basic-training-content";

export function shouldCompleteTarget(
  mode: BasicTrainingMode,
  target: string,
  input: string,
) {
  return (
    (mode === "keyboard" || mode === "speed") &&
    target.length > 0 &&
    input.length >= target.length
  );
}

export function shouldAdvanceItem(
  mode: BasicTrainingMode,
  target: string,
  input: string,
) {
  return (
    (mode === "words" || mode === "sentences") &&
    target.length > 0 &&
    input.length >= target.length
  );
}

export type KeystrokeLedger = {
  printableKeystrokes: number;
  errors: number;
  retractedCorrect: number;
  mistypedKeys: Record<string, number>;
};

export type BasicTrainingDraft = {
  version: 1;
  mode: BasicTrainingMode;
  difficulty: Difficulty;
  duration: 1 | 3 | 5;
  lessonIndex: number;
  itemIndex: number;
  completedItems: number;
  input: string;
  practiceText: string;
  freeSource: string;
  elapsed: number;
  status: Status;
  ledger: KeystrokeLedger;
};

export const emptyLedger = (): KeystrokeLedger => ({
  printableKeystrokes: 0,
  errors: 0,
  retractedCorrect: 0,
  mistypedKeys: {},
});

export function recordTypingEdit(
  previous: string,
  next: string,
  target: string,
  ledger: KeystrokeLedger,
): KeystrokeLedger {
  const before = Array.from(previous);
  const after = Array.from(next);
  const reference = Array.from(target);
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  )
    start++;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (
    beforeEnd > start &&
    afterEnd > start &&
    before[beforeEnd - 1] === after[afterEnd - 1]
  ) {
    beforeEnd--;
    afterEnd--;
  }
  const inserted = after.slice(start, afterEnd);
  const removed = before.slice(start, beforeEnd);
  const retractedCorrect = removed.reduce(
    (count, character, offset) =>
      count + (character === reference[start + offset] ? 1 : 0),
    0,
  );
  let addedErrors = 0;
  const mistypedKeys = { ...ledger.mistypedKeys };
  inserted.forEach((character, offset) => {
    const expected = reference[start + offset];
    if (character !== expected) {
      addedErrors++;
      const key = expected ?? "extra";
      mistypedKeys[key] = (mistypedKeys[key] ?? 0) + 1;
    }
  });
  return {
    printableKeystrokes: ledger.printableKeystrokes + inserted.length,
    errors: ledger.errors + addedErrors,
    retractedCorrect: ledger.retractedCorrect + retractedCorrect,
    mistypedKeys,
  };
}

export function basicTypingScore(ledger: KeystrokeLedger, elapsedMs: number) {
  const correctCharacters = Math.max(
    0,
    ledger.printableKeystrokes - ledger.errors - ledger.retractedCorrect,
  );
  return {
    attempted: ledger.printableKeystrokes,
    correctCharacters,
    errors: ledger.errors,
    accuracy: ledger.printableKeystrokes
      ? (correctCharacters / ledger.printableKeystrokes) * 100
      : 100,
    wpm: elapsedMs > 0 ? correctCharacters / 5 / (elapsedMs / 60000) : 0,
  };
}

export function characterStates(target: string, input: string) {
  const reference = Array.from(target);
  const typed = Array.from(input);
  return reference.map((character, index) => ({
    character,
    state:
      index < typed.length
        ? typed[index] === character
          ? ("correct" as const)
          : ("incorrect" as const)
        : index === typed.length
          ? ("current" as const)
          : ("pending" as const),
  }));
}

export function nextLessonIndex(index: number, count: number) {
  return count > 0 ? (index + 1) % count : 0;
}

export function validBasicTrainingDraft(
  value: unknown,
): value is BasicTrainingDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<BasicTrainingDraft>;
  const ledger = draft.ledger;
  return (
    draft.version === 1 &&
    ["keyboard", "words", "sentences", "speed", "free"].includes(
      String(draft.mode),
    ) &&
    ["beginner", "intermediate", "advanced"].includes(
      String(draft.difficulty),
    ) &&
    [1, 3, 5].includes(Number(draft.duration)) &&
    Number.isSafeInteger(draft.lessonIndex) &&
    Number(draft.lessonIndex) >= 0 &&
    Number.isSafeInteger(draft.itemIndex) &&
    Number(draft.itemIndex) >= 0 &&
    Number.isSafeInteger(draft.completedItems) &&
    Number(draft.completedItems) >= 0 &&
    typeof draft.input === "string" &&
    typeof draft.practiceText === "string" &&
    typeof draft.freeSource === "string" &&
    Number.isFinite(draft.elapsed) &&
    Number(draft.elapsed) >= 0 &&
    ["ready", "active", "paused", "completed", "timed-out"].includes(
      String(draft.status),
    ) &&
    !!ledger &&
    Number.isSafeInteger(ledger.printableKeystrokes) &&
    ledger.printableKeystrokes >= 0 &&
    Number.isSafeInteger(ledger.errors) &&
    ledger.errors >= 0 &&
    ledger.errors <= ledger.printableKeystrokes &&
    Number.isSafeInteger(ledger.retractedCorrect) &&
    ledger.retractedCorrect >= 0 &&
    ledger.retractedCorrect <= ledger.printableKeystrokes &&
    typeof ledger.mistypedKeys === "object" &&
    ledger.mistypedKeys !== null &&
    Object.values(ledger.mistypedKeys).every(
      (count) => Number.isSafeInteger(count) && count >= 0,
    )
  );
}
