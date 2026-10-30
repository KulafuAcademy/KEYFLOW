export type KeyboardAchievementStatus = "completed" | "clear" | "excellent";

export type KeyboardAchievement = {
  lessonId: string;
  status: KeyboardAchievementStatus;
};

export type KeyboardProgress = {
  cleared: number;
  excellent: number;
  total: number;
  percentage: number;
  nextUnclearedIndex: number | null;
};

const rank: Record<KeyboardAchievementStatus, number> = {
  completed: 1,
  clear: 2,
  excellent: 3,
};

export function validKeyboardAchievements(
  value: unknown,
): value is KeyboardAchievement[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        "lessonId" in item &&
        typeof item.lessonId === "string" &&
        item.lessonId.length > 0 &&
        "status" in item &&
        ["completed", "clear", "excellent"].includes(String(item.status)),
    ) &&
    new Set(value.map((item) => item.lessonId)).size === value.length
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
): KeyboardAchievementStatus {
  if (wpm >= 50 && accuracy >= 98) return "excellent";
  if (wpm >= 40 && accuracy >= 95) return "clear";
  return "completed";
}

export function mergeKeyboardAchievement(
  achievements: KeyboardAchievement[],
  lessonId: string,
  result: KeyboardAchievementStatus,
): KeyboardAchievement[] {
  const current = achievements.find(
    (achievement) => achievement.lessonId === lessonId,
  );
  if (current && rank[current.status] >= rank[result]) return achievements;
  if (!current) return [...achievements, { lessonId, status: result }];
  return achievements.map((achievement) =>
    achievement.lessonId === lessonId
      ? { ...achievement, status: result }
      : achievement,
  );
}

export function calculateKeyboardProgress(
  lessonIds: readonly string[],
  achievements: KeyboardAchievement[],
): KeyboardProgress {
  const statuses = new Map(
    achievements.map((achievement) => [
      achievement.lessonId,
      achievement.status,
    ]),
  );
  const clearedIndexes = lessonIds
    .map((id, index) => ({ index, status: statuses.get(id) }))
    .filter(({ status }) => status === "clear" || status === "excellent");
  const excellent = lessonIds.filter(
    (id) => statuses.get(id) === "excellent",
  ).length;
  const total = lessonIds.length;
  return {
    cleared: clearedIndexes.length,
    excellent,
    total,
    percentage: total ? (clearedIndexes.length / total) * 100 : 0,
    nextUnclearedIndex:
      clearedIndexes.length < total
        ? lessonIds.findIndex((id) => {
            const status = statuses.get(id);
            return status !== "clear" && status !== "excellent";
          })
        : null,
  };
}
