export type KeyboardMedal = "bronze" | "silver" | "gold";
export type LegacyKeyboardAchievementStatus = "completed" | "clear" | "excellent";

/**
 * `status` remains readable for records written by earlier KEYFLOW versions.
 * Legacy clear/excellent both verified the current GOLD threshold; legacy
 * statuses do not contain enough information to infer PERFECT.
 */
export type KeyboardAchievement = {
  lessonId: string;
  medal?: KeyboardMedal;
  perfect?: boolean;
  attempted?: boolean;
  status?: LegacyKeyboardAchievementStatus;
};

export type KeyboardAttemptAchievement = {
  medal: KeyboardMedal | null;
  perfect: boolean;
};

export type KeyboardProgress = {
  /** Number of exercises with any medal (BRONZE or better). */
  bronze: number;
  /** Number of exercises with SILVER or GOLD. */
  silver: number;
  /** Number of exercises with GOLD. */
  gold: number;
  bronzeMedals: number;
  silverMedals: number;
  goldMedals: number;
  perfect: number;
  cleared: number;
  total: number;
  percentage: number;
  silverPercentage: number;
  goldPercentage: number;
  activeChallenge: KeyboardMedal | null;
  nextUnclearedIndex: number | null;
};

const medalRank: Record<KeyboardMedal, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const medals: KeyboardMedal[] = ["bronze", "silver", "gold"];
const legacyStatuses: LegacyKeyboardAchievementStatus[] = [
  "completed",
  "clear",
  "excellent",
];

export function validKeyboardAchievements(
  value: unknown,
): value is KeyboardAchievement[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (
        item === null ||
        typeof item !== "object" ||
        !("lessonId" in item) ||
        typeof item.lessonId !== "string" ||
        !item.lessonId
      )
        return false;
      const record = item as Record<string, unknown>;
      const legacyValid =
        record.status === undefined ||
        legacyStatuses.includes(record.status as LegacyKeyboardAchievementStatus);
      const medalValid =
        record.medal === undefined || medals.includes(record.medal as KeyboardMedal);
      const perfectValid =
        record.perfect === undefined || typeof record.perfect === "boolean";
      const attemptedValid =
        record.attempted === undefined || typeof record.attempted === "boolean";
      return (
        legacyValid &&
        medalValid &&
        perfectValid &&
        attemptedValid &&
        (record.status !== undefined ||
          record.medal !== undefined ||
          record.perfect !== undefined ||
          record.attempted !== undefined)
      );
    }) &&
    new Set(value.map((item) => item.lessonId)).size === value.length
  );
}

export function keyboardAchievementMedal(
  achievement: KeyboardAchievement | undefined,
): KeyboardMedal | null {
  if (!achievement) return null;
  if (achievement.medal) return achievement.medal;
  // Earlier clear required >=40 WPM and >=95%; excellent was stricter.
  // Both are sufficient evidence for the new GOLD threshold.
  if (achievement.status === "clear" || achievement.status === "excellent")
    return "gold";
  return null;
}

export function keyboardAchievementIsPerfect(
  achievement: KeyboardAchievement | undefined,
) {
  return achievement?.perfect === true;
}

export function keyboardAchievementWasAttempted(
  achievement: KeyboardAchievement | undefined,
) {
  return Boolean(
    achievement &&
      (achievement.attempted === true || achievement.status !== undefined),
  );
}

/** Accuracy for awards uses every printable key attempt; later corrections do not remove mistakes. */
export function cumulativeErrorAccuracy(
  printableKeystrokes: number,
  errors: number,
) {
  if (printableKeystrokes <= 0) return 100;
  return (
    (Math.max(0, printableKeystrokes - errors) / printableKeystrokes) * 100
  );
}

export function evaluateKeyboardAchievement(
  wpm: number,
  accuracy: number,
): KeyboardAttemptAchievement {
  let medal: KeyboardMedal | null = null;
  if (accuracy >= 85) {
    medal = "bronze";
    if (wpm >= 30 && accuracy >= 90) medal = "silver";
    if (wpm >= 40 && accuracy >= 95) medal = "gold";
  }
  return { medal, perfect: accuracy >= 100 };
}

export function shouldPlayAchievementSound(
  medal: KeyboardMedal | null,
  previousMedal: KeyboardMedal | null,
  exerciseComplete: boolean,
  soundEnabled: boolean,
  alreadyPlayed: boolean,
) {
  return Boolean(
    exerciseComplete &&
      soundEnabled &&
      !alreadyPlayed &&
      medal &&
      (!previousMedal || medalRank[medal] > medalRank[previousMedal]),
  );
}

export function mergeKeyboardAchievement(
  achievements: KeyboardAchievement[],
  lessonId: string,
  result: KeyboardAttemptAchievement,
): KeyboardAchievement[] {
  const current = achievements.find(
    (achievement) => achievement.lessonId === lessonId,
  );
  const currentMedal = keyboardAchievementMedal(current);
  const nextMedal = result.medal &&
    (!currentMedal || medalRank[result.medal] > medalRank[currentMedal])
    ? result.medal
    : currentMedal;
  const nextPerfect = keyboardAchievementIsPerfect(current) || result.perfect;
  if (
    current &&
    currentMedal === nextMedal &&
    keyboardAchievementIsPerfect(current) === nextPerfect &&
    keyboardAchievementWasAttempted(current)
  )
    return achievements;

  const updated: KeyboardAchievement = {
    lessonId,
    attempted: true,
    perfect: nextPerfect,
  };
  if (nextMedal) updated.medal = nextMedal;
  if (!current) return [...achievements, updated];
  return achievements.map((achievement) =>
    achievement.lessonId === lessonId ? updated : achievement,
  );
}

export function calculateKeyboardProgress(
  lessonIds: readonly string[],
  achievements: KeyboardAchievement[],
): KeyboardProgress {
  const uniqueLessonIds = [...new Set(lessonIds)];
  const achievementsByLesson = new Map(
    achievements.map((achievement) => [achievement.lessonId, achievement]),
  );
  const medaled = uniqueLessonIds.filter((id) =>
    keyboardAchievementMedal(achievementsByLesson.get(id)),
  );
  const bronzeMedals = uniqueLessonIds.filter(
    (id) => keyboardAchievementMedal(achievementsByLesson.get(id)) === "bronze",
  ).length;
  const silverMedals = uniqueLessonIds.filter(
    (id) => keyboardAchievementMedal(achievementsByLesson.get(id)) === "silver",
  ).length;
  const goldMedals = uniqueLessonIds.filter(
    (id) => keyboardAchievementMedal(achievementsByLesson.get(id)) === "gold",
  ).length;
  const silver = uniqueLessonIds.filter((id) => {
    const medal = keyboardAchievementMedal(achievementsByLesson.get(id));
    return medal === "silver" || medal === "gold";
  }).length;
  const gold = goldMedals;
  const bronze = medaled.length;
  const perfect = uniqueLessonIds.filter((id) =>
    keyboardAchievementIsPerfect(achievementsByLesson.get(id)),
  ).length;
  const total = uniqueLessonIds.length;
  const activeChallenge: KeyboardMedal | null =
    bronze < total
      ? "bronze"
      : silver < total
        ? "silver"
        : gold < total
          ? "gold"
          : null;
  const nextUnclearedIndex = lessonIds.findIndex(
    (id) => {
      const medal = keyboardAchievementMedal(achievementsByLesson.get(id));
      if (!activeChallenge) return false;
      return !medal || medalRank[medal] < medalRank[activeChallenge];
    },
  );
  return {
    bronze,
    silver,
    gold,
    bronzeMedals,
    silverMedals,
    goldMedals,
    perfect,
    cleared: medaled.length,
    total,
    percentage: total ? (medaled.length / total) * 100 : 0,
    silverPercentage: total ? (silver / total) * 100 : 0,
    goldPercentage: total ? (gold / total) * 100 : 0,
    activeChallenge,
    nextUnclearedIndex: nextUnclearedIndex >= 0 ? nextUnclearedIndex : null,
  };
}
