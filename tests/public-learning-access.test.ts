import assert from "node:assert/strict";
import { test } from "node:test";
import { publicLearningAccessEnabled } from "../src/lib/public-learning-access";

test("public learning access is opt-in and recognizes only the exact true value", () => {
  const original = process.env.PUBLIC_LEARNING_ACCESS;
  try {
    delete process.env.PUBLIC_LEARNING_ACCESS;
    assert.equal(publicLearningAccessEnabled(), false);
    process.env.PUBLIC_LEARNING_ACCESS = "false";
    assert.equal(publicLearningAccessEnabled(), false);
    process.env.PUBLIC_LEARNING_ACCESS = "true";
    assert.equal(publicLearningAccessEnabled(), true);
  } finally {
    if (original === undefined) delete process.env.PUBLIC_LEARNING_ACCESS;
    else process.env.PUBLIC_LEARNING_ACCESS = original;
  }
});
