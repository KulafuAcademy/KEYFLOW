"use client";

import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  Flame,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import {
  calculateDashboardStats,
  type DailyPerformance,
} from "@/lib/dashboard-stats";
import { timeLabel } from "@/lib/metrics";
import type { Mode, Session } from "@/lib/storage";

type Props = {
  history: Session[];
  goalWpm: number;
  onGoalChange: (value: number) => void;
  onNavigate: (view: "basic" | "writing" | Mode) => void;
  onResetHistory: () => void;
};

const modeLabels: Record<Mode, string> = {
  drill: "Typing drill",
  copy: "Copy practice",
  writing: "IELTS Writing",
  keyboard: "Keyboard training",
  words: "Word training",
  sentences: "Sentence training",
  speed: "Speed training",
  free: "Free typing",
};

export default function LearningDashboard({
  history,
  goalWpm,
  onGoalChange,
  onNavigate,
  onResetHistory,
}: Props) {
  const stats = calculateDashboardStats(history, goalWpm);
  const hasPractice = stats.totalSessions > 0;
  const metrics = [
    {
      label: "CURRENT STREAK",
      value: String(stats.currentStreak),
      unit: dayUnit(stats.currentStreak),
      icon: <Flame size={15} />,
    },
    {
      label: "LONGEST STREAK",
      value: String(stats.longestStreak),
      unit: dayUnit(stats.longestStreak),
      icon: <CalendarDays size={15} />,
    },
    {
      label: "PERSONAL BEST",
      value: stats.personalBest === null ? "—" : stats.personalBest.toFixed(1),
      unit: stats.personalBest === null ? "" : "WPM",
      icon: <Trophy size={15} />,
    },
    {
      label: "AVERAGE SPEED",
      value: stats.averageWpm === null ? "—" : stats.averageWpm.toFixed(1),
      unit: stats.averageWpm === null ? "" : "WPM",
      icon: <Zap size={15} />,
    },
    {
      label: "AVERAGE ACCURACY",
      value:
        stats.averageAccuracy === null ? "—" : stats.averageAccuracy.toFixed(1),
      unit: stats.averageAccuracy === null ? "" : "%",
      icon: <Target size={15} />,
    },
    {
      label: "TOTAL PRACTICE",
      value: formatDuration(stats.totalPracticeMs),
      unit: "",
      icon: <Clock3 size={15} />,
    },
  ];
  const normalizedGoal = stats.goalWpm;

  return (
    <div className="learning-dashboard">
      <div className="dashboard-welcome">
        <div className="dashboard-shortcuts" aria-label="Start practicing">
          <button className="primary" onClick={() => onNavigate("basic")}>
            Basic Training <ArrowRight size={15} />
          </button>
          <button className="secondary" onClick={() => onNavigate("writing")}>
            IELTS Writing
          </button>
        </div>
      </div>

      {!hasPractice && (
        <section
          className="panel dashboard-empty"
          aria-labelledby="dashboard-empty-title"
        >
          <div className="dashboard-empty-mark">
            <Activity size={19} />
          </div>
          <div>
            <h3 id="dashboard-empty-title">
              Your progress starts with a practice session.
            </h3>
            <p>
              Completed Basic Training, typing drills, and IELTS writing
              sessions will appear here. Everything stays in this browser.
            </p>
          </div>
          <button className="primary" onClick={() => onNavigate("basic")}>
            Start Basic Training <ArrowRight size={15} />
          </button>
        </section>
      )}

      <section
        className="dashboard-metrics"
        aria-label="Typing progress statistics"
      >
        {metrics.map((metric) => (
          <div className="metric dashboard-metric" key={metric.label}>
            <div className="metric-label">
              {metric.icon}
              {metric.label}
            </div>
            <div className="metric-value">
              {metric.value}
              <span>{metric.unit}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="panel goal-panel" aria-labelledby="goal-title">
        <div className="goal-heading">
          <div>
            <div className="metric-label">
              <Target size={14} /> SPEED TARGET
            </div>
            <h3 id="goal-title">Build toward your WPM goal</h3>
            <p>
              {stats.averageWpm === null
                ? "Complete a typing session to see your progress."
                : `${stats.averageWpm.toFixed(1)} average WPM toward ${normalizedGoal} WPM`}
            </p>
          </div>
          <label className="goal-select">
            TARGET
            <select
              value={normalizedGoal}
              onChange={(event) => onGoalChange(Number(event.target.value))}
              aria-label="WPM target"
            >
              {[20, 30, 40, 50, 60, 80, 100, 120, 150, 200].map((value) => (
                <option key={value} value={value}>
                  {value} WPM
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="goal-track"
          role="meter"
          aria-label="Average WPM target progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(stats.goalProgress)}
        >
          <span style={{ width: `${stats.goalProgress}%` }} />
        </div>
        <div className="goal-foot">
          <span>
            {stats.averageWpm === null
              ? "0"
              : Math.min(stats.averageWpm, normalizedGoal).toFixed(1)}{" "}
            WPM
          </span>
          <span>
            {normalizedGoal} WPM TARGET · {Math.round(stats.goalProgress)}%
          </span>
        </div>
      </section>

      <div className="dashboard-lower-grid">
        <section className="panel weekly-panel" aria-labelledby="weekly-title">
          <div className="panel-title">
            <h2 id="weekly-title">Weekly progress</h2>
            <span className="mono">LAST 7 LOCAL DAYS</span>
          </div>
          {hasWeeklyTyping(stats.week) ? (
            <>
              <WeeklyChart
                label="Average WPM"
                unit="WPM"
                values={stats.week.map((day) => day.wpm)}
                maximum={Math.max(
                  normalizedGoal,
                  ...stats.week.map((day) => day.wpm ?? 0),
                )}
                days={stats.week}
              />
              <WeeklyChart
                label="Average accuracy"
                unit="%"
                values={stats.week.map((day) => day.accuracy)}
                maximum={100}
                days={stats.week}
              />
            </>
          ) : (
            <div className="dashboard-chart-empty">
              <Activity size={21} />
              <p>
                Weekly typing performance will appear after your first completed
                typing session.
              </p>
            </div>
          )}
        </section>

        <section className="panel recent-panel" aria-labelledby="recent-title">
          <div className="panel-title">
            <h2 id="recent-title">
              Recent activity{" "}
              <span className="count">{stats.totalSessions}</span>
            </h2>
            <button
              className="text-button"
              disabled={!stats.totalSessions}
              onClick={onResetHistory}
            >
              Reset history
            </button>
          </div>
          {stats.recentSessions.length ? (
            <ol className="recent-list">
              {stats.recentSessions.map((session) => (
                <li key={session.id}>
                  <span className="recent-indicator" aria-hidden="true" />
                  <div className="recent-detail">
                    <strong>{session.title || modeLabels[session.mode]}</strong>
                    <span>
                      {modeLabels[session.mode]} ·{" "}
                      {new Date(session.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="recent-result">
                    <strong>
                      {session.mode === "writing"
                        ? `${session.words ?? 0} words`
                        : `${(session.wpm ?? 0).toFixed(1)} WPM`}
                    </strong>
                    <span>
                      {session.mode === "writing"
                        ? timeLabel(session.elapsed)
                        : `${(session.accuracy ?? 0).toFixed(1)}% accuracy`}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="recent-empty">
              <p>No completed sessions yet.</p>
              <button
                className="text-button"
                onClick={() => onNavigate("basic")}
              >
                Start practicing <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
      </div>
      <p className="panel-footnote dashboard-footnote">
        WPM = correct characters ÷ 5 ÷ elapsed minutes. Averages use completed
        typing sessions with valid metrics; streaks use this device’s local
        calendar days. IELTS writing contributes to practice time and streaks,
        but has no reference-based WPM or accuracy score.
      </p>
    </div>
  );
}

function WeeklyChart({
  label,
  unit,
  values,
  maximum,
  days,
}: {
  label: string;
  unit: string;
  values: Array<number | null>;
  maximum: number;
  days: DailyPerformance[];
}) {
  const hasValues = values.some((value) => value !== null);
  return (
    <div
      className="weekly-series"
      role="img"
      aria-label={`${label}, ${days.map((day) => `${day.label}: ${day[unit === "WPM" ? "wpm" : "accuracy"] === null ? "no session" : `${day[unit === "WPM" ? "wpm" : "accuracy"]!.toFixed(1)} ${unit}`}`).join(", ")}`}
    >
      <div className="weekly-series-title">
        <strong>{label}</strong>
        <span>
          {hasValues
            ? `${Math.max(...values.filter((value): value is number => value !== null)).toFixed(1)} ${unit} peak`
            : `No ${unit} data this week`}
        </span>
      </div>
      <div className="weekly-days">
        {days.map((day, index) => {
          const value = values[index];
          return (
            <div
              className="weekly-day"
              key={day.date}
              title={`${day.label}: ${value === null ? "No practice" : `${value.toFixed(1)} ${unit}`}`}
            >
              <div className="weekly-bar-track">
                <span
                  className={value === null ? "empty" : ""}
                  style={{
                    height:
                      value === null
                        ? "0%"
                        : `${Math.max(4, Math.min(100, (value / (maximum || 1)) * 100))}%`,
                  }}
                />
              </div>
              <span className="weekly-day-label">{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hasWeeklyTyping(days: DailyPerformance[]) {
  return days.some((day) => day.wpm !== null || day.accuracy !== null);
}

function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60_000);
  if (!totalMinutes) return ms > 0 ? `${Math.floor(ms / 1000)}s` : "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function dayUnit(days: number) {
  return days === 1 ? "DAY" : "DAYS";
}
