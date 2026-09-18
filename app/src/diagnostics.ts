/**
 * Temporary, non-sensitive stage markers for diagnosing the 2026-09-18
 * post-auth blank-screen incident on a real device (see MEMORY.md). Only
 * ever logs a short tag — never a token, signature, address, or private
 * content. Console-only, never sent anywhere. Safe to leave in for a few
 * releases, but should be removed once device verification confirms the
 * fix and no further diagnosis is needed — it's debugging scaffolding,
 * not permanent product telemetry.
 */
export function markStage(tag: string): void {
  // eslint-disable-next-line no-console
  console.log(`[NimCare] ${tag}`);
}
