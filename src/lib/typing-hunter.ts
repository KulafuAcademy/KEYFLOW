export type HunterAttack = {
  id: string;
  name: string;
  sequence: string;
  hits: number;
  damage: number;
  unlockAfter: number;
  style: "quick" | "combo" | "finisher";
};

export const hunterAttacks: HunterAttack[] = [
  {
    id: "quick-cut",
    name: "Quick Cut",
    sequence: "asdf",
    hits: 1,
    damage: 24,
    unlockAfter: 0,
    style: "quick",
  },
  {
    id: "eight-hit",
    name: "Eight-hit Sword",
    sequence: "a;sldkfj",
    hits: 8,
    damage: 44,
    unlockAfter: 1,
    style: "combo",
  },
  {
    id: "fangbreaker",
    name: "Fangbreaker",
    sequence: "jkl;asdfjk",
    hits: 12,
    damage: 64,
    unlockAfter: 3,
    style: "finisher",
  },
];

export type HunterMetrics = {
  wpm: number;
  accuracy: number;
};

export function calculateHunterMetrics(
  correctlyTypedCharacters: number,
  cumulativeErrors: number,
  elapsedMs: number,
): HunterMetrics {
  const correct = Math.max(0, correctlyTypedCharacters);
  const errors = Math.max(0, cumulativeErrors);
  const elapsedMinutes = Math.max(0, elapsedMs) / 60_000;
  const total = correct + errors;

  return {
    wpm:
      elapsedMinutes > 0
        ? Number((correct / 5 / elapsedMinutes).toFixed(1))
        : 0,
    accuracy: total > 0 ? Number(((correct / total) * 100).toFixed(1)) : 100,
  };
}

export function calculateHunterDamage(
  baseDamage: number,
  metrics: HunterMetrics,
): number {
  const speedFactor =
    0.65 + (Math.min(Math.max(metrics.wpm, 0), 80) / 80) * 0.5;
  const accuracyFactor =
    0.6 + (Math.min(Math.max(metrics.accuracy, 0), 100) / 100) * 0.4;
  return Math.max(1, Math.round(baseDamage * speedFactor * accuracyFactor));
}

export function calculateCounterDamage(metrics: HunterMetrics): number {
  if (metrics.wpm >= 40 && metrics.accuracy >= 95) return 8;
  if (metrics.wpm >= 25 && metrics.accuracy >= 85) return 13;
  return 18;
}

export function calculateHunterStrikeDuration(hits: number): number {
  const strikeCount = Math.max(1, Math.floor(hits));
  return Math.min(1900, 650 + (strikeCount - 1) * 140);
}

export function availableHunterAttacks(
  completedAttacks: number,
): HunterAttack[] {
  return hunterAttacks.filter(
    (attack) => attack.unlockAfter <= completedAttacks,
  );
}
