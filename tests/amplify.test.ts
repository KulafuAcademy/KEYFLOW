import test from "node:test";
import assert from "node:assert/strict";
import {
  writingVariant,
  parseBankQuestion,
  bankPrompt,
  referencePrompt,
  fetchPublishedBank,
  matchesTrack,
  safeMaterialUrl,
} from "../src/lib/amplify";
import {
  getBankPage,
  getBankQuestion,
  upstreamOrigin,
} from "../src/lib/amplify-upstream";
import { validDrafts } from "../src/lib/storage";
const id = "077dbcc3-d1ba-40af-b151-969c3dc11461";
const base = {
  id,
  status: "published",
  question_type: "Writing Task 1 - General Training",
  task: 1,
  track: "general-training",
  title: "Write to your landlord.",
  question_content:
    "Write a letter to your landlord. Explain the problem. Request a repair.",
  materials: [{ index: 0, kind: "image" }],
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("all seven AMPLIFY variants are mapped without guessing the unspecified exam track", () => {
  for (const [type, task, track] of [
    ["Writing Task 1", 1, "unspecified"],
    ["Writing Task 1 - Academic", 1, "academic"],
    ["Writing Task 1 - General Training", 1, "general-training"],
    ["Writing Task 2", 2, "unspecified"],
    ["Writing Task 2 - Academic", 2, "academic"],
    ["Writing Task 2 - General Training", 2, "general-training"],
    ["Writing Task 2 - Academic/General Training", 2, "academic-general"],
  ] as const)
    assert.deepEqual(writingVariant(type), { task, track });
  assert.equal(writingVariant("Reading"), null);
  assert.equal(writingVariant("Listening"), null);
});
test("hidden/unpublished questions and inconsistent type metadata are rejected", () => {
  for (const status of [
    "hidden",
    "pending_review",
    "approved",
    "archived",
    "in_review",
    "rejected",
  ])
    assert.equal(parseBankQuestion({ ...base, status }, true), null);
  assert.equal(parseBankQuestion({ ...base, task: 2 }, true), null);
  assert.equal(parseBankQuestion({ ...base, track: "academic" }, true), null);
  assert.equal(
    parseBankQuestion({ ...base, question_content: "" }, true),
    null,
  );
  assert.equal(
    parseBankQuestion({ ...base, question_type: "Speaking Part 1" }, true),
    null,
  );
});
test("shared Task 2 questions appear in both Academic and General Training filters", () => {
  const shared = parseBankQuestion(
    {
      ...base,
      question_type: "Writing Task 2 - Academic/General Training",
      task: 2,
      track: "academic-general",
    },
    true,
  )!;
  assert.ok(matchesTrack(shared, "academic"));
  assert.ok(matchesTrack(shared, "general-training"));
  assert.ok(!matchesTrack(shared, "unspecified"));
});
test("draft references preserve task settings but never persist a copy of the original question or materials", () => {
  const prompt = bankPrompt(parseBankQuestion(base, true)!);
  assert.equal(prompt.task, 1);
  assert.equal(prompt.question, base.question_content);
  assert.ok(prompt.id.startsWith("amplify:"));
  const draft = {
    text: "My answer",
    elapsed: 1200,
    status: "paused",
    updated: "2026-10-30",
    reference: prompt.amplify,
  };
  assert.ok(validDrafts({ [prompt.id]: draft }));
  assert.ok(!JSON.stringify(draft).includes(base.question_content));
  assert.ok(!JSON.stringify(draft).includes("materials"));
  const restored = referencePrompt(draft.reference!);
  assert.ok(restored.unavailable);
  assert.equal(restored.task, 1);
  assert.equal(restored.amplify?.questionType, base.question_type);
  assert.ok(
    validDrafts({
      w1: {
        text: "Old response",
        elapsed: 1,
        status: "paused",
        updated: "then",
      },
    }),
  );
});
test("unsafe supporting links are discarded and material indexes are bounded", () => {
  assert.equal(safeMaterialUrl("javascript:alert(1)"), undefined);
  assert.equal(safeMaterialUrl("http://example.com"), undefined);
  assert.equal(safeMaterialUrl("https://user:pass@example.com"), undefined);
  assert.deepEqual(
    parseBankQuestion(
      {
        ...base,
        materials: [
          { index: -1, kind: "image" },
          { index: 200, kind: "pdf" },
          { index: 0, kind: "image" },
        ],
      },
      true,
    )?.materials,
    [{ index: 0, kind: "image" }],
  );
});
test("pagination continues through all pages and never accepts hidden records", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return calls === 1
      ? response({
          questions: [
            base,
            {
              ...base,
              id: "11111111-1111-1111-1111-111111111111",
              status: "hidden",
            },
          ],
          nextCursor: id,
        })
      : response({
          questions: [
            base,
            { ...base, id: "22222222-2222-2222-2222-222222222222" },
          ],
          nextCursor: null,
        });
  }) as typeof fetch;
  const bank = await fetchPublishedBank(new AbortController().signal, fetcher);
  assert.equal(calls, 2);
  assert.equal(bank.length, 2);
  assert.equal(new Set(bank.map((q) => q.id)).size, 2);
});
test("an outage or malformed cursor fails instead of silently returning a partial or cached bank", async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    fetchPublishedBank(controller.signal, (async () => {
      calls++;
      return calls === 1
        ? response({ questions: [base], nextCursor: id })
        : response({}, 503);
    }) as typeof fetch),
  );
  await assert.rejects(
    fetchPublishedBank(controller.signal, (async () =>
      response({ questions: [], nextCursor: "invalid" })) as typeof fetch),
  );
});
test("server gateway only uses GET, no-store and a fixed origin; strips hidden rows", async () => {
  let options: RequestInit | undefined;
  let url = "";
  const result = await getBankPage(null, (async (input, init) => {
    url = String(input);
    options = init;
    return response({
      questions: [base, { ...base, status: "hidden" }],
      nextCursor: null,
    });
  }) as typeof fetch);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).questions.length, 1);
  assert.ok(
    url.startsWith(
      "https://amplify-eight-delta.vercel.app/api/writing-questions",
    ),
  );
  assert.equal(options?.method, "GET");
  assert.equal(options?.cache, "no-store");
  assert.equal(options?.redirect, "error");
  assert.equal(result.headers.get("cache-control"), "no-store, max-age=0");
  assert.throws(() => upstreamOrigin("https://amplify.example/path"));
  assert.throws(() => upstreamOrigin("http://169.254.169.254"));
});
test("detail load rechecks publication; hidden/outage failures cannot replace an answer", async () => {
  assert.equal(
    (await getBankQuestion(id, (async () => response({}, 404)) as typeof fetch))
      .status,
    404,
  );
  assert.equal(
    (
      await getBankQuestion(id, (async () =>
        response({ question: { ...base, status: "hidden" } })) as typeof fetch)
    ).status,
    503,
  );
  assert.equal(
    (
      await getBankQuestion("bad", (async () => {
        throw Error("must not fetch");
      }) as typeof fetch)
    ).status,
    400,
  );
  assert.equal(
    (
      await getBankQuestion(id, (async () =>
        response({ question: base })) as typeof fetch)
    ).status,
    200,
  );
});
