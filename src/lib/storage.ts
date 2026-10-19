import type { Status } from "./metrics";
export type Mode = "drill" | "copy" | "writing";
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
  status: Status;
};
export type Draft = {
  text: string;
  elapsed: number;
  status: Status;
  updated: string;
};
export const KEYS = {
  history: "keyflow.history.v1",
  drafts: "keyflow.drafts.v1",
  preferences: "keyflow.preferences.v1",
};
export function read<T>(
  key: string,
  fallback: T,
  validate: (x: unknown) => boolean,
): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const data: unknown = JSON.parse(raw);
    return validate(data) ? (data as T) : fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
        ["drill", "copy", "writing"].includes(v.mode) &&
        typeof v.title === "string" &&
        Number.isFinite(v.elapsed) &&
        v.elapsed >= 0 &&
        ["completed", "timed-out"].includes(v.status) &&
        ["wpm", "accuracy", "errors", "mistakes", "words"].every(
          (k) => v[k] === undefined || (Number.isFinite(v[k]) && v[k] >= 0),
        ),
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
        typeof v.updated === "string",
    )
  );
}
export function appendSession(history: Session[], session: Session) {
  return [session, ...history.filter((x) => x.id !== session.id)].slice(0, 200);
}
