import { validReference, type AmplifyReference } from "./amplify";
import type { Status } from "./metrics";
export type Mode =
  | "drill"
  | "copy"
  | "writing"
  | "keyboard"
  | "words"
  | "sentences"
  | "speed"
  | "free";
export type Session = {
  id: string;
  date: string;
  mode: Mode;
  title: string;
  elapsed: number;
  wpm?: number;
  accuracy?: number;
  errors?: number;
  mistakes?: number;
  words?: number;
  mistypedKeys?: Record<string, number>;
  status: Status;
};
export type Draft = {
  reference?: AmplifyReference;
  text: string;
  elapsed: number;
  status: Status;
  updated: string;
};
export const KEYS = {
  history: "keyflow.history.v1",
  drafts: "keyflow.drafts.v1",
  preferences: "keyflow.preferences.v1",
  basicTraining: "keyflow.basic-training.v1",
  basicTrainingSound: "keyflow.basic-training-sound.v1",
  basicTrainingAchievementSound: "keyflow.basic-training-achievement-sound.v1",
  basicTrainingLessons: "keyflow.basic-training-lessons.v1",
  basicTrainingAchievements: "keyflow.basic-training-achievements.v1",
};
let staffStorageNamespace: string | null = null;
export function setStaffStorageNamespace(userId: string) {
  if (!userId || staffStorageNamespace === userId) return;
  const prefix = "keyflow.";
  const legacyKeys = Object.values(KEYS);
  try {
    for (const key of legacyKeys) {
      const scoped = `${prefix}${userId}.${key.slice(prefix.length)}`;
      if (!localStorage.getItem(scoped)) {
        const legacy = localStorage.getItem(key);
        if (legacy !== null) localStorage.setItem(scoped, legacy);
      }
    }
    legacyKeys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Authentication must remain usable when browser storage is disabled.
  } finally {
    staffStorageNamespace = userId;
  }
}
function namespacedKey(key: string) {
  if (!staffStorageNamespace || !key.startsWith("keyflow.")) return key;
  return `keyflow.${staffStorageNamespace}.${key.slice("keyflow.".length)}`;
}
export function read<T>(
  key: string,
  fallback: T,
  validate: (x: unknown) => boolean,
): T {
  try {
    const raw = localStorage.getItem(namespacedKey(key));
    if (!raw) return fallback;
    const data: unknown = JSON.parse(raw);
    return validate(data) ? (data as T) : fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(namespacedKey(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function validHistory(x: unknown): boolean {
  return (
    Array.isArray(x) &&
    x.every(
      (v) =>
        v &&
        typeof v.id === "string" &&
        typeof v.date === "string" &&
        [
          "drill",
          "copy",
          "writing",
          "keyboard",
          "words",
          "sentences",
          "speed",
          "free",
        ].includes(v.mode) &&
        typeof v.title === "string" &&
        Number.isFinite(v.elapsed) &&
        v.elapsed >= 0 &&
        ["completed", "timed-out"].includes(v.status) &&
        ["wpm", "accuracy", "errors", "mistakes", "words"].every(
          (k) => v[k] === undefined || (Number.isFinite(v[k]) && v[k] >= 0),
        ) &&
        (v.mistypedKeys === undefined ||
          (typeof v.mistypedKeys === "object" &&
            v.mistypedKeys !== null &&
            Object.values(v.mistypedKeys).every(
              (count) =>
                typeof count === "number" &&
                Number.isSafeInteger(count) &&
                count >= 0,
            ))),
    )
  );
}
export function validDrafts(x: unknown): boolean {
  return (
    typeof x === "object" &&
    x !== null &&
    !Array.isArray(x) &&
    Object.values(x).every(
      (v) =>
        v &&
        typeof v.text === "string" &&
        Number.isFinite(v.elapsed) &&
        v.elapsed >= 0 &&
        ["ready", "active", "paused", "completed", "timed-out"].includes(
          v.status,
        ) &&
        typeof v.updated === "string" &&
        (v.reference === undefined || validReference(v.reference)),
    )
  );
}
export function appendSession(history: Session[], session: Session) {
  return [session, ...history.filter((x) => x.id !== session.id)].slice(0, 200);
}
