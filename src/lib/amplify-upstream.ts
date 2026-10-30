import { UUID, parseBankQuestion } from "./amplify";
export const noStore = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
export function upstreamOrigin(
  value = process.env.AMPLIFY_API_ORIGIN ||
    "https://amplify-eight-delta.vercel.app",
) {
  const u = new URL(value);
  if (
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash ||
    !(
      u.protocol === "https:" ||
      (u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname))
    )
  )
    throw Error("Invalid AMPLIFY origin");
  return u.origin;
}
export async function fetchUpstream(
  path: string,
  fetcher: typeof fetch = fetch,
  accessToken?: string | null,
) {
  return fetcher(`${upstreamOrigin()}${path}`, {
    method: "GET",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
    headers: { Accept: "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
  });
}
export async function getBankPage(
  cursor: string | null,
  fetcher: typeof fetch = fetch,
  accessToken?: string | null,
) {
  if (cursor && !UUID.test(cursor))
    return Response.json(
      { error: "Invalid cursor." },
      { status: 400, headers: noStore },
    );
  try {
    const r = await fetchUpstream(
      `/api/writing-questions${cursor ? "?cursor=" + encodeURIComponent(cursor) : ""}`,
      fetcher,
      accessToken,
    );
    if (!r.ok) throw Error("Upstream unavailable");
    const body = await r.json();
    if (
      !Array.isArray(body.questions) ||
      !(
        body.nextCursor === null ||
        (typeof body.nextCursor === "string" && UUID.test(body.nextCursor))
      )
    )
      throw Error("Invalid response");
    return Response.json(
      {
        questions: body.questions
          .map((q: unknown) => parseBankQuestion(q))
          .filter(Boolean),
        nextCursor: body.nextCursor,
      },
      { headers: noStore },
    );
  } catch {
    return Response.json(
      {
        error:
          "AMPLIFY is unavailable. Your saved answers and built-in practice remain available.",
      },
      { status: 503, headers: noStore },
    );
  }
}
export async function getBankQuestion(
  id: string,
  fetcher: typeof fetch = fetch,
  accessToken?: string | null,
) {
  if (!UUID.test(id))
    return Response.json(
      { error: "Invalid question." },
      { status: 400, headers: noStore },
    );
  try {
    const r = await fetchUpstream(`/api/writing-questions/${id}`, fetcher, accessToken);
    if (r.status === 404)
      return Response.json(
        {
          error:
            "This question is no longer published. Your saved answer is still available.",
        },
        { status: 404, headers: noStore },
      );
    if (!r.ok) throw Error("Unavailable");
    const q = parseBankQuestion((await r.json()).question, true);
    if (!q || q.id !== id) throw Error("Invalid question");
    return Response.json({ question: q }, { headers: noStore });
  } catch {
    return Response.json(
      {
        error:
          "Unable to load this question from AMPLIFY. Your current answer has not been replaced.",
      },
      { status: 503, headers: noStore },
    );
  }
}
