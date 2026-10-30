"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Clock3,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Target,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { elapsedMs, timeLabel, type Clock } from "@/lib/metrics";
import {
  characterNeedsShift,
  fingerForCharacter,
  fingerOrder,
  keyboardKeyForCharacter,
  nextRequiredCharacter,
  type FingerId,
} from "@/lib/keyboard-fingers";
import { KEYS, read, write, type Session } from "@/lib/storage";
import {
  basicTrainingSpaceAction,
  basicTrainingSpaceInstruction,
  basicTypingScore,
  characterStates,
  emptyLedger,
  isSpacebarShortcut,
  nextLessonIndex,
  recordGuidedKeystroke,
  recordTypingEdit,
  restoreBasicTrainingDraft,
  shouldAdvanceItem,
  shouldCompleteTarget,
  isUnmodifiedPrintableKey,
  shouldPlayIncorrectKeySound,
  validBasicTrainingDraft,
  type BasicTrainingDraft,
} from "@/lib/basic-training";
import {
  difficulties,
  keyboardLessons,
  sentenceLists,
  speedPassage,
  starterPracticeText,
  wordLists,
  type BasicTrainingMode,
  type Difficulty,
} from "@/lib/basic-training-content";

type Props = {
  history: Session[];
  onSessionComplete: (session: Session) => void;
};
const modes: { id: BasicTrainingMode; label: string }[] = [
  { id: "keyboard", label: "Keyboard" },
  { id: "words", label: "Words" },
  { id: "sentences", label: "Sentences" },
  { id: "speed", label: "Speed test" },
  { id: "free", label: "Free typing" },
];
const emptyDraft: BasicTrainingDraft = {
  version: 1,
  mode: "keyboard",
  difficulty: "beginner",
  duration: 1,
  lessonIndex: 0,
  itemIndex: 0,
  completedItems: 0,
  input: "",
  practiceText: starterPracticeText,
  freeSource: starterPracticeText,
  elapsed: 0,
  status: "ready",
  ledger: emptyLedger(),
};

function targetForDraft(draft: BasicTrainingDraft) {
  if (draft.mode === "keyboard")
    return keyboardLessons[draft.lessonIndex % keyboardLessons.length].text;
  if (draft.mode === "words")
    return wordLists[draft.difficulty][
      draft.itemIndex % wordLists[draft.difficulty].length
    ];
  if (draft.mode === "sentences")
    return sentenceLists[draft.difficulty][
      draft.itemIndex % sentenceLists[draft.difficulty].length
    ];
  if (draft.mode === "speed") return speedPassage;
  return draft.practiceText;
}

export default function BasicTraining({ history, onSessionComplete }: Props) {
  const [draft, setDraft] = useState<BasicTrainingDraft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef<Clock>({ elapsed: 0, started: null });
  const draftRef = useRef(draft);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const trainingSurface = useRef<HTMLDivElement>(null);
  const sessionId = useRef("");
  const audioContext = useRef<AudioContext | null>(null);
  const activeErrorTone = useRef<OscillatorNode | null>(null);
  const [incorrectAttempt, setIncorrectAttempt] = useState<{
    key: string;
    expected: string;
  } | null>(null);

  const target = useMemo(() => targetForDraft(draft), [draft]);
  const timed = draft.mode === "speed";
  const guidedMode =
    draft.mode === "keyboard" ||
    draft.mode === "words" ||
    draft.mode === "sentences";
  const limit = timed ? draft.duration * 60_000 : Infinity;
  const finished = draft.status === "completed" || draft.status === "timed-out";
  const lessonComplete =
    draft.mode === "keyboard" && draft.input.length >= target.length;
  const score = basicTypingScore(draft.ledger, elapsed);
  const states = characterStates(target, draft.input);
  const currentLesson =
    keyboardLessons[draft.lessonIndex % keyboardLessons.length];
  const title =
    draft.mode === "keyboard"
      ? currentLesson.title
      : draft.mode === "words"
        ? `${draft.difficulty} word set`
        : draft.mode === "sentences"
          ? `${draft.difficulty} sentences`
          : draft.mode === "speed"
            ? `${draft.duration}-minute speed test`
            : "Free typing";

  const update = useCallback((next: BasicTrainingDraft) => {
    draftRef.current = next;
    setDraft(next);
    if (!write(KEYS.basicTraining, next)) setStorageUnavailable(true);
  }, []);

  const focusPracticeSurface = useCallback((immediate = false) => {
    const focus = () => {
      const current = draftRef.current;
      if (
        current.mode === "keyboard" ||
        current.mode === "words" ||
        current.mode === "sentences"
      )
        trainingSurface.current?.focus({ preventScroll: true });
      else textarea.current?.focus({ preventScroll: true });
    };
    if (immediate) focus();
    else window.setTimeout(focus, 0);
  }, []);

  useEffect(() => {
    const saved = read(KEYS.basicTraining, emptyDraft, validBasicTrainingDraft);
    const savedSound = read(
      KEYS.basicTrainingSound,
      true,
      (value) => typeof value === "boolean",
    );
    const restored = restoreBasicTrainingDraft(saved, targetForDraft(saved));
    window.setTimeout(() => {
      clock.current = { elapsed: restored.elapsed, started: null };
      setElapsed(restored.elapsed);
      setSoundEnabled(savedSound);
      update(restored);
      setReady(true);
      focusPracticeSurface();
    }, 0);
    // Restore the saved exercise once, then focus its input surface.
  }, [focusPracticeSurface, update]);

  useEffect(
    () => () => {
      const context = audioContext.current;
      audioContext.current = null;
      activeErrorTone.current = null;
      if (context && context.state !== "closed") void context.close();
    },
    [],
  );

  const playIncorrectSound = useCallback(() => {
    if (!soundEnabled || activeErrorTone.current) return;
    try {
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      if (context.state === "suspended") void context.resume().catch(() => {});

      const start = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(155, start);
      oscillator.frequency.exponentialRampToValueAtTime(105, start + 0.12);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.075, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      oscillator.connect(gain);
      gain.connect(context.destination);
      activeErrorTone.current = oscillator;
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        if (activeErrorTone.current === oscillator)
          activeErrorTone.current = null;
      };
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    } catch {
      // Audio is optional; unsupported or blocked audio must not interrupt practice.
      activeErrorTone.current = null;
    }
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (!write(KEYS.basicTrainingSound, next)) setStorageUnavailable(true);
    if (!next && activeErrorTone.current) {
      try {
        activeErrorTone.current.stop();
      } catch {
        activeErrorTone.current = null;
      }
    }
  };

  useEffect(() => {
    if (ready) focusPracticeSurface();
  }, [ready, draft.mode, draft.status, focusPracticeSurface]);

  useEffect(() => {
    if (!ready) return;
    const save = () => {
      const current = draftRef.current;
      const ms = elapsedMs(
        clock.current,
        Date.now(),
        current.mode === "speed" ? current.duration * 60_000 : Infinity,
      );
      const next = {
        ...current,
        elapsed: ms,
        status:
          current.status === "active" ? ("paused" as const) : current.status,
      };
      if (current.status === "active")
        clock.current = { elapsed: ms, started: null };
      draftRef.current = next;
      write(KEYS.basicTraining, next);
    };
    const hide = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", hide);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [ready]);

  const complete = (
    status: "completed" | "timed-out",
    ms = elapsedMs(clock.current, Date.now(), limit),
  ) => {
    const current = draftRef.current;
    if (current.status === "completed" || current.status === "timed-out")
      return;
    clock.current = { elapsed: ms, started: null };
    setElapsed(ms);
    const next = { ...current, elapsed: ms, status };
    draftRef.current = next;
    setDraft(next);
    write(KEYS.basicTraining, next);
    const result = basicTypingScore(current.ledger, ms);
    onSessionComplete({
      id: sessionId.current || crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: current.mode,
      title,
      elapsed: ms,
      status,
      wpm: result.wpm,
      accuracy: result.accuracy,
      errors: current.ledger.errors,
      mistypedKeys: current.ledger.mistypedKeys,
    });
  };

  useEffect(() => {
    if (draft.status !== "active") return;
    const tick = () => {
      const ms = elapsedMs(clock.current, Date.now(), limit);
      setElapsed(ms);
      if (timed && ms >= limit) complete("timed-out", ms);
    };
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.status, limit, timed]);

  const begin = useCallback(() => {
    if (draftRef.current.status === "ready") {
      clock.current.started = Date.now();
      sessionId.current = crypto.randomUUID();
      update({ ...draftRef.current, status: "active" });
    }
  }, [update]);
  const restart = useCallback(
    (focus = true) => {
      clock.current = { elapsed: 0, started: null };
      setElapsed(0);
      sessionId.current = "";
      const current = draftRef.current;
      update({
        ...current,
        input: "",
        elapsed: 0,
        status: "ready",
        ledger: emptyLedger(),
      });
      setIncorrectAttempt(null);
      if (focus) focusPracticeSurface();
    },
    [focusPracticeSurface, update],
  );
  const resume = useCallback(() => {
    const current = draftRef.current;
    if (current.status !== "paused") return;
    clock.current = { elapsed: current.elapsed, started: Date.now() };
    update({ ...current, status: "active" });
    focusPracticeSurface(true);
  }, [focusPracticeSurface, update]);
  const activateFromSpace = useCallback(() => {
    const action = basicTrainingSpaceAction(draftRef.current.status);
    if (action === "start") begin();
    else if (action === "resume") resume();
    else if (action === "restart") restart(false);
    focusPracticeSurface(true);
  }, [begin, focusPracticeSurface, restart, resume]);
  const changeMode = (mode: BasicTrainingMode) => {
    if (mode === draft.mode) {
      focusPracticeSurface();
      return;
    }
    clock.current = { elapsed: 0, started: null };
    setElapsed(0);
    sessionId.current = "";
    update({
      ...draftRef.current,
      mode,
      input: "",
      elapsed: 0,
      status: "ready",
      ledger: emptyLedger(),
    });
    setIncorrectAttempt(null);
    focusPracticeSurface();
  };
  const edit = (value: string) => {
    const current = draftRef.current;
    if (
      finished ||
      current.status === "paused" ||
      current.status === "timed-out"
    )
      return;
    if (value.length > current.input.length && current.status === "ready")
      begin();
    const ledger = recordTypingEdit(
      current.input,
      value,
      target,
      current.ledger,
    );
    if (ledger.errors > current.ledger.errors) playIncorrectSound();
    const ms = elapsedMs(clock.current, Date.now(), limit);
    let next: BasicTrainingDraft = {
      ...current,
      input: value,
      ledger,
      elapsed: ms,
      status:
        current.status === "ready" && value.length ? "active" : current.status,
    };
    if (timed && ms >= limit) {
      complete("timed-out", limit);
      return;
    }
    if (shouldCompleteTarget(current.mode, target, value))
      next.status = current.status === "ready" ? "active" : current.status;
    if (shouldAdvanceItem(current.mode, target, value)) {
      next = {
        ...next,
        input: "",
        itemIndex: current.itemIndex + 1,
        completedItems: current.completedItems + 1,
      };
    }
    update(next);
    setIncorrectAttempt(null);
    if (shouldCompleteTarget(current.mode, target, value)) {
      // Persist finished lesson/test. Other untimed modes remain open-ended.
      window.setTimeout(() => complete("completed", ms), 0);
    }
  };
  const handleGuidedKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    const element = event.target;
    if (
      element instanceof HTMLElement &&
      element.closest("button,input,textarea,select,[contenteditable='true']")
    )
      return;
    const typedKey =
      event.key === "Spacebar" || event.key === "Space" ? " " : event.key;
    if (!isUnmodifiedPrintableKey(typedKey, event)) return;

    const current = draftRef.current;
    if (
      current.status === "paused" ||
      current.status === "completed" ||
      current.status === "timed-out"
    )
      return;
    if (event.key === "Backspace") {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    if (current.status === "ready") {
      clock.current.started = Date.now();
      sessionId.current = crypto.randomUUID();
    }
    const attempt = recordGuidedKeystroke(
      current.input,
      typedKey,
      target,
      current.ledger,
    );
    if (!attempt.accepted) {
      setIncorrectAttempt({ key: typedKey, expected: attempt.expected });
      if (
        shouldPlayIncorrectKeySound(
          attempt.accepted,
          attempt.expected,
          soundEnabled,
        )
      )
        playIncorrectSound();
    } else {
      setIncorrectAttempt(null);
    }

    const ms = elapsedMs(clock.current, Date.now(), limit);
    let next: BasicTrainingDraft = {
      ...current,
      input: attempt.input,
      ledger: attempt.ledger,
      elapsed: ms,
      status: current.status === "ready" ? "active" : current.status,
    };
    if (
      attempt.accepted &&
      shouldAdvanceItem(current.mode, target, attempt.input)
    ) {
      next = {
        ...next,
        input: "",
        itemIndex: current.itemIndex + 1,
        completedItems: current.completedItems + 1,
      };
    }
    update(next);
    if (shouldCompleteTarget(current.mode, target, attempt.input))
      window.setTimeout(() => complete("completed", ms), 0);
  };

  useEffect(() => {
    const handleSpacebar = (event: KeyboardEvent) => {
      if (!isSpacebarShortcut(event)) return;

      const element = event.target instanceof HTMLElement ? event.target : null;
      const typingInput = element?.id === "basic-typing-input";
      const current = draftRef.current;
      const action = basicTrainingSpaceAction(current.status);
      const focusedControl = element?.closest(
        "button,input,textarea,select,[contenteditable='true']",
      );
      const inGuidedSurface = Boolean(
        element && trainingSurface.current?.contains(element),
      );
      const isTrainingControl =
        typingInput || (inGuidedSurface && !focusedControl);

      // Do not steal Space from other editors or controls (for example, the
      // free-text reference field, mode selector, or sound toggle).
      if (focusedControl && !isTrainingControl) return;
      if (event.repeat && action !== "type") return;

      if (action === "type") {
        // Running Space is never a session shortcut. If focus was lost, leave
        // the key alone; the visible Focus Typing button restores input focus.
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      activateFromSpace();
    };

    window.addEventListener("keydown", handleSpacebar, true);
    return () => window.removeEventListener("keydown", handleSpacebar, true);
  }, [activateFromSpace, focusPracticeSurface]);

  const chooseDifficulty = (difficulty: Difficulty) => {
    update({
      ...draftRef.current,
      difficulty,
      itemIndex: 0,
      completedItems: 0,
      input: "",
      elapsed: 0,
      status: "ready",
      ledger: emptyLedger(),
    });
    clock.current = { elapsed: 0, started: null };
    setElapsed(0);
    sessionId.current = "";
    setIncorrectAttempt(null);
    focusPracticeSurface();
  };
  const chooseDuration = (duration: 1 | 3 | 5) => {
    update({
      ...draftRef.current,
      duration,
      input: "",
      elapsed: 0,
      status: "ready",
      ledger: emptyLedger(),
    });
    clock.current = { elapsed: 0, started: null };
    setElapsed(0);
    sessionId.current = "";
    setIncorrectAttempt(null);
    focusPracticeSurface();
  };
  const changeFreeSource = (freeSource: string) =>
    update({ ...draftRef.current, freeSource });
  const applyFreeSource = () => {
    const text = draftRef.current.freeSource.trim();
    if (!text) return;
    clock.current = { elapsed: 0, started: null };
    setElapsed(0);
    sessionId.current = "";
    update({
      ...draftRef.current,
      practiceText: text,
      input: "",
      elapsed: 0,
      status: "ready",
      ledger: emptyLedger(),
    });
    setIncorrectAttempt(null);
    focusPracticeSurface();
  };

  const mistakes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const session of history)
      for (const [key, count] of Object.entries(session.mistypedKeys || {}))
        counts[key] = (counts[key] || 0) + count;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [history]);

  if (!ready)
    return <div className="panel p-6 text-sm">Restoring your training…</div>;
  return (
    <div className="basic-training">
      <div className="mode-tabs" aria-label="Basic training modes">
        {modes.map(({ id, label }) => (
          <button
            key={id}
            className={draft.mode === id ? "active" : ""}
            aria-pressed={draft.mode === id}
            onClick={() => changeMode(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="basic-training-layout">
        <section
          className="panel basic-training-primary"
          aria-label="Basic typing practice"
        >
          <div className="basic-training-titlebar">
            <div>
              <div className="eyebrow">
                BASIC TRAINING / {draft.mode.toUpperCase()}
              </div>
              <h2>{title}</h2>
            </div>
          </div>
          {draft.mode === "free" && (
            <div className="basic-training-reference">
              <label htmlFor="free-reference">YOUR REFERENCE TEXT</label>
              <textarea
                id="free-reference"
                value={draft.freeSource}
                onChange={(e) => changeFreeSource(e.target.value)}
              />
              <button className="secondary w-fit" onClick={applyFreeSource}>
                Use this text
              </button>
            </div>
          )}
          <div
            ref={guidedMode ? trainingSurface : undefined}
            className={
              guidedMode ? "training-surface" : "basic-training-target"
            }
            role={guidedMode ? "group" : undefined}
            aria-label={
              guidedMode
                ? "Typing exercise. Type the highlighted character with your physical keyboard."
                : "Text to type"
            }
            tabIndex={guidedMode ? 0 : undefined}
            onKeyDown={guidedMode ? handleGuidedKeyDown : undefined}
            onClick={
              guidedMode ? () => trainingSurface.current?.focus() : undefined
            }
            onPaste={
              guidedMode
                ? (event) => {
                    event.preventDefault();
                  }
                : undefined
            }
          >
            <div className="basic-target-card">
              <div className="basic-target-label">
                <span>TARGET TEXT</span>
                <span>
                  {draft.mode === "words" || draft.mode === "sentences"
                    ? `ITEM ${draft.itemIndex + 1} · ${draft.completedItems} COMPLETE · ${draft.input.length}/${target.length}`
                    : `${draft.input.length} / ${target.length}`}
                </span>
              </div>
              <div className="target-text" aria-live="polite">
                {states.map((item, index) => (
                  <span
                    key={index}
                    className={`target-char ${item.state}${item.state === "current" && incorrectAttempt ? " error-current" : ""}`}
                    aria-current={item.state === "current" ? "true" : undefined}
                  >
                    {item.character === " " ? "\u00a0" : item.character}
                  </span>
                ))}
              </div>
            </div>
            <div className="training-space-row">
              <p
                className="training-space-hint"
                aria-live="polite"
                aria-atomic="true"
              >
                {basicTrainingSpaceInstruction(draft.status)}
              </p>
              <button
                type="button"
                className="secondary training-space-fallback"
                onClick={activateFromSpace}
              >
                Start / Focus Typing
              </button>
            </div>
            {guidedMode && (
              <KeyboardGuide target={target} input={draft.input} />
            )}
          </div>
          {!guidedMode && (
            <>
              <label htmlFor="basic-typing-input" className="sr-only">
                Type the target text
              </label>
              <textarea
                ref={textarea}
                id="basic-typing-input"
                aria-label="Type the target text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                value={draft.input}
                readOnly={finished || draft.status === "paused"}
                onChange={(e) => edit(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                }}
                placeholder={
                  draft.status === "paused"
                    ? "Paused — resume to continue"
                    : "Click here or start typing…"
                }
                className="basic-typing-input outline-none focus:border-[var(--text)] disabled:opacity-70"
              />
            </>
          )}
          <div className="basic-training-feedback">
            <span
              role="status"
              className={incorrectAttempt ? "training-feedback-error" : ""}
            >
              {incorrectAttempt && guidedMode
                ? `Incorrect “${displayKey(incorrectAttempt.key)}” · type “${displayKey(incorrectAttempt.expected)}” to continue · ${draft.ledger.errors} errors`
                : draft.status === "ready"
                  ? "Ready · type on your keyboard; timer starts on the first key"
                  : draft.status === "active"
                    ? guidedMode
                      ? `Running · type the highlighted key; ${draft.ledger.errors} errors counted`
                      : "Running · mistakes stay counted in your results"
                    : draft.status === "paused"
                      ? "Paused · select Resume to continue typing"
                      : draft.status === "timed-out"
                        ? "Time is up · results saved"
                        : "Complete · results saved"}
            </span>
            <span>Net WPM = (key presses − errors) ÷ 5 ÷ minutes</span>
          </div>
          {finished && (
            <div className="basic-training-results" role="status">
              <h3 className="font-semibold">
                {draft.status === "timed-out"
                  ? "Speed test complete"
                  : lessonComplete
                    ? "Lesson complete"
                    : "Session complete"}
              </h3>
              <p>
                {score.wpm.toFixed(1)} WPM · {score.accuracy.toFixed(1)}%
                accuracy · {score.correctCharacters} correct characters ·{" "}
                {score.errors} errors in {timeLabel(elapsed)}.
              </p>
              <div>
                <button className="secondary" onClick={() => restart()}>
                  Retry
                </button>
                {lessonComplete && (
                  <button
                    className="primary"
                    onClick={() => {
                      const nextLesson = nextLessonIndex(
                        draft.lessonIndex,
                        keyboardLessons.length,
                      );
                      update({
                        ...draftRef.current,
                        lessonIndex: nextLesson,
                        input: "",
                        elapsed: 0,
                        status: "ready",
                        ledger: emptyLedger(),
                      });
                      clock.current = { elapsed: 0, started: null };
                      setElapsed(0);
                      sessionId.current = "";
                      setIncorrectAttempt(null);
                      focusPracticeSurface();
                    }}
                  >
                    <Keyboard size={14} /> Next lesson
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
        <aside
          className="basic-training-aside"
          aria-label="Training statistics and controls"
        >
          <div className="basic-training-metrics">
            <BasicMetric
              label="WPM"
              value={score.wpm.toFixed(1)}
              unit=""
              icon={<Zap size={13} />}
            />
            <BasicMetric
              label="ACCURACY"
              value={`${score.accuracy.toFixed(1)}%`}
              unit=""
              icon={<Target size={13} />}
            />
            <BasicMetric
              label={timed ? "TIME LEFT" : "PRACTICE TIME"}
              value={timeLabel(timed ? limit - elapsed : elapsed)}
              unit=""
              icon={<Clock3 size={13} />}
            />
            <BasicMetric
              label="CORRECT / ERRORS"
              value={`${score.correctCharacters} / ${score.errors}`}
              unit=""
              icon={<Activity size={13} />}
            />
          </div>
          <section
            className="panel basic-training-controls-panel"
            aria-label="Practice controls"
          >
            <div className="panel-title">
              <h2>Session controls</h2>
              <span className="mono">{draft.status.toUpperCase()}</span>
            </div>
            <div className="basic-training-control-list">
              {(draft.mode === "words" || draft.mode === "sentences") && (
                <select
                  aria-label="Difficulty"
                  value={draft.difficulty}
                  onChange={(e) =>
                    chooseDifficulty(e.target.value as Difficulty)
                  }
                >
                  {difficulties.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
              {timed && (
                <div className="segmented" aria-label="Test duration">
                  {([1, 3, 5] as const).map((n) => (
                    <button
                      key={n}
                      aria-pressed={draft.duration === n}
                      className={draft.duration === n ? "active" : ""}
                      onClick={() => chooseDuration(n)}
                    >
                      {n} min
                    </button>
                  ))}
                </div>
              )}
              <button
                className="secondary basic-training-sound-toggle"
                type="button"
                aria-pressed={soundEnabled}
                aria-label={`Incorrect keystroke sound ${soundEnabled ? "on" : "off"}`}
                onClick={toggleSound}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                Sound {soundEnabled ? "On" : "Off"}
              </button>
              <button className="secondary" onClick={() => restart()}>
                <RotateCcw size={14} /> Restart
              </button>
              {draft.status === "active" ? (
                <button
                  className="secondary"
                  onClick={() => {
                    const ms = elapsedMs(clock.current, Date.now(), limit);
                    clock.current = { elapsed: ms, started: null };
                    setElapsed(ms);
                    update({
                      ...draftRef.current,
                      elapsed: ms,
                      status: "paused",
                    });
                  }}
                >
                  <Pause size={14} /> Pause
                </button>
              ) : draft.status === "paused" ? (
                <button className="secondary" onClick={resume}>
                  <Play size={14} /> Resume
                </button>
              ) : null}
              {draft.mode !== "speed" && !finished && (
                <button
                  className="secondary"
                  onClick={() => complete("completed")}
                  disabled={!draft.ledger.printableKeystrokes}
                >
                  Finish
                </button>
              )}
            </div>
          </section>
          <section className="panel p-4">
            <div className="panel-title">
              <h2>Commonly missed keys</h2>
              <span className="mono">LOCAL HISTORY</span>
            </div>
            {mistakes.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {mistakes.map(([key, count]) => (
                  <span key={key} className="tag">
                    {key === " " ? "Space" : key} · {count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Your frequently mistyped target keys will appear here after a
                few sessions.
              </p>
            )}
          </section>
        </aside>
      </div>
      {storageUnavailable && (
        <p className="text-xs text-amber-700" role="status">
          Browser storage is unavailable. Your current practice will remain in
          this tab only.
        </p>
      )}
    </div>
  );
}

function BasicMetric({
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

const keyboardRows = [
  "`1234567890-=",
  "QWERTYUIOP[]\\",
  "ASDFGHJKL;'",
  "ZXCVBNM,./",
];

const fingerLabels: Record<FingerId, string> = {
  "left-pinky": "Pinky",
  "left-ring": "Ring",
  "left-middle": "Middle",
  "left-index": "Index",
  "left-thumb": "Thumb",
  "right-thumb": "Thumb",
  "right-index": "Index",
  "right-middle": "Middle",
  "right-ring": "Ring",
  "right-pinky": "Pinky",
};
const shiftedLegends: Record<string, string> = {
  "`": "~",
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
  "-": "_",
  "=": "+",
  "[": "{",
  "]": "}",
  "\\": "|",
  ";": ":",
  "'": '"',
  ",": "<",
  ".": ">",
  "/": "?",
};

function KeyboardGuide({ target, input }: { target: string; input: string }) {
  const required = nextRequiredCharacter(target, input);
  const activeFinger = fingerForCharacter(required);
  const keyToHighlight = keyboardKeyForCharacter(required);
  const needsShift = characterNeedsShift(required);
  const shiftHand = activeFinger?.startsWith("left-") ? "right" : "left";

  return (
    <div className="keyboard-guide rounded border border-[var(--line)] p-3">
      <div className="keyboard-guide-heading">
        <Keyboard size={14} aria-hidden="true" />
        <strong>FINGER GUIDE</strong>
        <span aria-live="polite">
          {required
            ? `${required === " " ? "Space" : required} · ${activeFinger ? `${activeFinger.startsWith("left-") ? "Left" : "Right"} ${fingerLabels[activeFinger].toLowerCase()}` : "key"}`
            : "Lesson complete"}
        </span>
      </div>
      <div className="keyboard-visual-scroll" aria-label="Virtual keyboard">
        <div className="keyboard-visual">
          {keyboardRows.map((row) => (
            <div className="keyboard-key-row" key={row}>
              {Array.from(row).map((key) => {
                const active = keyToHighlight === key;
                return (
                  <kbd
                    key={key}
                    className={`keycap${active ? " next-key" : ""}`}
                    aria-current={active ? "true" : undefined}
                  >
                    {shiftedLegends[key] ? (
                      <>
                        <span className="keycap-shift-legend">
                          {shiftedLegends[key]}
                        </span>
                        <span>{key}</span>
                      </>
                    ) : (
                      key
                    )}
                  </kbd>
                );
              })}
            </div>
          ))}
          <div className="keyboard-key-row keyboard-bottom-row">
            <kbd
              className={`keycap keycap-wide shift-key${needsShift && shiftHand === "left" ? " shift-required" : ""}`}
            >
              ⇧ Shift
            </kbd>
            <kbd
              className={`keycap keycap-space${required === " " ? " next-key" : ""}`}
              aria-current={required === " " ? "true" : undefined}
            >
              Space
            </kbd>
            <kbd
              className={`keycap keycap-wide shift-key${needsShift && shiftHand === "right" ? " shift-required" : ""}`}
            >
              ⇧ Shift
            </kbd>
          </div>
        </div>
      </div>
      <div className="finger-guide" role="img" aria-label="Ten-finger guide">
        <div className="finger-hand">
          <span className="finger-hand-label">LEFT HAND</span>
          <div className="finger-row">
            {fingerOrder.slice(0, 5).map((finger) => (
              <FingerShape
                key={finger}
                finger={finger}
                active={finger === activeFinger}
              />
            ))}
          </div>
        </div>
        <div className="finger-hand">
          <span className="finger-hand-label">RIGHT HAND</span>
          <div className="finger-row">
            {fingerOrder.slice(5).map((finger) => (
              <FingerShape
                key={finger}
                finger={finger}
                active={finger === activeFinger}
              />
            ))}
          </div>
        </div>
      </div>
      {needsShift && required !== " " && (
        <p className="keyboard-shift-hint">
          Hold the {shiftHand}-hand Shift key while pressing the highlighted
          key.
        </p>
      )}
    </div>
  );
}

function FingerShape({
  finger,
  active,
}: {
  finger: FingerId;
  active: boolean;
}) {
  return (
    <span
      className={`finger-shape-wrap${finger.includes("thumb") ? " thumb" : ""}`}
      aria-hidden="true"
    >
      <span className={`finger-shape${active ? " active" : ""}`} />
      <span className="finger-label">{fingerLabels[finger]}</span>
    </span>
  );
}

function displayKey(key: string) {
  return key === " " ? "Space" : key;
}
