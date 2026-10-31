import assert from "node:assert/strict";
import test from "node:test";
import { isStandaloneTypingHunterPath } from "../src/lib/standalone-routes";

test("only the exact Typing Hunter page skips staff auth on Preview", () => {
  assert.equal(isStandaloneTypingHunterPath("/typing-hunter", "preview"), true);
  assert.equal(
    isStandaloneTypingHunterPath("/typing-hunter", "production"),
    false,
  );
  assert.equal(
    isStandaloneTypingHunterPath("/typing-hunter", "development"),
    false,
  );
  assert.equal(
    isStandaloneTypingHunterPath("/typing-hunter/", "preview"),
    false,
  );
  assert.equal(
    isStandaloneTypingHunterPath("/typing-hunter/anything", "preview"),
    false,
  );
  assert.equal(
    isStandaloneTypingHunterPath("/api/typing-hunter", "preview"),
    false,
  );
  assert.equal(isStandaloneTypingHunterPath("/", "preview"), false);
});
