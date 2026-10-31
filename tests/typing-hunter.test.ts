import assert from "node:assert/strict";
import test from "node:test";
import {
  availableHunterAttacks,
  calculateCounterDamage,
  calculateHunterDamage,
  calculateHunterMetrics,
  hunterAttacks,
} from "../src/lib/typing-hunter";

test("attack sequences and combo unlock progression are consistent", () => {
  assert.equal(hunterAttacks[1].sequence, "a;sldkfj");
  assert.equal(hunterAttacks[1].sequence.length, 8);
  assert.deepEqual(
    availableHunterAttacks(0).map((attack) => attack.id),
    ["quick-cut"],
  );
  assert.equal(availableHunterAttacks(1).length, 2);
  assert.equal(availableHunterAttacks(3).length, 3);
});

test("speed and cumulative errors produce finite WPM and character accuracy", () => {
  assert.deepEqual(calculateHunterMetrics(8, 0, 60_000), {
    wpm: 1.6,
    accuracy: 100,
  });
  assert.deepEqual(calculateHunterMetrics(8, 2, 60_000), {
    wpm: 1.6,
    accuracy: 80,
  });
  assert.deepEqual(calculateHunterMetrics(8, 2, 0), { wpm: 0, accuracy: 80 });
});

test("faster and cleaner sequences deal more damage and reduce retaliation", () => {
  const slow = { wpm: 12, accuracy: 75 };
  const fast = { wpm: 55, accuracy: 100 };
  assert.ok(calculateHunterDamage(44, fast) > calculateHunterDamage(44, slow));
  assert.equal(calculateCounterDamage(fast), 8);
  assert.equal(calculateCounterDamage(slow), 18);
});
