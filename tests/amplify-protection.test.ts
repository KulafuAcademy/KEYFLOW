import test from "node:test";
import assert from "node:assert/strict";
import {
  AMPLIFY_ORIGIN,
  upstreamHeaders,
  writingBankPath,
} from "../src/lib/amplify-protection";

const id = "077dbcc3-d1ba-40af-b151-969c3dc11461";
test("Vercel project identity and employee identity remain separate", async () => {
  const headers = await upstreamHeaders(AMPLIFY_ORIGIN, "staff-fixture", {
    onVercel: true,
    readOidcToken: () => "oidc-fixture",
  });
  assert.equal(headers.get("x-vercel-trusted-oidc-idp-token"), "oidc-fixture");
  assert.equal(headers.get("authorization"), "Bearer staff-fixture");
  assert.equal(headers.get("cookie"), null);
  assert.equal(headers.get("x-vercel-protection-bypass"), null);
});
test("the temporary public-learning mode still needs platform identity", async () => {
  const headers = await upstreamHeaders(AMPLIFY_ORIGIN, null, {
    onVercel: true,
    readOidcToken: async () => "oidc-fixture",
  });
  assert.equal(headers.get("x-vercel-trusted-oidc-idp-token"), "oidc-fixture");
  assert.equal(headers.get("authorization"), null);
});
test("missing or failed OIDC does not fall back to anonymous Vercel traffic", async () => {
  await assert.rejects(
    upstreamHeaders(AMPLIFY_ORIGIN, null, {
      onVercel: true,
      readOidcToken: () => "",
    }),
  );
  await assert.rejects(
    upstreamHeaders(AMPLIFY_ORIGIN, null, {
      onVercel: true,
      readOidcToken: () => {
        throw Error("private-token-error");
      },
    }),
  );
});
test("OIDC cannot be sent to a configured foreign or legacy origin", async () => {
  let calls = 0;
  for (const origin of [
    "https://evil.example",
    "https://amplify-eight-delta.vercel.app",
    "http://127.0.0.1:3000",
  ]) {
    await assert.rejects(
      upstreamHeaders(origin, null, {
        onVercel: true,
        readOidcToken: () => {
          calls++;
          return "private-token";
        },
      }),
    );
  }
  assert.equal(calls, 0);
});
test("local tests do not acquire a Vercel credential", async () => {
  const headers = await upstreamHeaders(
    "http://127.0.0.1:3000",
    "staff-fixture",
    {
      onVercel: false,
      readOidcToken: () => {
        throw Error("must not run");
      },
    },
  );
  assert.equal(headers.get("x-vercel-trusted-oidc-idp-token"), null);
  assert.equal(headers.get("authorization"), "Bearer staff-fixture");
});
test("list, cursor, detail and supporting materials use the same protected gateway", () => {
  for (const path of [
    "/api/writing-questions",
    `/api/writing-questions?cursor=${id}`,
    `/api/writing-questions/${id}`,
    `/api/writing-questions/${id}/materials/0`,
  ])
    assert.equal(writingBankPath(path), path);
});
test("the server credential cannot be used through arbitrary paths or query parameters", () => {
  for (const path of [
    "//evil.example/",
    "https://evil.example/",
    "/api/admin/questions",
    "/api/analyze",
    "/api/writing-questions/../admin",
    "/api/writing-questions?redirect=https://evil.example",
    `/api/writing-questions?cursor=${id}&cursor=${id}`,
    `/api/writing-questions/${id}?anything=1`,
    `/api/writing-questions/${id}/materials/100`,
    `/api/writing-questions?cursor=${id}?again=1`,
  ])
    assert.throws(() => writingBankPath(path));
});
