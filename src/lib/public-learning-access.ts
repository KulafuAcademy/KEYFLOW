/** Set PUBLIC_LEARNING_ACCESS=true in the production environment for temporary public learning access. */
export function publicLearningAccessEnabled() {
  return process.env.PUBLIC_LEARNING_ACCESS === "true";
}
