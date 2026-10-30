import type { Prompt } from "./content";
export type Track =
  "academic" | "general-training" | "academic-general" | "unspecified";
export type AmplifyReference = {
  source: "amplify";
  id: string;
  questionType: string;
  task: 1 | 2;
};
export type BankQuestion = {
  id: string;
  question_type: string;
  task: 1 | 2;
  track: Track;
  status: "published";
  title: string;
  question_category?: string;
  updated_at?: string;
  question_content?: string;
  supporting_material_url?: string | null;
  materials?: { index: number; kind: "image" | "pdf" }[];
};
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function writingVariant(type: string) {
  const m =
    /^Writing Task ([12])(?:\s*[-–—]\s*(Academic\s*\/\s*General Training|General Training|Academic))?$/i.exec(
      type.trim().replace(/\s+/g, " "),
    );
  if (!m) return null;
  const s = m[2]?.toLowerCase();
  return {
    task: Number(m[1]) as 1 | 2,
    track: (s?.includes("/")
      ? "academic-general"
      : s === "academic"
        ? "academic"
        : s === "general training"
          ? "general-training"
          : "unspecified") as Track,
  };
}
export function safeMaterialUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function parseBankQuestion(
  value: unknown,
  detail = false,
): BankQuestion | null {
  if (!value || typeof value !== "object") return null;
  const q = value as Record<string, unknown>;
  if (
    q.status !== "published" ||
    typeof q.id !== "string" ||
    !UUID.test(q.id) ||
    typeof q.question_type !== "string"
  )
    return null;
  const variant = writingVariant(q.question_type);
  if (
    !variant ||
    q.task !== variant.task ||
    q.track !== variant.track ||
    typeof q.title !== "string"
  )
    return null;
  if (
    detail &&
    (typeof q.question_content !== "string" || !q.question_content.trim())
  )
    return null;
  return {
    id: q.id,
    question_type: q.question_type,
    ...variant,
    status: "published",
    title: q.title.slice(0, 200),
    ...(typeof q.question_category === "string"
      ? { question_category: q.question_category }
      : {}),
    ...(typeof q.updated_at === "string" ? { updated_at: q.updated_at } : {}),
    ...(detail
      ? {
          question_content: q.question_content as string,
          supporting_material_url:
            safeMaterialUrl(q.supporting_material_url) || null,
          materials: Array.isArray(q.materials)
            ? q.materials.flatMap((m) =>
                m &&
                Number.isInteger(m.index) &&
                m.index >= 0 &&
                m.index < 100 &&
                ["image", "pdf"].includes(m.kind)
                  ? [{ index: m.index, kind: m.kind }]
                  : [],
              )
            : [],
        }
      : {}),
  };
}
export function validReference(v: unknown): v is AmplifyReference {
  if (!v || typeof v !== "object") return false;
  const r = v as AmplifyReference;
  return (
    r.source === "amplify" &&
    UUID.test(r.id) &&
    typeof r.questionType === "string" &&
    writingVariant(r.questionType)?.task === r.task
  );
}
export function trackLabel(track: Track) {
  return {
    academic: "Academic",
    "general-training": "General Training",
    "academic-general": "Academic / General Training",
    unspecified: "Variant not specified",
  }[track];
}
export function referencePrompt(reference: AmplifyReference): Prompt {
  return {
    id: `amplify:${reference.id}`,
    task: reference.task,
    title: `${reference.questionType} · ${reference.id.slice(0, 8)}`,
    question:
      "The original question is not loaded. You can continue editing or export your saved response. Only currently published questions can be loaded again from AMPLIFY.",
    amplify: reference,
    unavailable: true,
  };
}
export function bankPrompt(q: BankQuestion): Prompt {
  return {
    ...referencePrompt({
      source: "amplify",
      id: q.id,
      questionType: q.question_type,
      task: q.task,
    }),
    question: q.question_content!,
    unavailable: false,
    supportingUrl: safeMaterialUrl(q.supporting_material_url),
    materials: q.materials || [],
    note: `AMPLIFY · ${trackLabel(q.track)} · ${q.question_category || "Published Writing question"}`,
  };
}
export function matchesTrack(q: BankQuestion, track: Track | "all") {
  return (
    track === "all" ||
    q.track === track ||
    (q.track === "academic-general" &&
      (track === "academic" || track === "general-training"))
  );
}
export async function fetchPublishedBank(
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const questions: BankQuestion[] = [],
    ids = new Set<string>(),
    cursors = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < 100; page++) {
    const response: Response = await fetcher(
      `/api/amplify/questions${cursor ? "?cursor=" + encodeURIComponent(cursor) : ""}`,
      { cache: "no-store", signal },
    );
    if (!response.ok)
      throw Error(
        "AMPLIFY is unavailable. Saved answers and built-in practice still work.",
      );
    const body: {questions:unknown[];nextCursor:unknown} = await response.json();
    if (!Array.isArray(body.questions))
      throw Error("AMPLIFY returned an invalid question list.");
    for (const row of body.questions) {
      const q = parseBankQuestion(row);
      if (q && !ids.has(q.id)) {
        ids.add(q.id);
        questions.push(q);
      }
    }
    if (body.nextCursor === null) return questions;
    if (
      typeof body.nextCursor !== "string" ||
      !UUID.test(body.nextCursor) ||
      cursors.has(body.nextCursor)
    )
      throw Error("Could not load the complete question list. Please retry.");
    cursor = body.nextCursor;
    cursors.add(body.nextCursor);
  }
  throw Error(
    "The question list is too large to load completely. Please retry later.",
  );
}
