"use client";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Keyboard,
  LayoutDashboard,
  Monitor,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  Type,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  visualCategories,
  visualQuestions,
  questionsInCategory,
  randomVisualQuestion,
  type VisualCategory,
} from "@/lib/task1-visuals";
import AmplifyPicker from "./amplify-picker";
import RemoteMaterials from "./remote-materials";
import {
  referencePrompt,
  trackLabel,
  writingVariant,
  type AmplifyReference,
} from "@/lib/amplify";
import { drills, passages, prompts, type Prompt } from "@/lib/content";
import {
  addedMistakes,
  elapsedMs,
  score,
  timeLabel,
  wordCount,
  type Clock,
  type Status,
} from "@/lib/metrics";
import {
  KEYS,
  appendSession,
  read,
  validDrafts,
  validHistory,
  write,
  type Draft,
  type Mode,
  type Session,
} from "@/lib/storage";

const QuestionVisual = dynamic(() => import("./question-visual"), {
  loading: () => <p className="visual-hint">Loading question visual…</p>,
});
const writingPrompts: Prompt[] = [...prompts, ...visualQuestions];

type View = Mode | "progress";
const labels: Record<Mode, string> = {
  drill: "Typing drill",
  copy: "Copy practice",
  writing: "Writing simulation",
};
const descriptions: Record<Mode, string> = {
  drill: "Small repetitions. Lasting precision.",
  copy: "Find your rhythm in academic English.",
  writing: "Your ideas. Exam conditions.",
};
const statusText: Record<Status, string> = {
  ready: "Ready when you are",
  active: "Session active",
  paused: "Session paused",
  completed: "Session complete",
  "timed-out": "Time is up",
};
const initialClock: Clock = { elapsed: 0, started: null };
function Metric({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {icon}
        {label}
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
    </div>
  );
}
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function Studio() {
  const [loaded, setLoaded] = useState(false),
    [view, setView] = useState<View>("drill"),
    [theme, setTheme] = useState("light");
  const [history, setHistory] = useState<Session[]>([]),
    [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [index, setIndex] = useState(0),
    [promptId, setPromptId] = useState("w1"),
    [duration, setDuration] = useState(1);
  const [text, setText] = useState(""),
    [status, setStatus] = useState<Status>("ready"),
    [elapsed, setElapsed] = useState(0),
    [mistakes, setMistakes] = useState(0);
  const [notice, setNotice] = useState(""),
    [storageError, setStorageError] = useState(false),
    [confirm, setConfirm] = useState<"history" | "restart" | null>(null);
  const clock = useRef<Clock>({ ...initialClock }),
    statusRef = useRef<Status>("ready"),
    textRef = useRef(""),
    mistakesRef = useRef(0),
    sessionId = useRef(""),
    editor = useRef<HTMLTextAreaElement>(null),
    confirmRef = useRef<HTMLButtonElement>(null);
  const mode: Mode = view === "progress" ? "drill" : view;
  const exercise = (mode === "copy" ? passages : drills)[
    index % (mode === "copy" ? passages.length : drills.length)
  ];
  const [remotePrompt, setRemotePrompt] = useState<Prompt | null>(null);
  const [writingSource, setWritingSource] = useState<"local" | "amplify">(
    "local",
  );
  const prompt =
    remotePrompt?.id === promptId
      ? remotePrompt
      : writingPrompts.find((p) => p.id === promptId) ||
        (drafts[promptId]?.reference
          ? referencePrompt(drafts[promptId].reference!)
          : prompts[0]);
  const remoteTrack = prompt.amplify
    ? writingVariant(prompt.amplify.questionType)!.track
    : null;
  const [visualCategory, setVisualCategory] = useState<VisualCategory | "all">(
    "all",
  );
  const lastBasicPrompt = useRef("w1"),
    lastVisualPrompt = useRef(visualQuestions[0].id);
  const visualPractice = prompt.task === 1 && !!prompt.visual;
  const availablePrompts = visualPractice
    ? [
        ...questionsInCategory(visualCategory),
        ...prompts.filter((p) => p.task === 2),
      ]
    : prompts;
  const limit =
    mode === "writing"
      ? (prompt.task === 1 ? 20 : 40) * 60000
      : mode === "drill"
        ? duration * 60000
        : Infinity;
  const target = exercise.text;
  const metrics = score(target, text, elapsed),
    words = wordCount(text),
    minimum = prompt.task === 1 ? 150 : 250;
  const finished = status === "completed" || status === "timed-out";
  const updateStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);
  const persist = useCallback((key: string, value: unknown) => {
    const ok = write(key, value);
    if (!ok) setStorageError(true);
    return ok;
  }, []);
  useEffect(() => {
    const preferences = read<{ theme: string; duration: number }>(
      KEYS.preferences,
      {
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
        duration: 1,
      },
      (x) =>
        !!x &&
        typeof x === "object" &&
        "theme" in x &&
        ["light", "dark"].includes(String(x.theme)) &&
        "duration" in x &&
        [1, 3, 5].includes(Number(x.duration)),
    );
    startTransition(() => {
      setTheme(preferences.theme);
      setDuration(preferences.duration);
      setHistory(read(KEYS.history, [], validHistory));
      setDrafts(read(KEYS.drafts, {}, validDrafts));
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (loaded)
      startTransition(() => {
        persist(KEYS.preferences, { theme, duration });
      });
  }, [theme, duration, loaded, persist]);
  useEffect(() => {
    if (loaded && view !== "progress") editor.current?.focus();
  }, [loaded, view, index, promptId]);
  useEffect(() => {
    if (confirm) confirmRef.current?.focus();
  }, [confirm]);
  const saveDraft = useCallback(
    (value: string, ms: number, state: Status) => {
      const current = read<Record<string, Draft>>(KEYS.drafts, {}, validDrafts);
      const next = {
        ...current,
        [promptId]: {
          ...(prompt.amplify ? { reference: prompt.amplify } : {}),
          text: value,
          elapsed: ms,
          status: state,
          updated: new Date().toISOString(),
        },
      };
      setDrafts(next);
      persist(KEYS.drafts, next);
    },
    [persist, promptId, prompt.amplify],
  );
  const finish = useCallback(
    (
      end: Status,
      value = textRef.current,
      ms = elapsedMs(clock.current, Date.now(), limit),
    ) => {
      if (
        statusRef.current === "completed" ||
        statusRef.current === "timed-out"
      )
        return;
      clock.current = { elapsed: ms, started: null };
      setElapsed(ms);
      updateStatus(end);
      const result = score(target, value, ms);
      const session: Session = {
        id: sessionId.current || crypto.randomUUID(),
        date: new Date().toISOString(),
        mode,
        title: mode === "writing" ? prompt.title : exercise.title,
        elapsed: ms,
        status: end,
        ...(mode === "writing"
          ? { words: wordCount(value) }
          : {
              wpm: result.wpm,
              accuracy: result.accuracy,
              errors: result.errors,
              mistakes: mistakesRef.current,
            }),
      };
      setHistory((old) => {
        const next = appendSession(old, session);
        persist(KEYS.history, next);
        return next;
      });
      if (mode === "writing") saveDraft(value, ms, end);
    },
    [
      limit,
      updateStatus,
      target,
      mode,
      prompt.title,
      exercise.title,
      persist,
      saveDraft,
    ],
  );
  useEffect(() => {
    if (status !== "active") return;
    const tick = () => {
      const ms = elapsedMs(clock.current, Date.now(), limit);
      setElapsed(ms);
      if (ms >= limit) finish("timed-out", textRef.current, ms);
    };
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [status, limit, finish]);
  useEffect(() => {
    if (mode !== "writing" || view === "progress") return;
    const save = () =>
      saveDraft(
        textRef.current,
        elapsedMs(clock.current, Date.now(), limit),
        statusRef.current,
      );
    const timer = setInterval(save, 1000);
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      save();
      if (
        textRef.current &&
        !["completed", "timed-out"].includes(statusRef.current)
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [mode, view, limit, saveDraft]);
  function reset() {
    clock.current = { ...initialClock };
    textRef.current = "";
    mistakesRef.current = 0;
    setText("");
    setElapsed(0);
    setMistakes(0);
    sessionId.current = crypto.randomUUID();
    updateStatus("ready");
    setNotice("");
    setConfirm(null);
    if (mode === "writing") saveDraft("", 0, "ready");
    requestAnimationFrame(() => editor.current?.focus());
  }
  function pause() {
    if (statusRef.current === "active") {
      const ms = elapsedMs(clock.current, Date.now(), limit);
      if (ms >= limit) {
        finish("timed-out", textRef.current, ms);
        return;
      }
      clock.current = { elapsed: ms, started: null };
      setElapsed(ms);
      updateStatus("paused");
      if (mode === "writing") saveDraft(textRef.current, ms, "paused");
    } else if (status === "paused") {
      clock.current.started = Date.now();
      updateStatus("active");
      editor.current?.focus();
    }
  }
  function leave() {
    if (mode === "writing" && view !== "progress")
      saveDraft(
        textRef.current,
        elapsedMs(clock.current, Date.now(), limit),
        statusRef.current === "active" ? "paused" : statusRef.current,
      );
  }
  function navigate(next: View) {
    if (next === view) return;
    leave();
    clock.current = { ...initialClock };
    textRef.current = "";
    mistakesRef.current = 0;
    setText("");
    setElapsed(0);
    setMistakes(0);
    setIndex(0);
    updateStatus("ready");
    setView(next);
    setNotice("");
    setConfirm(null);
    if (next === "writing") restore(promptId);
  }
  function restore(id: string, selectedPrompt?: Prompt) {
    const d = read<Record<string, Draft>>(KEYS.drafts, {}, validDrafts)[id];
    const p =
      selectedPrompt ||
      writingPrompts.find((x) => x.id === id) ||
      (remotePrompt?.id === id
        ? remotePrompt
        : d?.reference
          ? referencePrompt(d.reference)
          : prompts[0]);
    const max = (p.task === 1 ? 20 : 40) * 60000;
    const ms = Math.min(d?.elapsed || 0, max);
    const state = d
      ? ["completed", "timed-out"].includes(d.status)
        ? d.status
        : ms >= max
          ? "timed-out"
          : d.text || ms
            ? "paused"
            : "ready"
      : "ready";
    textRef.current = d?.text || "";
    setText(d?.text || "");
    clock.current = { elapsed: ms, started: null };
    setElapsed(ms);
    updateStatus(state as Status);
    sessionId.current = crypto.randomUUID();
  }
  function selectPrompt(id: string) {
    if (id === promptId) return;
    const next = writingPrompts.find((p) => p.id === id)!;
    if (next.task === 1) {
      if (next.visual) lastVisualPrompt.current = id;
      else lastBasicPrompt.current = id;
    }
    leave();
    setPromptId(id);
    restore(id);
    setNotice("");
  }
  function loadAmplify(selected: Prompt) {
    leave();
    const existing = read<Record<string, Draft>>(KEYS.drafts, {}, validDrafts)[
      selected.id
    ]?.reference;
    const next = existing
      ? {
          ...selected,
          task: existing.task,
          amplify: existing,
          title: referencePrompt(existing).title,
        }
      : selected;
    setRemotePrompt(next);
    setPromptId(next.id);
    setWritingSource("amplify");
    restore(next.id, next);
    setNotice("");
  }
  function restoreAmplify(reference: AmplifyReference) {
    loadAmplify(referencePrompt(reference));
  }
  function chooseWritingSource(source: "local" | "amplify") {
    if (source === "amplify") {
      if (statusRef.current === "active") pause();
      setWritingSource(source);
    } else {
      if (prompt.amplify) selectPrompt(lastBasicPrompt.current);
      setWritingSource("local");
    }
  }
  function changeText(value: string) {
    if (finished || statusRef.current === "paused") return;
    const now = Date.now();
    if (
      statusRef.current === "active" &&
      elapsedMs(clock.current, now, limit) >= limit
    ) {
      finish("timed-out", textRef.current, limit);
      return;
    }
    if (statusRef.current === "ready" && value.length) {
      clock.current.started = now;
      sessionId.current = crypto.randomUUID();
      updateStatus("active");
    }
    if (mode !== "writing") {
      mistakesRef.current += addedMistakes(textRef.current, value, target);
      setMistakes(mistakesRef.current);
    }
    textRef.current = value;
    setText(value);
    const ms = elapsedMs(clock.current, now, limit);
    setElapsed(ms);
    if (mode === "writing") saveDraft(value, ms, statusRef.current);
    else if (score(target, value, ms).complete) finish("completed", value, ms);
  }
  function nextExercise() {
    reset();
    setIndex(
      (i) => (i + 1) % (mode === "copy" ? passages.length : drills.length),
    );
  }
  function download(value: string, name: string) {
    const url = URL.createObjectURL(
      new Blob([value], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyWriting() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Writing copied to clipboard.");
    } catch {
      setNotice(
        "Clipboard unavailable. Use Export .txt or select the editor text and copy.",
      );
    }
  }
  const typingHistory = history.filter((s) => s.mode !== "writing");
  const best = Math.max(0, ...typingHistory.map((s) => s.wpm || 0));
  const avg = typingHistory.length
    ? typingHistory.reduce((a, s) => a + (s.accuracy || 0), 0) /
      typingHistory.length
    : 0;
  if (!loaded)
    return (
      <div className="loading">
        <span className="wordmark">
          KEYFLOW<span>_</span>
        </span>
        <p>Opening your practice studio…</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#main"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("drill");
          }}
          aria-label="KEYFLOW home"
        >
          <span className="brand-icon">
            <Keyboard size={21} />
          </span>
          <span className="wordmark">
            KEYFLOW<span>_</span>
          </span>
        </a>
        <div className="workspace-label">
          IELTS TYPING STUDIO <span>V.01</span>
        </div>
        <div className="nav-section">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "drill", name: "Typing drill", icon: Keyboard, n: "01" },
              { id: "copy", name: "Copy practice", icon: BookOpen, n: "02" },
              {
                id: "writing",
                name: "Writing simulation",
                icon: Type,
                n: "03",
              },
              {
                id: "progress",
                name: "Your progress",
                icon: BarChart3,
                n: "04",
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "selected" : ""}`}
              aria-label={item.name}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={17} />
              <span>{item.name}</span>
              <small>{item.n}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <ShieldCheck size={19} />
            <div>
              <strong>Your practice. Your device.</strong>
              <p>
                Progress saves in this browser.
                <br />
                No account. No distractions.
              </p>
            </div>
          </div>
          <div className="sidebar-footer">
            <span>
              <i className="dot" /> ALL SYSTEMS LOCAL
            </span>
            <IconButton
              label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              onClick={() =>
                setTheme((t) => (t === "light" ? "dark" : "light"))
              }
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </IconButton>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="crumb">Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {view === "progress" ? "Your progress" : labels[mode]}
            </strong>
          </div>
          <span className="topbar-right">
            <Monitor size={14} />
            <span>COMPUTER-DELIVERED IELTS</span>
          </span>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="square" />{" "}
                {view === "progress"
                  ? "YOUR PERSONAL RECORD"
                  : "PURPOSEFUL PRACTICE / REAL PROGRESS"}
              </div>
              <h1>
                {view === "progress" ? "Every session counts" : labels[mode]}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {view === "progress"
                  ? "A little more fluent. A little more confident."
                  : descriptions[mode]}
              </p>
            </div>
            <div className="session-code">
              <Activity size={15} />
              <span>
                FOCUS MODE
                <br />
                <strong>
                  {remoteTrack
                    ? `IELTS / ${trackLabel(remoteTrack).toUpperCase()}`
                    : "IELTS / ACADEMIC"}
                </strong>
              </span>
            </div>
          </div>
          {storageError && (
            <div role="alert" className="storage-alert">
              This browser cannot save local data. Keep this tab open and export
              your writing before leaving.
            </div>
          )}
          {view === "progress" ? (
            <>
              <div className="metrics-grid">
                <Metric
                  label="PERSONAL BEST"
                  value={best.toFixed(1)}
                  unit="WPM"
                  icon={<Zap size={14} />}
                />
                <Metric
                  label="AVG. ACCURACY"
                  value={avg.toFixed(1)}
                  unit="%"
                  icon={<Target size={14} />}
                />
                <Metric
                  label="SESSIONS"
                  value={String(history.length)}
                  icon={<LayoutDashboard size={14} />}
                />
                <Metric
                  label="TIME PRACTISED"
                  value={String(
                    Math.round(
                      history.reduce((a, s) => a + s.elapsed, 0) / 60000,
                    ),
                  )}
                  unit="MIN"
                  icon={<Clock3 size={14} />}
                />
              </div>
              <div className="panel trend-panel">
                <div className="panel-title">
                  <h2>Finding your flow</h2>
                  <span className="mono">LAST 12 TYPING SESSIONS</span>
                </div>
                {typingHistory.length ? (
                  <>
                    <div className="charts">
                      {(["wpm", "accuracy"] as const).map((key) => {
                        const data = typingHistory.slice(0, 12).reverse();
                        const max =
                          key === "accuracy"
                            ? 100
                            : Math.max(20, ...data.map((s) => s.wpm || 0));
                        return (
                          <div key={key}>
                            <h3>
                              {key === "wpm"
                                ? "Typing speed · WPM"
                                : "Character accuracy · %"}
                            </h3>
                            <div
                              className="chart"
                              role="img"
                              aria-label={data
                                .map(
                                  (s, i) =>
                                    `Session ${i + 1}: ${(s[key] || 0).toFixed(1)} ${key}`,
                                )
                                .join("; ")}
                            >
                              <svg
                                viewBox="0 0 500 120"
                                preserveAspectRatio="none"
                              >
                                <path
                                  d="M 10 25 H 490 M 10 65 H 490 M 10 105 H 490"
                                  className="chart-grid"
                                />
                                <polyline
                                  points={data
                                    .map(
                                      (s, i) =>
                                        `${10 + (data.length === 1 ? 240 : (i * 480) / (data.length - 1))},${105 - ((s[key] || 0) / max) * 90}`,
                                    )
                                    .join(" ")}
                                  fill="none"
                                  className="chart-line"
                                />
                                {data.map((s, i) => (
                                  <circle
                                    key={s.id}
                                    cx={
                                      10 +
                                      (data.length === 1
                                        ? 240
                                        : (i * 480) / (data.length - 1))
                                    }
                                    cy={105 - ((s[key] || 0) / max) * 90}
                                    r="3"
                                  />
                                ))}
                              </svg>
                            </div>
                            <div className="chart-caption">
                              <span>EARLIER</span>
                              <span>MOST RECENT</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <BarChart3 size={28} />
                    <h3>Your next chapter starts with a keystroke.</h3>
                    <p>
                      Complete a drill or copy practice to see speed and
                      accuracy trends.
                    </p>
                    <button
                      className="primary"
                      onClick={() => navigate("drill")}
                    >
                      Start a drill <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
              <section className="panel history-panel">
                <div className="panel-title">
                  <h2>
                    Session history{" "}
                    <span className="count">{history.length}</span>
                  </h2>
                  <button
                    className="text-button"
                    disabled={!history.length}
                    onClick={() => setConfirm("history")}
                  >
                    <Trash2 size={14} /> Reset history
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>EXERCISE</th>
                        <th>MODE</th>
                        <th>WPM / WORDS</th>
                        <th>ACCURACY</th>
                        <th>TIME</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.title}</strong>
                            <small>
                              {s.status === "timed-out"
                                ? "Time is up"
                                : "Completed"}
                            </small>
                          </td>
                          <td>{labels[s.mode]}</td>
                          <td>
                            {s.mode === "writing"
                              ? `${s.words} words`
                              : (s.wpm || 0).toFixed(1)}
                          </td>
                          <td>
                            {s.mode === "writing"
                              ? "—"
                              : `${(s.accuracy || 0).toFixed(1)}%`}
                          </td>
                          <td className="mono">{timeLabel(s.elapsed)}</td>
                          <td>
                            {new Date(s.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!history.length && (
                    <p className="no-history">
                      No sessions yet. Your completed practice will appear here.
                    </p>
                  )}
                </div>
                <p className="panel-footnote">
                  The latest 200 sessions are stored on this device. Writing
                  sessions have no accuracy score.
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="mode-tabs" aria-label="Practice modes">
                {(["drill", "copy", "writing"] as Mode[]).map((m, i) => (
                  <button
                    key={m}
                    onClick={() => navigate(m)}
                    className={mode === m ? "active" : ""}
                  >
                    <span>0{i + 1}</span>
                    {labels[m]}
                  </button>
                ))}
              </div>
              <div className="metrics-grid">
                {mode === "writing" ? (
                  <>
                    <Metric
                      label="WORDS WRITTEN"
                      value={String(words)}
                      unit={`/ ${minimum}`}
                      icon={<Type size={14} />}
                    />
                    <Metric
                      label="REMAINING"
                      value={timeLabel(limit - elapsed)}
                      icon={<Clock3 size={14} />}
                    />
                    <Metric
                      label="TIME USED"
                      value={timeLabel(elapsed)}
                      icon={<Activity size={14} />}
                    />
                    <Metric
                      label="WORD MINIMUM"
                      value={words >= minimum ? "MET" : "IN PROGRESS"}
                      icon={<Target size={14} />}
                    />
                  </>
                ) : (
                  <>
                    <Metric
                      label="TYPING SPEED"
                      value={metrics.wpm.toFixed(1)}
                      unit="WPM"
                      icon={<Zap size={14} />}
                    />
                    <Metric
                      label="ACCURACY"
                      value={metrics.accuracy.toFixed(1)}
                      unit="%"
                      icon={<Target size={14} />}
                    />
                    <Metric
                      label={mode === "drill" ? "TIME LEFT" : "ELAPSED TIME"}
                      value={timeLabel(
                        mode === "drill" ? limit - elapsed : elapsed,
                      )}
                      icon={<Clock3 size={14} />}
                    />
                    <Metric
                      label="UNCORRECTED ERRORS"
                      value={String(metrics.errors)}
                      icon={<Activity size={14} />}
                    />
                  </>
                )}
              </div>
              <section
                className="panel practice-panel"
                aria-label={labels[mode]}
              >
                <div className="practice-toolbar">
                  <div className="exercise-meta">
                    <span className="tag">
                      {mode === "writing"
                        ? `TASK ${prompt.task}`
                        : mode === "copy"
                          ? "PASSAGE"
                          : "DRILL"}
                    </span>
                    <span>
                      {mode === "writing" ? prompt.title : exercise.category}
                    </span>
                  </div>
                  <div className="practice-options">
                    {mode === "drill" ? (
                      <div className="segmented" aria-label="Practice duration">
                        {[1, 3, 5].map((n) => (
                          <button
                            key={n}
                            disabled={
                              status === "active" || status === "paused"
                            }
                            aria-pressed={duration === n}
                            className={duration === n ? "chosen" : ""}
                            onClick={() => {
                              reset();
                              setDuration(n);
                            }}
                          >
                            {n} min
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {!(mode === "writing" && writingSource === "amplify") && (
                      <>
                        <label className="sr-only" htmlFor="exercise-select">
                          {mode === "writing"
                            ? "Select writing prompt"
                            : "Select exercise"}
                        </label>
                        <select
                          id="exercise-select"
                          value={mode === "writing" ? promptId : index}
                          disabled={
                            mode !== "writing" &&
                            (status === "active" || status === "paused")
                          }
                          onChange={(e) => {
                            if (mode === "writing")
                              selectPrompt(e.target.value);
                            else {
                              reset();
                              setIndex(Number(e.target.value));
                            }
                          }}
                        >
                          {(mode === "writing"
                            ? availablePrompts
                            : mode === "copy"
                              ? passages
                              : drills
                          ).map((e, i) => (
                            <option
                              key={e.id}
                              value={mode === "writing" ? e.id : i}
                            >
                              {mode === "writing"
                                ? `Task ${"task" in e ? e.task : ""} · `
                                : ""}
                              {e.title}
                              {mode === "writing" && drafts[e.id]?.text
                                ? " · saved"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
                {mode === "writing" && (
                  <>
                    <div
                      className="writing-source"
                      aria-label="Writing question source"
                    >
                      <button
                        className={writingSource === "local" ? "selected" : ""}
                        aria-pressed={writingSource === "local"}
                        onClick={() => chooseWritingSource("local")}
                      >
                        KEYFLOW built-ins
                      </button>
                      <button
                        className={
                          writingSource === "amplify" ? "selected" : ""
                        }
                        aria-pressed={writingSource === "amplify"}
                        onClick={() => chooseWritingSource("amplify")}
                      >
                        AMPLIFY question bank
                      </button>
                    </div>
                    {writingSource === "amplify" && (
                      <AmplifyPicker
                        drafts={drafts}
                        onLoad={loadAmplify}
                        onRestore={restoreAmplify}
                      />
                    )}
                  </>
                )}
                {mode === "writing" &&
                  writingSource === "local" &&
                  !prompt.amplify &&
                  prompt.task === 1 && (
                    <div
                      className="task1-tools"
                      aria-label="Task 1 practice options"
                    >
                      <div className="practice-level">
                        <div
                          className="segmented"
                          aria-label="Task 1 practice category"
                        >
                          <button
                            className={!visualPractice ? "chosen" : ""}
                            aria-pressed={!visualPractice}
                            onClick={() =>
                              selectPrompt(lastBasicPrompt.current)
                            }
                          >
                            Basic Practice
                          </button>
                          <button
                            className={visualPractice ? "chosen" : ""}
                            aria-pressed={visualPractice}
                            onClick={() => {
                              setVisualCategory("all");
                              selectPrompt(lastVisualPrompt.current);
                            }}
                          >
                            Visual Practice
                          </button>
                        </div>
                        <p>
                          {visualPractice
                            ? "Interpret realistic visuals. Develop your overview and comparisons."
                            : "Build typing fluency and writing structure with the original simple questions."}
                        </p>
                      </div>
                      {visualPractice && (
                        <div className="visual-selection">
                          <label htmlFor="visual-category">Question type</label>
                          <select
                            id="visual-category"
                            value={visualCategory}
                            onChange={(e) => {
                              const category = e.target.value as
                                VisualCategory | "all";
                              setVisualCategory(category);
                              selectPrompt(questionsInCategory(category)[0].id);
                            }}
                          >
                            <option value="all">All visual types (21)</option>
                            {visualCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label} (3)
                              </option>
                            ))}
                          </select>
                          <button
                            className="secondary compact"
                            onClick={() =>
                              selectPrompt(
                                randomVisualQuestion(visualCategory, promptId)
                                  .id,
                              )
                            }
                          >
                            Random Question <ArrowRight size={13} />
                          </button>
                          <span className="visual-question-count">
                            {questionsInCategory(visualCategory).length}{" "}
                            questions · saves separately
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                {mode === "writing" ? (
                  <div className="writing-layout">
                    <div className="prompt">
                      <div className="eyebrow">
                        {remoteTrack
                          ? `${trackLabel(remoteTrack).toUpperCase()} WRITING`
                          : "ACADEMIC WRITING"}{" "}
                        / TASK {prompt.task}
                      </div>
                      <h2>{prompt.title}</h2>
                      <p
                        className={
                          prompt.amplify ? "amplify-question-copy" : undefined
                        }
                      >
                        {prompt.question}
                      </p>
                      {prompt.unavailable && (
                        <p className="notice" role="status">
                          Saved answer restored independently of the question
                          bank. Hidden questions are excluded from new
                          selections.
                        </p>
                      )}
                      {prompt.amplify && (
                        <RemoteMaterials key={prompt.id} prompt={prompt} />
                      )}
                      {prompt.visual && (
                        <QuestionVisual
                          key={prompt.id}
                          visual={prompt.visual}
                        />
                      )}
                      {prompt.visual && (
                        <p className="source-note">{prompt.note}</p>
                      )}
                      {prompt.headers && (
                        <div className="table-scroll">
                          <table className="data-table">
                            <thead>
                              <tr>
                                {prompt.headers.map((h) => (
                                  <th key={h}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {prompt.rows?.map((r, i) => (
                                <tr key={i}>
                                  {r.map((v, j) => (
                                    <td key={j}>{v}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="source-note">{prompt.note}</p>
                        </div>
                      )}
                      <p className="prompt-instructions">
                        Write at least {minimum} words.{" "}
                        {prompt.amplify
                          ? "Follow the original instructions supplied by AMPLIFY above."
                          : prompt.task === 2
                            ? "Give reasons for your answer and include relevant examples from your own knowledge or experience."
                            : "Summarise the key features and relevant comparisons."}
                      </p>
                      <p className="source-note">
                        {prompt.amplify
                          ? "Question supplied by AMPLIFY’s published Writing bank."
                          : "Original KEYFLOW practice prompt. No official IELTS affiliation."}
                      </p>
                    </div>
                    <div className="writing-editor">
                      <div className="editor-label">
                        <label htmlFor="writing-input">YOUR RESPONSE</label>
                        <span>
                          {storageError
                            ? "Not saved"
                            : text
                              ? "Saved on this device"
                              : "Autosave on"}
                        </span>
                      </div>
                      <textarea
                        id="writing-input"
                        ref={editor}
                        value={text}
                        onChange={(e) => changeText(e.target.value)}
                        readOnly={status === "paused" || finished}
                        placeholder="Begin your response here. The timer starts with your first keystroke."
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                      />
                      <div className="word-progress">
                        <div
                          style={{
                            width: `${Math.min(100, (words / minimum) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="editor-caption">
                        <span>
                          {words} / {minimum} words minimum
                        </span>
                        <span>
                          {words >= minimum
                            ? "Minimum reached"
                            : "Keep developing your response"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="typing-body">
                    <div className="target-heading">
                      <h2>{exercise.title}</h2>
                      <span className="mono">
                        {String(index + 1).padStart(2, "0")} /{" "}
                        {String(
                          mode === "copy" ? passages.length : drills.length,
                        ).padStart(2, "0")}
                      </span>
                    </div>
                    <div
                      className={`target-text ${mode === "copy" ? "copy-target" : ""}`}
                      data-testid="target-text"
                      aria-label="Reference text"
                    >
                      {Array.from(target).map((char, i) => (
                        <span
                          key={i}
                          className={`${i < text.length ? (text[i] === char ? "correct" : "incorrect") : ""} ${i === text.length && !finished ? "caret" : ""}`}
                          aria-hidden="true"
                        >
                          {char}
                        </span>
                      ))}
                      <span className="sr-only">{target}</span>
                    </div>
                    <div className="input-wrap">
                      <label htmlFor="typing-input">
                        YOUR TRANSCRIPTION{" "}
                        <span>
                          {status === "ready"
                            ? "Start typing to begin"
                            : `${text.length} / ${target.length} characters`}
                        </span>
                      </label>
                      <textarea
                        id="typing-input"
                        ref={editor}
                        value={text}
                        onChange={(e) => changeText(e.target.value)}
                        readOnly={status === "paused" || finished}
                        onPaste={(e) => {
                          e.preventDefault();
                          setNotice(
                            "Type the passage to measure your own speed. Pasting is disabled in reference practice.",
                          );
                        }}
                        onDrop={(e) => e.preventDefault()}
                        placeholder="Type the text above, exactly as it appears…"
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        aria-describedby="typing-help"
                      />
                    </div>
                    <div className="typing-help" id="typing-help">
                      <span>
                        <i className="legend-correct" />
                        Correct
                      </span>
                      <span>
                        <i className="legend-error" />
                        Incorrect
                      </span>
                      <span>
                        Backspace to correct · {mistakes} mistakes made
                      </span>
                    </div>
                  </div>
                )}
                <div className="practice-footer">
                  <div
                    className={`status ${status === "active" ? "running" : ""}`}
                    role="status"
                  >
                    <i className="dot" />
                    {statusText[status]}
                    {status === "ready" && (
                      <span>· Timer starts on first keystroke</span>
                    )}
                  </div>
                  <div className="actions">
                    {mode === "writing" && (
                      <button
                        className="text-button"
                        disabled={!text}
                        onClick={() =>
                          download(
                            text,
                            `keyflow-task-${prompt.task}-${prompt.id}.txt`,
                          )
                        }
                      >
                        <ArrowDownToLine size={14} /> Export
                      </button>
                    )}
                    <IconButton
                      label="Restart exercise"
                      onClick={() =>
                        mode === "writing" && text
                          ? setConfirm("restart")
                          : reset()
                      }
                    >
                      <RotateCcw size={16} />
                    </IconButton>
                    {(status === "active" || status === "paused") && (
                      <button className="secondary compact" onClick={pause}>
                        {status === "paused" ? (
                          <Play size={14} />
                        ) : (
                          <Pause size={14} />
                        )}{" "}
                        {status === "paused" ? "Resume" : "Pause"}
                      </button>
                    )}
                    {mode === "writing" ? (
                      <button
                        className="primary compact"
                        disabled={finished || !text}
                        onClick={() => finish("completed")}
                      >
                        Finish writing <Check size={14} />
                      </button>
                    ) : (
                      <button
                        className="primary compact"
                        onClick={nextExercise}
                      >
                        Next exercise <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </section>
              {finished && (
                <section
                  className="result-panel"
                  aria-label="Session results"
                  role="status"
                >
                  <div className="result-icon">
                    <Check size={22} />
                  </div>
                  <div>
                    <div className="eyebrow">SESSION RECORDED</div>
                    <h2>
                      {status === "timed-out"
                        ? "Time is up. Every keystroke counts."
                        : "Practice complete. Keep the momentum."}
                    </h2>
                    <p>
                      {mode === "writing"
                        ? `${words} words · ${timeLabel(elapsed)} used · ${words >= minimum ? "Word minimum reached" : "Below the " + minimum + "-word minimum"}. No band score or accuracy is assigned.`
                        : `${metrics.wpm.toFixed(1)} WPM · ${metrics.accuracy.toFixed(1)}% accuracy · ${metrics.errors} uncorrected errors · ${mistakes} mistakes made · ${timeLabel(elapsed)} elapsed`}
                    </p>
                  </div>
                  <div className="result-actions">
                    {mode === "writing" ? (
                      <>
                        <button className="secondary" onClick={copyWriting}>
                          <Copy size={15} /> Copy writing
                        </button>
                        <button
                          className="primary"
                          onClick={() =>
                            download(text, `keyflow-${prompt.id}.txt`)
                          }
                        >
                          <ArrowDownToLine size={15} /> Export .txt
                        </button>
                      </>
                    ) : (
                      <button className="secondary" onClick={nextExercise}>
                        Keep practising <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                </section>
              )}
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
              <div className="bottom-grid">
                <section className="note-card">
                  <span className="note-icon">
                    <Target size={20} />
                  </span>
                  <div>
                    <div className="eyebrow">
                      {mode === "writing"
                        ? "EXAM MINDSET"
                        : "THE PRECISION PRINCIPLE"}
                    </div>
                    <h3>
                      {mode === "writing"
                        ? "Make room for a final review."
                        : "Accuracy first. Speed follows."}
                    </h3>
                    <p>
                      {mode === "writing"
                        ? "Plan your response, develop your ideas, and reserve a few minutes to check grammar and punctuation. Pauses are for practice; the real exam clock keeps running."
                        : "Build a steady rhythm before you chase a higher WPM. Practise the punctuation and phrasing you’ll use on test day."}
                    </p>
                  </div>
                </section>
                <section className="session-note">
                  <div className="eyebrow">
                    {mode === "writing" ? "DRAFT PROTECTION" : "HOW WE MEASURE"}
                  </div>
                  <p>
                    {mode === "writing"
                      ? "Each prompt has its own saved draft. Switching modes pauses your session. After a reload, resume when ready. Closed-tab time is excluded. Export a copy for safekeeping."
                      : "WPM = correct characters ÷ 5 ÷ elapsed minutes. Accuracy compares your current text with the reference. Corrections repair accuracy; mistakes made remain counted."}
                  </p>
                  <span className="mono">
                    {mode === "writing"
                      ? "LOCAL AUTOSAVE / NO UPLOADS"
                      : "CONSISTENT METRICS / MEANINGFUL PRACTICE"}
                  </span>
                </section>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              KEYFLOW <span className="muted">/</span> BUILT FOR YOUR NEXT
              CHAPTER.
            </span>
            <span>
              <ShieldCheck size={12} /> PRIVATE BY DESIGN
            </span>
          </footer>
        </main>
      </div>
      {confirm && (
        <div
          className="modal-backdrop"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setConfirm(null);
              requestAnimationFrame(() => editor.current?.focus());
            }
            if (e.key === "Tab") {
              const buttons = Array.from(
                e.currentTarget.querySelectorAll("button"),
              );
              const first = buttons[0],
                last = buttons[buttons.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <Trash2 size={23} />
            <h2 id="confirm-title">
              {confirm === "history"
                ? "Reset your session history?"
                : "Restart this writing draft?"}
            </h2>
            <p>
              {confirm === "history"
                ? "Your recorded sessions and personal best will be removed from this browser. Writing drafts and preferences will stay."
                : "This replaces the saved response for this prompt. Export your writing first if you want to keep a copy."}
            </p>
            <div className="actions">
              <button
                ref={confirmRef}
                className="secondary"
                onClick={() => {
                  setConfirm(null);
                  editor.current?.focus();
                }}
              >
                Cancel
              </button>
              {confirm === "restart" && (
                <button
                  className="secondary"
                  onClick={() => download(text, `keyflow-${prompt.id}.txt`)}
                >
                  Export first
                </button>
              )}
              <button
                className="primary"
                onClick={() => {
                  if (confirm === "history") {
                    setHistory([]);
                    persist(KEYS.history, []);
                    setConfirm(null);
                  } else reset();
                }}
              >
                {confirm === "history" ? "Reset history" : "Restart draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
