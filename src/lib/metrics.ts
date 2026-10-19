export type Status = "ready" | "active" | "paused" | "completed" | "timed-out";
export type Clock = { elapsed: number; started: number | null };
export function elapsedMs(clock: Clock, now: number, limit = Infinity) {
  return Math.min(
    limit,
    Math.max(
      0,
      clock.elapsed +
        (clock.started === null ? 0 : Math.max(0, now - clock.started)),
    ),
  );
}
export function score(target: string, input: string, ms: number) {
  const chars = Array.from(input),
    reference = Array.from(target);
  const correct = chars.reduce(
    (sum, char, i) => sum + (char === reference[i] ? 1 : 0),
    0,
  );
  const errors = chars.length - correct;
  return {
    correct,
    errors,
    accuracy: chars.length ? (correct / chars.length) * 100 : 100,
    wpm: ms > 0 ? correct / 5 / (ms / 60000) : 0,
    complete: input === target,
  };
}
// Count newly inserted/replaced incorrect characters. Deletions do not add mistakes.
export function addedMistakes(previous: string, next: string, target: string) {
  let start = 0;
  while (
    start < previous.length &&
    start < next.length &&
    previous[start] === next[start]
  )
    start++;
  let a = previous.length,
    b = next.length;
  while (a > start && b > start && previous[a - 1] === next[b - 1]) {
    a--;
    b--;
  }
  let count = 0;
  for (let i = start; i < b; i++) if (next[i] !== target[i]) count++;
  return count;
}
export function wordCount(text: string) {
  return (text.trim().match(/\S+/g) || []).length;
}
export function timeLabel(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
