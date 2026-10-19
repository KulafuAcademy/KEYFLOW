import test from "node:test";
import assert from "node:assert/strict";
import {
  score,
  elapsedMs,
  addedMistakes,
  wordCount,
  timeLabel,
} from "../src/lib/metrics";
import {
  appendSession,
  read,
  write,
  validHistory,
  validDrafts,
  type Session,
} from "../src/lib/storage";
import { drills, passages, prompts } from "../src/lib/content";
test("WPM uses correct characters / 5 / elapsed minutes", () => {
  assert.deepEqual(score("abcde", "abXde", 60000), {
    correct: 4,
    errors: 1,
    accuracy: 80,
    wpm: 0.8,
    complete: false,
  });
  assert.equal(score("abcde", "abcde", 30000).wpm, 2);
});
test("zero time and empty input remain finite", () => {
  assert.equal(score("abc", "", 0).wpm, 0);
  assert.equal(score("abc", "", 0).accuracy, 100);
  assert.equal(score("abc", "abc", 0).wpm, 0);
});
test("corrections repair current accuracy; deleting does not add mistakes", () => {
  assert.ok(Math.abs(score("abc", "axc", 60000).accuracy - 200 / 3) < 0.0001);
  assert.equal(score("abc", "abc", 60000).accuracy, 100);
  assert.equal(addedMistakes("a", "ax", "abc"), 1);
  assert.equal(addedMistakes("ax", "a", "abc"), 0);
  assert.equal(addedMistakes("axc", "abc", "abc"), 0);
  assert.equal(addedMistakes("abc", "abcX", "abc"), 1);
});
test("case, punctuation, length and whitespace matter for exact completion", () => {
  assert.equal(score("Hello.", "hello.", 1).complete, false);
  assert.equal(score("Hello.", "Hello.", 1).complete, true);
  assert.equal(score("abc", "abcx", 1).errors, 1);
  assert.equal(score("abc", "ab", 1).complete, false);
  assert.equal(score("a b", "a\nb", 1).errors, 1);
});
test("clock starts only when started; pauses do not accrue; timeout clamps", () => {
  assert.equal(elapsedMs({ elapsed: 0, started: null }, 1000), 0);
  assert.equal(elapsedMs({ elapsed: 5000, started: 10000 }, 12000), 7000);
  assert.equal(elapsedMs({ elapsed: 5000, started: null }, 999999), 5000);
  assert.equal(
    elapsedMs({ elapsed: 5000, started: 10000 }, 999999, 60000),
    60000,
  );
  assert.equal(elapsedMs({ elapsed: 0, started: 10000 }, 5000), 0);
});
test("word counting and clock display handle editor whitespace and boundaries", () => {
  assert.equal(wordCount("  "), 0);
  assert.equal(wordCount("A long-term\nresponse.\tYes!"), 4);
  assert.equal(timeLabel(0), "00:00");
  assert.equal(timeLabel(59999), "01:00");
  assert.equal(timeLabel(-1), "00:00");
});
const session: Session = {
  id: "a",
  date: "2026-10-20T00:00:00Z",
  mode: "drill",
  title: "Test",
  elapsed: 10000,
  wpm: 12,
  accuracy: 95,
  status: "completed",
};
test("session history deduplicates completion and caps at 200", () => {
  assert.equal(appendSession([session], session).length, 1);
  assert.equal(
    appendSession(
      Array.from({ length: 205 }, (_, i) => ({ ...session, id: String(i) })),
      session,
    ).length,
    200,
  );
});
test("persistence roundtrip, malformed JSON and blocked storage", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) || null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
  });
  assert.equal(write("history", [session]), true);
  assert.deepEqual(read("history", [], validHistory), [session]);
  values.set("history", "{broken");
  assert.deepEqual(read("history", [], validHistory), []);
  values.set("history", "[{}]");
  assert.deepEqual(read("history", [], validHistory), []);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("full");
      },
    },
  });
  assert.equal(write("x", "x"), false);
  assert.deepEqual(read("x", [], validHistory), []);
});
test("schemas reject corrupted drafts and history", () => {
  assert.equal(
    validDrafts({
      w1: { text: "draft", elapsed: 500, status: "paused", updated: "today" },
    }),
    true,
  );
  assert.equal(validDrafts({ w1: { text: 4 } }), false);
  assert.equal(validHistory([{ ...session, wpm: null }]), false);
  assert.equal(validHistory([{ ...session, elapsed: -1 }]), false);
});
test("content is complete and all prompts are self-contained", () => {
  assert.ok(drills.length >= 8);
  assert.ok(passages.length >= 4);
  assert.ok(
    passages
      .filter((p) => p.category.endsWith("1"))
      .every((p) => wordCount(p.text) >= 150),
  );
  assert.ok(
    passages
      .filter((p) => p.category.endsWith("2"))
      .every((p) => wordCount(p.text) >= 250),
  );
  assert.equal(
    new Set([...drills, ...passages, ...prompts].map((x) => x.id)).size,
    drills.length + passages.length + prompts.length,
  );
  assert.ok(
    prompts
      .filter((p) => p.task === 1)
      .every((p) => p.headers && p.rows && p.note),
  );
});
