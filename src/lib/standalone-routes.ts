/** Only Preview serves this page outside KEYFLOW's staff session; Vercel Authentication remains the outer gate. */
export function isStandaloneTypingHunterPath(
  pathname: string,
  vercelEnvironment?: string,
) {
  return pathname === "/typing-hunter" && vercelEnvironment === "preview";
}
