/**
 * Nimiq Pay "open this Mini App" deeplinks (verified against
 * https://nimiq.dev/mini-apps/, see MEMORY.md). Query-parameter
 * preservation through the deeplink into the mini app's own URL is NOT
 * confirmed by the docs, so callers must not assume `?invite=<token>`
 * survives the hop — always pair this with a manual short-code fallback
 * (see Home screen's "Have an invite code?" entry).
 */
export function buildNimiqPayOpenLinks(targetUrl: string): { customScheme: string; https: string } {
  const bare = targetUrl.replace(/^https?:\/\//, '');
  return {
    customScheme: `nimiqpay://miniapp?url=${encodeURIComponent(bare)}`,
    https: `https://nimpay.app/miniapps/open/${bare}`,
  };
}

export function inviteTargetUrl(inviteToken: string): string {
  return `${window.location.origin}/?invite=${inviteToken}`;
}

/** A CareDrop's shareable surprise link. Query-parameter preservation
 * through the Nimiq Pay deeplink is unconfirmed (see MEMORY.md), so this is
 * paired with the plain link/copy fallback in the share screen. */
export function careDropTargetUrl(shareToken: string): string {
  return `${window.location.origin}/?d=${shareToken}`;
}
