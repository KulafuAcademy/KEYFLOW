export type FingerId =
  | "left-pinky"
  | "left-ring"
  | "left-middle"
  | "left-index"
  | "left-thumb"
  | "right-thumb"
  | "right-index"
  | "right-middle"
  | "right-ring"
  | "right-pinky";

const shiftedKeys: Record<string, string> = {
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  _: "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
  "~": "`",
};

const fingerByKey: Record<string, FingerId> = {
  "`": "left-pinky",
  "1": "left-pinky",
  q: "left-pinky",
  a: "left-pinky",
  z: "left-pinky",
  "2": "left-ring",
  w: "left-ring",
  s: "left-ring",
  x: "left-ring",
  "3": "left-middle",
  e: "left-middle",
  d: "left-middle",
  c: "left-middle",
  "4": "left-index",
  r: "left-index",
  f: "left-index",
  v: "left-index",
  "5": "left-index",
  t: "left-index",
  g: "left-index",
  b: "left-index",
  "6": "right-index",
  y: "right-index",
  h: "right-index",
  n: "right-index",
  "7": "right-index",
  u: "right-index",
  j: "right-index",
  m: "right-index",
  "8": "right-middle",
  i: "right-middle",
  k: "right-middle",
  ",": "right-middle",
  "9": "right-ring",
  o: "right-ring",
  l: "right-ring",
  ".": "right-ring",
  "0": "right-pinky",
  p: "right-pinky",
  "-": "right-pinky",
  "=": "right-pinky",
  "[": "right-pinky",
  "]": "right-pinky",
  "\\": "right-pinky",
  ";": "right-pinky",
  "'": "right-pinky",
  "/": "right-pinky",
};

export const fingerOrder: readonly FingerId[] = [
  "left-pinky",
  "left-ring",
  "left-middle",
  "left-index",
  "left-thumb",
  "right-thumb",
  "right-index",
  "right-middle",
  "right-ring",
  "right-pinky",
];

export function nextRequiredCharacter(target: string, input: string): string {
  return Array.from(target)[Array.from(input).length] ?? "";
}

export function keyboardKeyForCharacter(character: string): string | null {
  if (!character) return null;
  if (character === " ") return "Space";
  const key = shiftedKeys[character] ?? character.toLowerCase();
  return key.length === 1 && /[a-z]/.test(key) ? key.toUpperCase() : key;
}

export function fingerForCharacter(character: string): FingerId | null {
  if (!character) return null;
  if (character === " ") return "right-thumb";
  const key = shiftedKeys[character] ?? character.toLowerCase();
  return fingerByKey[key] ?? null;
}

export function characterNeedsShift(character: string): boolean {
  return (
    (/[A-Z]/.test(character) && character.length === 1) ||
    Object.hasOwn(shiftedKeys, character)
  );
}
