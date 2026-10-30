"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPublishedBank,
  parseBankQuestion,
  matchesTrack,
  trackLabel,
  bankPrompt,
  type BankQuestion,
  type Track,
  type AmplifyReference,
} from "@/lib/amplify";
import type { Draft } from "@/lib/storage";
import type { Prompt } from "@/lib/content";
export default function AmplifyPicker({
  drafts,
  onLoad,
  onRestore,
}: {
  drafts: Record<string, Draft>;
  onLoad: (prompt: Prompt) => void;
  onRestore: (reference: AmplifyReference) => void;
}) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]),
    [phase, setPhase] = useState<"loading" | "ready" | "error">("loading"),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState(""),
    [pending, setPending] = useState(false);
  const [task, setTask] = useState("all"),
    [track, setTrack] = useState<Track | "all">("all"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [savedId, setSavedId] = useState("");
  const listRequest = useRef<AbortController | null>(null),
    detailRequest = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setPhase("loading");
    setError("");
    try {
      const result = await fetchPublishedBank(controller.signal);
      if (controller.signal.aborted) return;
      setQuestions(result);
      setPhase("ready");
    } catch (e) {
      if (controller.signal.aborted) return;
      setQuestions([]);
      setPhase("error");
      setError(e instanceof Error ? e.message : "Unable to load AMPLIFY.");
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const timer = setInterval(focus, 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      listRequest.current?.abort();
      detailRequest.current?.abort();
    };
  }, [refresh]);
  const filtered = questions.filter(
    (q) =>
      (task === "all" || q.task === Number(task)) &&
      matchesTrack(q, track) &&
      `${q.title} ${q.question_type} ${q.question_category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const chosen = filtered.some((q) => q.id === selected)
    ? selected
    : filtered[0]?.id || "";
  const saved = Object.entries(drafts)
    .filter(([, d]) => d.reference && (d.text || d.elapsed))
    .sort((a, b) => b[1].updated.localeCompare(a[1].updated));
  const savedChoice = saved.some(([id]) => id === savedId)
    ? savedId
    : saved[0]?.[0] || "";
  async function load() {
    if (!chosen) return;
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setPending(true);
    setLoadError("");
    try {
      const r = await fetch(`/api/amplify/questions/${chosen}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error || "Unable to load this question.");
      const question = parseBankQuestion(body.question, true);
      if (!question) throw Error("Invalid Writing question.");
      if (!controller.signal.aborted) onLoad(bankPrompt(question));
    } catch (e) {
      if (!controller.signal.aborted)
        setLoadError(
          e instanceof Error ? e.message : "Unable to load this question.",
        );
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }
  function cancelPending() {
    detailRequest.current?.abort();
    setPending(false);
    setLoadError("");
  }
  return (
    <section
      className="amplify-picker"
      aria-label="AMPLIFY Writing question bank"
    >
      <div className="bank-heading">
        <div>
          <h2>AMPLIFY Writing bank</h2>
          <p>
            Published questions only. Your current response stays safe until
            another question loads.
          </p>
        </div>
        <button className="secondary compact" onClick={() => void refresh()}>
          Refresh questions
        </button>
      </div>
      <div className="bank-filters">
        <label>
          Task
          <select
            aria-label="Filter AMPLIFY task"
            value={task}
            onChange={(e) => {
              cancelPending();
              setTask(e.target.value);
            }}
          >
            <option value="all">Task 1 & Task 2</option>
            <option value="1">Task 1 · 20 min / 150 words</option>
            <option value="2">Task 2 · 40 min / 250 words</option>
          </select>
        </label>
        <label>
          Variant
          <select
            aria-label="Filter AMPLIFY variant"
            value={track}
            onChange={(e) => {
              cancelPending();
              setTrack(e.target.value as Track | "all");
            }}
          >
            <option value="all">All variants</option>
            <option value="academic">Academic (including shared)</option>
            <option value="general-training">
              General Training (including shared)
            </option>
            <option value="academic-general">
              Academic / General Training
            </option>
            <option value="unspecified">Variant not specified</option>
          </select>
        </label>
        <label className="bank-search">
          Search previews
          <input
            aria-label="Search AMPLIFY question previews"
            value={search}
            onChange={(e) => {
              cancelPending();
              setSearch(e.target.value);
            }}
            placeholder="Topic or phrase…"
          />
        </label>
      </div>
      {phase === "loading" && (
        <p className="bank-message" role="status">
          Loading published Writing questions…
        </p>
      )}
      {phase === "error" && (
        <p className="bank-message bank-error" role="alert">
          {error} Use Refresh questions to retry.
        </p>
      )}
      {phase === "ready" &&
        (filtered.length ? (
          <div className="bank-load">
            <label htmlFor="amplify-question">
              {filtered.length} published Writing questions
              <select
                id="amplify-question"
                value={chosen}
                onChange={(e) => {
                  cancelPending();
                  setSelected(e.target.value);
                }}
              >
                {filtered.map((q) => (
                  <option value={q.id} key={q.id}>
                    {q.question_type} · {q.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary compact"
              disabled={pending || !chosen}
              onClick={() => void load()}
            >
              {pending ? "Loading question…" : "Load question"}
            </button>
            <p className="bank-selection-note">
              {trackLabel(
                questions.find((q) => q.id === chosen)?.track || "unspecified",
              )}{" "}
              · Publication is checked again when you load.
            </p>
          </div>
        ) : (
          <p className="bank-message" role="status">
            No published Writing questions match these filters.
          </p>
        ))}
      {loadError && (
        <p role="alert" className="bank-message bank-error">
          {loadError}
        </p>
      )}
      {saved.length > 0 && (
        <div className="bank-saved">
          <label htmlFor="amplify-saved">
            Saved AMPLIFY answers · available even if a question is hidden
            <select
              id="amplify-saved"
              value={savedChoice}
              onChange={(e) => setSavedId(e.target.value)}
            >
              {saved.map(([id, d]) => (
                <option key={id} value={id}>
                  {d.reference!.questionType} · {d.reference!.id.slice(0, 8)} ·{" "}
                  {new Date(d.updated).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary compact"
            onClick={() => {
              cancelPending();
              onRestore(drafts[savedChoice].reference!);
            }}
          >
            Restore saved answer
          </button>
        </div>
      )}
    </section>
  );
}
