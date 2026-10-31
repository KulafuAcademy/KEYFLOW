"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Flame,
  Heart,
  RotateCcw,
  Shield,
  Swords,
  Zap,
} from "lucide-react";
import {
  availableHunterAttacks,
  calculateCounterDamage,
  calculateHunterDamage,
  calculateHunterMetrics,
  hunterAttacks,
  type HunterAttack,
  type HunterMetrics,
} from "@/lib/typing-hunter";

type BattlePhase =
  | "ready"
  | "monster-roar"
  | "player-turn"
  | "impact"
  | "monster-charge"
  | "monster-attack"
  | "victory"
  | "defeat";

const MONSTER_HP = 150;
const PLAYER_HP = 120;

const phaseCopy: Record<BattlePhase, string> = {
  ready: "THE HUNT IS READY",
  "monster-roar": "CINDERMAW ROARS",
  "player-turn": "YOUR MOVE · TYPE THE SEQUENCE",
  impact: "STRIKE LANDED",
  "monster-charge": "CINDERMAW IS CHARGING",
  "monster-attack": "INCOMING ATTACK",
  victory: "MONSTER DEFEATED",
  defeat: "HUNT ENDED",
};

function Monster({ phase }: { phase: BattlePhase }) {
  const pose =
    phase === "monster-roar"
      ? "roar"
      : phase === "impact"
        ? "hurt"
        : phase === "monster-charge"
          ? "charge"
          : phase === "monster-attack"
            ? "strike"
            : phase === "victory"
              ? "down"
              : "idle";

  return (
    <svg
      className={`hunter-monster hunter-monster-${pose}`}
      viewBox="0 0 320 280"
      role="img"
      aria-label={`Cindermaw ${pose === "roar" ? "roars and breathes fire" : pose === "hurt" ? "recoils from the hit" : pose === "strike" ? "attacks" : pose === "down" ? "is defeated" : pose === "charge" ? "is charging" : "waits in the arena"}`}
    >
      <defs>
        <linearGradient id="maw-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--hunter-monster-light)" />
          <stop offset="1" stopColor="var(--hunter-monster-dark)" />
        </linearGradient>
        <linearGradient id="maw-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hunter-belly-light)" />
          <stop offset="1" stopColor="var(--hunter-belly-dark)" />
        </linearGradient>
      </defs>
      <ellipse className="monster-shadow" cx="160" cy="255" rx="105" ry="14" />
      <path
        className="monster-horn"
        d="M104 88 72 18l61 42M218 88l31-70-61 42"
      />
      <path
        className="monster-tail"
        d="M235 184c44 4 56 27 60 51-22-12-39-8-59 3"
      />
      <path
        className="monster-body"
        fill="url(#maw-body)"
        d="M87 118c3-34 32-54 71-54s68 20 74 54l24 69-39 43H101l-39-43z"
      />
      <path
        className="monster-belly"
        fill="url(#maw-belly)"
        d="M112 146c12-18 29-25 48-25s37 7 49 25l-12 55h-73z"
      />
      <path
        className="monster-arm"
        d="M92 140 52 164l-16 41 39-8 30-33M228 140l40 24 16 41-39-8-30-33"
      />
      <path
        className="monster-claw"
        d="m43 192-18 14 11-1 2 14 13-17m223-10 18 14-11-1-2 14-13-17"
      />
      <path
        className="monster-leg"
        d="m111 211-17 30 34 4 19-34m63 0 17 30-34 4-19-34"
      />
      <path
        className="monster-face"
        d="M104 95c13-17 31-25 55-25s42 8 56 25l-8 35c-15 13-30 19-48 19s-33-6-48-19z"
      />
      <path className="monster-brow" d="m121 105 27 8m51-8-27 8" />
      <path className="monster-eye" d="M123 119h25m23 0h25" />
      <path className="monster-glow" d="m154 130 6 5 6-5" />
      {pose === "roar" && (
        <path
          className="monster-fire"
          d="M151 141c-13 10-9 21-2 25-3-10 5-12 6-21 5 6 9 11 5 19 13-8 11-19-2-29l-3-11z"
        />
      )}
      <path className="monster-teeth" d="m135 145 8 8 7-8 10 9 10-9 7 8 8-8" />
      <path className="monster-marking" d="m145 169 8 8 8-8 8 8 8-8" />
    </svg>
  );
}

function HealthBar({
  label,
  value,
  maximum,
  type,
}: {
  label: string;
  value: number;
  maximum: number;
  type: "player" | "monster";
}) {
  const percentage = Math.max(0, Math.min(100, (value / maximum) * 100));
  return (
    <div className={`hunter-health hunter-health-${type}`}>
      <div className="hunter-health-label">
        <span>{label}</span>
        <strong>
          {value} / {maximum}
        </strong>
      </div>
      <div
        className="hunter-health-track"
        role="progressbar"
        aria-label={`${label} health`}
        aria-valuemin={0}
        aria-valuemax={maximum}
        aria-valuenow={value}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function SequenceText({
  sequence,
  typed,
}: {
  sequence: string;
  typed: string;
}) {
  return (
    <span className="hunter-sequence" aria-label={`Sequence: ${sequence}`}>
      {Array.from(sequence).map((character, index) => (
        <span
          key={`${index}-${character}`}
          className={
            index < typed.length
              ? "hunter-character hunter-character-typed"
              : index === typed.length
                ? "hunter-character hunter-character-next"
                : "hunter-character"
          }
        >
          {character === " " ? "␠" : character}
        </span>
      ))}
    </span>
  );
}

export default function TypingHunter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const playerHpRef = useRef(PLAYER_HP);
  const monsterHpRef = useRef(MONSTER_HP);
  const attemptStartedAt = useRef<number | null>(null);
  const correctPressesRef = useRef(0);
  const errorsRef = useRef(0);
  const [phase, setPhase] = useState<BattlePhase>("ready");
  const [playerHp, setPlayerHp] = useState(PLAYER_HP);
  const [monsterHp, setMonsterHp] = useState(MONSTER_HP);
  const [selectedAttackId, setSelectedAttackId] = useState(hunterAttacks[0].id);
  const [typed, setTyped] = useState("");
  const [errors, setErrors] = useState(0);
  const [correctPresses, setCorrectPresses] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [completedAttacks, setCompletedAttacks] = useState(0);
  const [pendingDamage, setPendingDamage] = useState(0);
  const [pendingHits, setPendingHits] = useState(1);
  const [pendingCounter, setPendingCounter] = useState(18);
  const [lastHit, setLastHit] = useState(0);
  const [lastMetrics, setLastMetrics] = useState<HunterMetrics>({
    wpm: 0,
    accuracy: 100,
  });
  const [message, setMessage] = useState(
    "Choose an attack, then start the hunt.",
  );
  const [mistakeFlash, setMistakeFlash] = useState(false);
  const attack = hunterAttacks.find((item) => item.id === selectedAttackId)!;
  const available = availableHunterAttacks(completedAttacks);
  const liveMetrics = calculateHunterMetrics(correctPresses, errors, elapsed);
  const attackProgress = Math.round(
    (typed.length / attack.sequence.length) * 100,
  );
  const active = phase === "player-turn";

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const resetAttempt = useCallback(() => {
    attemptStartedAt.current = null;
    correctPressesRef.current = 0;
    errorsRef.current = 0;
    setTyped("");
    setErrors(0);
    setCorrectPresses(0);
    setElapsed(0);
  }, []);

  const startBattle = useCallback(() => {
    playerHpRef.current = PLAYER_HP;
    monsterHpRef.current = MONSTER_HP;
    setPlayerHp(PLAYER_HP);
    setMonsterHp(MONSTER_HP);
    setSelectedAttackId(hunterAttacks[0].id);
    setCompletedAttacks(0);
    setPendingDamage(0);
    setPendingHits(1);
    setPendingCounter(18);
    setLastHit(0);
    setLastMetrics({ wpm: 0, accuracy: 100 });
    setMessage("Cindermaw roars. Find the opening and strike.");
    resetAttempt();
    setPhase("monster-roar");
  }, [resetAttempt]);

  useEffect(() => {
    if (!active || attemptStartedAt.current === null) return;
    const timer = window.setInterval(() => {
      setElapsed(
        Math.max(
          0,
          performance.now() - (attemptStartedAt.current ?? performance.now()),
        ),
      );
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, selectedAttackId]);

  useEffect(() => {
    if (phase === "monster-roar") {
      const timer = window.setTimeout(() => {
        setPhase("player-turn");
        focusInput();
      }, 850);
      return () => window.clearTimeout(timer);
    }
    if (phase === "impact") {
      const timer = window.setTimeout(() => {
        const nextHp = Math.max(0, monsterHpRef.current - pendingDamage);
        monsterHpRef.current = nextHp;
        setMonsterHp(nextHp);
        setLastHit(pendingDamage);
        if (nextHp === 0) {
          setMessage("Cindermaw falls. The arena is yours.");
          setPhase("victory");
        } else {
          setMessage("Cindermaw recoils, then gathers heat in its jaws.");
          setPhase("monster-charge");
        }
      }, 650);
      return () => window.clearTimeout(timer);
    }
    if (phase === "monster-charge") {
      const timer = window.setTimeout(() => setPhase("monster-attack"), 700);
      return () => window.clearTimeout(timer);
    }
    if (phase === "monster-attack") {
      const timer = window.setTimeout(() => {
        const nextHp = Math.max(0, playerHpRef.current - pendingCounter);
        playerHpRef.current = nextHp;
        setPlayerHp(nextHp);
        if (nextHp === 0) {
          setMessage(
            "Cindermaw overwhelms you. Sharpen your rhythm and try again.",
          );
          setPhase("defeat");
        } else {
          setMessage("You recover your footing. Type the next sequence.");
          resetAttempt();
          setPhase("player-turn");
          focusInput();
        }
      }, 600);
      return () => window.clearTimeout(timer);
    }
  }, [phase, pendingDamage, pendingCounter, focusInput, resetAttempt]);

  function chooseAttack(next: HunterAttack) {
    if (!available.some((item) => item.id === next.id) || !active) return;
    setSelectedAttackId(next.id);
    resetAttempt();
    focusInput();
  }

  function finishAttack(nextTyped: string, timestamp: number) {
    const elapsedMs = Math.max(
      1,
      timestamp - (attemptStartedAt.current ?? timestamp),
    );
    const metrics = calculateHunterMetrics(
      correctPressesRef.current,
      errorsRef.current,
      elapsedMs,
    );
    const damage = calculateHunterDamage(attack.damage, metrics);
    const incoming = calculateCounterDamage(metrics);
    setLastMetrics(metrics);
    setPendingDamage(damage);
    setPendingHits(attack.hits);
    setPendingCounter(incoming);
    setCompletedAttacks((count) => count + 1);
    setTyped(nextTyped);
    setMessage(
      `${attack.name} · ${attack.hits} hit${attack.hits === 1 ? "" : "s"} · ${metrics.wpm.toFixed(1)} WPM · ${metrics.accuracy.toFixed(1)}% accuracy`,
    );
    setPhase("impact");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (
      !active ||
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      setTyped((current) => current.slice(0, -1));
      return;
    }
    if (event.key.length !== 1) return;
    event.preventDefault();
    if (attemptStartedAt.current === null) {
      attemptStartedAt.current = event.timeStamp;
      setElapsed(0);
    }
    const expected = attack.sequence[typed.length];
    const actual = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (actual !== expected) {
      errorsRef.current += 1;
      setErrors(errorsRef.current);
      setMessage(
        `Wrong key · ${expected === ";" ? "semicolon" : expected.toUpperCase()} is next`,
      );
      setMistakeFlash(true);
      window.setTimeout(() => setMistakeFlash(false), 140);
      return;
    }
    correctPressesRef.current += 1;
    setCorrectPresses(correctPressesRef.current);
    const nextTyped = `${typed}${actual}`;
    setTyped(nextTyped);
    if (nextTyped.length === attack.sequence.length)
      finishAttack(nextTyped, event.timeStamp);
  }

  const completedMessage =
    phase === "victory"
      ? "CINDERMAW DEFEATED"
      : phase === "defeat"
        ? "THE HUNT CONTINUES"
        : null;

  return (
    <section
      className="typing-hunter"
      aria-label="Typing Hunter monster battle"
    >
      <div className="hunter-statusbar">
        <span className="hunter-status-indicator">
          <i />
          {phaseCopy[phase]}
        </span>
        <span className="hunter-round-label">
          ENCOUNTER 01 <b>·</b> ASHFALL RIDGE
        </span>
      </div>

      <div className="hunter-battle-grid">
        <section className="hunter-arena panel" aria-label="Battle arena">
          <div className="hunter-arena-topline">
            <div>
              <div className="eyebrow">
                <span className="square" /> WILD MONSTER / FIRST ENCOUNTER
              </div>
              <h2>
                Cindermaw <span>LV. 06</span>
              </h2>
            </div>
            <div
              className={`hunter-monster-state hunter-monster-state-${phase}`}
            >
              {phase === "monster-charge" ||
              phase === "monster-attack" ||
              phase === "monster-roar" ? (
                <Flame size={14} />
              ) : (
                <Activity size={14} />
              )}
              {phase === "monster-roar"
                ? "ROARING"
                : phase === "monster-charge" || phase === "monster-attack"
                  ? "HEAT RISING"
                  : phase === "victory"
                    ? "DEFEATED"
                    : phase === "defeat"
                      ? "HUNT OVER"
                      : "HOSTILE"}
            </div>
          </div>

          <HealthBar
            label="CINDERMAW"
            value={monsterHp}
            maximum={MONSTER_HP}
            type="monster"
          />

          <div className={`hunter-monster-stage hunter-stage-${phase}`}>
            <div className="hunter-stage-grid" />
            <div className="hunter-stage-glow" />
            <div className="hunter-rune hunter-rune-one">ᚠ</div>
            <div className="hunter-rune hunter-rune-two">ᚱ</div>
            <Monster phase={phase} />
            {phase === "impact" && (
              <>
                <span className="hunter-hit-number">−{pendingDamage}</span>
                {pendingHits > 1 && (
                  <span className="hunter-multi-hit-label">
                    {pendingHits} HIT COMBO
                  </span>
                )}
                <span className="hunter-slash-effects" aria-hidden="true">
                  {Array.from(
                    { length: Math.min(pendingHits, 12) },
                    (_, index) => (
                      <i key={`${pendingHits}-${index}`} />
                    ),
                  )}
                </span>
              </>
            )}
            {phase === "monster-attack" && (
              <span className="hunter-hit-number hunter-incoming">
                −{pendingCounter}
              </span>
            )}
            {completedMessage && (
              <div className={`hunter-end-stamp hunter-end-${phase}`}>
                {completedMessage}
              </div>
            )}
          </div>

          <div className="hunter-monster-caption">
            <span>
              <span className="hunter-legend-dot" /> CINDERMAW · EMBER BEAST
            </span>
            <span>ITS NEXT MOVE FOLLOWS YOUR STRIKE</span>
          </div>
        </section>

        <aside className="hunter-side-column">
          <section
            className="panel hunter-player-panel"
            aria-label="Hunter status"
          >
            <div className="hunter-panel-heading">
              <span>
                <Shield size={15} /> HUNTER STATUS
              </span>
              <span>RANK 01</span>
            </div>
            <HealthBar
              label="VITALITY"
              value={playerHp}
              maximum={PLAYER_HP}
              type="player"
            />
            <div className="hunter-field-stats">
              <div>
                <span>ATTACK SPEED</span>
                <strong>
                  {liveMetrics.wpm.toFixed(1)} <small>WPM</small>
                </strong>
              </div>
              <div>
                <span>SEQUENCE ACC.</span>
                <strong>
                  {liveMetrics.accuracy.toFixed(1)}
                  <small>%</small>
                </strong>
              </div>
              <div>
                <span>ERRORS</span>
                <strong>{errors.toString().padStart(2, "0")}</strong>
              </div>
              <div>
                <span>COMBOS</span>
                <strong>{completedAttacks.toString().padStart(2, "0")}</strong>
              </div>
            </div>
          </section>

          <section
            className="panel hunter-attacks-panel"
            aria-label="Combat techniques"
          >
            <div className="hunter-panel-heading">
              <span>
                <Swords size={15} /> COMBAT TECHNIQUES
              </span>
              <span>
                {available.length} / {hunterAttacks.length} OPEN
              </span>
            </div>
            <div className="hunter-attack-list">
              {hunterAttacks.map((item) => {
                const unlocked = available.some(
                  (entry) => entry.id === item.id,
                );
                return (
                  <button
                    key={item.id}
                    className={`hunter-attack-card${selectedAttackId === item.id ? " selected" : ""}${unlocked ? "" : " locked"}`}
                    type="button"
                    disabled={!unlocked || !active}
                    aria-pressed={selectedAttackId === item.id}
                    onClick={() => chooseAttack(item)}
                  >
                    <span className="hunter-attack-icon">
                      {item.style === "quick" ? (
                        <Zap size={15} />
                      ) : item.style === "combo" ? (
                        <Swords size={15} />
                      ) : (
                        <Flame size={15} />
                      )}
                    </span>
                    <span className="hunter-attack-copy">
                      <strong>{item.name}</strong>
                      <small>
                        {item.hits} HIT{item.hits === 1 ? "" : "S"} <b>·</b>{" "}
                        BASE DMG {item.damage}
                      </small>
                    </span>
                    <span className="hunter-attack-unlock">
                      {unlocked
                        ? selectedAttackId === item.id
                          ? "ACTIVE"
                          : "READY"
                        : `UNLOCK · ${item.unlockAfter} COMBOS`}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="hunter-unlock-note">
              Land attacks to unlock heavier techniques. Speed raises damage;
              clean typing weakens the counterattack.
            </p>
          </section>
        </aside>
      </div>

      <section
        className={`panel hunter-command-panel${mistakeFlash ? " hunter-command-error" : ""}`}
        aria-label="Typing combat command"
      >
        <div className="hunter-command-heading">
          <div>
            <span className="eyebrow">
              <span className="square" /> ACTIVE COMMAND
            </span>
            <h3>{attack.name}</h3>
          </div>
          <div className="hunter-command-meta">
            <span>{attack.hits} HIT SEQUENCE</span>
            <span>{(elapsed / 1000).toFixed(1)}s</span>
          </div>
        </div>
        <div className="hunter-sequence-wrap">
          <div className="hunter-sequence-target">
            <SequenceText sequence={attack.sequence} typed={typed} />
          </div>
          <span className="hunter-sequence-count">
            {typed.length.toString().padStart(2, "0")} /{" "}
            {attack.sequence.length.toString().padStart(2, "0")}
          </span>
        </div>
        <div
          className="hunter-sequence-progress"
          role="progressbar"
          aria-label="Attack sequence progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={attackProgress}
        >
          <span style={{ width: `${attackProgress}%` }} />
        </div>
        <div className="hunter-input-row">
          <div className="hunter-input-frame">
            <input
              ref={inputRef}
              value={typed}
              onChange={() => undefined}
              onKeyDown={onKeyDown}
              onPaste={(event) => event.preventDefault()}
              disabled={!active}
              aria-label={`Type ${attack.name} sequence`}
              placeholder={
                phase === "ready"
                  ? "Start the hunt to engage"
                  : phase === "player-turn"
                    ? "Type the highlighted sequence"
                    : "Waiting for the monster's move…"
              }
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
            />
            <span className="hunter-input-kbd">⌨</span>
          </div>
          {phase === "ready" ? (
            <button
              className="hunter-primary-action"
              type="button"
              onClick={startBattle}
            >
              <Swords size={16} /> Start Hunt
            </button>
          ) : phase === "victory" || phase === "defeat" ? (
            <button
              className="hunter-primary-action"
              type="button"
              onClick={startBattle}
            >
              <RotateCcw size={15} /> Hunt Again
            </button>
          ) : !active ? (
            <button
              className="hunter-primary-action hunter-wait-action"
              type="button"
              disabled
            >
              <Activity size={15} /> Monster turn
            </button>
          ) : (
            <button
              className="hunter-secondary-action"
              type="button"
              onClick={startBattle}
            >
              <RotateCcw size={14} /> Restart
            </button>
          )}
        </div>
        <div className="hunter-command-footer">
          <span className="hunter-combat-message" aria-live="polite">
            {message}
          </span>
          <span>
            <Heart size={12} />{" "}
            {lastHit > 0 ? `LAST STRIKE ${lastHit} DMG` : "NO DAMAGE YET"}{" "}
            <b>·</b> BACKSPACE RETREATS ONE KEY
          </span>
        </div>
      </section>

      {lastMetrics.wpm > 0 && phase !== "player-turn" && (
        <p className="hunter-performance-note">
          Last sequence: {lastMetrics.wpm.toFixed(1)} WPM ·{" "}
          {lastMetrics.accuracy.toFixed(1)}% accuracy. Your performance changed
          strike strength and the monster’s retaliation.
        </p>
      )}
    </section>
  );
}
