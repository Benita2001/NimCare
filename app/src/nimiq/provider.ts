import { init, type NimiqProvider, type ErrorResponse } from '@nimiq/mini-app-sdk';
import { markStage } from '../diagnostics';

export type PaymentErrorKind =
  | 'ProviderUnavailable'
  | 'PermissionDenied'
  | 'ConsensusNotEstablished'
  | 'InvalidTransaction'
  | 'InternalError'
  | 'Unknown';

export type NimiqResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: PaymentErrorKind; message: string };

function isErrorResponse(x: unknown): x is ErrorResponse {
  return typeof x === 'object' && x !== null && 'error' in x;
}

let providerPromise: Promise<NimiqProvider> | null = null;

/**
 * Initializes the Nimiq Mini App provider. Per the verified SDK source
 * (see MEMORY.md), init() waits for window.nimiq to be injected by Nimiq
 * Pay — outside Nimiq Pay (e.g. a plain desktop browser) it will time out.
 */
export function getProvider(timeoutMs = 8000): Promise<NimiqProvider> {
  if (!providerPromise) {
    providerPromise = init({ timeout: timeoutMs }).catch((err) => {
      providerPromise = null;
      throw err;
    });
  }
  return providerPromise;
}

export async function connectWallet(): Promise<NimiqResult<string[]>> {
  let provider: NimiqProvider;
  try {
    provider = await getProvider();
  } catch {
    return {
      ok: false,
      kind: 'ProviderUnavailable',
      message: 'NimCare needs to run inside Nimiq Pay to access your wallet.',
    };
  }

  try {
    const result = await provider.listAccounts();
    if (isErrorResponse(result)) {
      return { ok: false, kind: 'PermissionDenied', message: result.error.message };
    }
    return { ok: true, value: result };
  } catch (err) {
    return { ok: false, kind: 'Unknown', message: err instanceof Error ? err.message : 'Unknown wallet error' };
  }
}

export async function signMessage(message: string): Promise<NimiqResult<{ publicKey: string; signature: string }>> {
  try {
    const provider = await getProvider();
    const result = await provider.sign(message);
    if (isErrorResponse(result)) {
      return { ok: false, kind: 'PermissionDenied', message: result.error.message };
    }
    return { ok: true, value: result };
  } catch (err) {
    return { ok: false, kind: 'Unknown', message: err instanceof Error ? err.message : 'Signing failed' };
  }
}

/**
 * Nimiq's documented basic-tx-with-data payload limit. Our reference
 * format (`NC:D:<10 chars>`, ~15 bytes) is far under this, but we check
 * the real encoded byte length rather than assume — see MEMORY.md
 * 2026-09-18 transaction internal_error hotfix.
 */
const MAX_REFERENCE_BYTES = 64;

function truncateSafe(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Detects non-breaking spaces, newlines/tabs, zero-width characters, and
 * other Unicode whitespace/punctuation that a plain ASCII-space check
 * would miss — any of which could reach the provider from a copy/paste
 * (a chat app, a note-taking app, a wallet UI that renders addresses with
 * NBSP) and plausibly cause the provider to reject a payload our own
 * ASCII-focused checks see as clean. Detection only — never logs the
 * actual string here, since the caller already logs the value itself.
 */
const INVISIBLE_OR_NONSTANDARD_CODEPOINTS = new Set([
  0x00a0, // non-breaking space
  0x200b, 0x200c, 0x200d, 0x200e, 0x200f, // zero-width / bidi marks
  0x2028, 0x2029, // line/paragraph separator
  0xfeff, // BOM / zero-width no-break space
  0x09, 0x0d, 0x0a, // tab, CR, LF
]);

function hasInvisibleOrNonstandardChars(s: string): boolean {
  for (const ch of s) {
    if (INVISIBLE_OR_NONSTANDARD_CODEPOINTS.has(ch.codePointAt(0) ?? -1)) return true;
  }
  return false;
}

/**
 * Classifies a provider payment failure into a UI-safe kind + message,
 * regardless of whether it arrived as a resolved `ErrorResponse` (the SDK's
 * documented shape: `{ error: { type, message } }`) or a thrown JS error.
 *
 * Before this, every `ErrorResponse` was collapsed into 'PermissionDenied'
 * without ever looking at `error.type` — so a real device failure like
 * `internal_error` was misreported to the user as "Transaction cancelled",
 * which is both wrong and actively hid the real cause during on-device
 * debugging. This inspects the actual type/name/message safely: only
 * short, explicitly-named string fields are read and logged (truncated),
 * never a raw object dump. See MEMORY.md 2026-09-18 hotfix.
 */
function classifyProviderFailure(source: unknown): { kind: PaymentErrorKind; message: string; diagnostic: string } {
  let origin: 'ErrorResponse' | 'thrown';
  let ctorName = 'unknown';
  let typeOrName: string | undefined;
  let rawMessage: string | undefined;
  let nestedMessage: string | undefined;

  if (isErrorResponse(source)) {
    origin = 'ErrorResponse';
    ctorName = 'ErrorResponse';
    typeOrName = source.error?.type;
    rawMessage = source.error?.message;
  } else {
    origin = 'thrown';
    const err = source as { constructor?: { name?: string }; name?: string; code?: unknown; type?: unknown; message?: unknown; cause?: { message?: unknown }; data?: { message?: unknown } } | null;
    ctorName = err?.constructor?.name ?? typeof source;
    typeOrName = err?.name ?? (typeof err?.code === 'string' ? err.code : undefined) ?? (typeof err?.type === 'string' ? err.type : undefined);
    rawMessage = typeof err?.message === 'string' ? err.message : typeof source === 'string' ? source : undefined;
    nestedMessage = typeof err?.cause?.message === 'string' ? err.cause.message : typeof err?.data?.message === 'string' ? err.data.message : undefined;
  }

  const key = (typeOrName ?? '').toLowerCase().replace(/[\s_-]/g, '');
  let kind: PaymentErrorKind;
  let message: string;

  if (key.includes('permissiondenied') || key.includes('userrejected') || key.includes('rejected') || key.includes('cancel')) {
    kind = 'PermissionDenied';
    message = 'Transaction cancelled.';
  } else if (key.includes('invalidtransaction')) {
    kind = 'InvalidTransaction';
    message = 'The transaction details are invalid.';
  } else if (key.includes('consensus')) {
    kind = 'ConsensusNotEstablished';
    message = 'Your wallet is still connecting to the Nimiq network.';
  } else if (key.includes('internalerror') || key === 'internal') {
    kind = 'InternalError';
    message = 'Nimiq Pay could not create this transaction.';
  } else {
    kind = 'Unknown';
    message = rawMessage && rawMessage.trim() ? rawMessage : 'Nimiq Pay could not complete this transaction.';
  }

  const diagnosticParts = [`origin=${origin}`, `ctor=${ctorName}`, `type=${typeOrName ?? 'none'}`];
  if (rawMessage) diagnosticParts.push(`msg=${truncateSafe(rawMessage, 140)}`);
  if (nestedMessage) diagnosticParts.push(`nested=${truncateSafe(nestedMessage, 140)}`);

  return { kind, message, diagnostic: diagnosticParts.join(' ') };
}

export async function sendCareDropPayment(params: {
  recipient: string;
  amountLuna: number;
  reference: string;
}): Promise<NimiqResult<string>> {
  try {
    const provider = await getProvider();
    markStage('PAYMENT:provider-ready');

    const consensus = await provider.isConsensusEstablished();
    markStage(`PAYMENT:consensus:${consensus}`);
    if (!consensus) {
      return {
        ok: false,
        kind: 'ConsensusNotEstablished',
        message: 'Your wallet is still syncing with the network. Please try again in a moment.',
      };
    }

    try {
      const blockNumber = await provider.getBlockNumber();
      markStage(`PAYMENT:block-height:${blockNumber}`);
    } catch {
      // Diagnostic only — never blocks a payment attempt.
      markStage('PAYMENT:block-height:unavailable');
    }

    if (!params.recipient || typeof params.recipient !== 'string') {
      return { ok: false, kind: 'InvalidTransaction', message: 'Missing recipient address.' };
    }
    // The server already validated this recipient with @nimiq/core's real
    // checksum-verifying parser before creating the CareDrop (see
    // server/src/nimiqAddress.ts) — createCareDrop() is always awaited
    // before this function is called, so a checksum-invalid address never
    // reaches this point. The exact value (not just "valid") is logged
    // here — it's a public wallet address, not sensitive — because the
    // 2026-09-18 differential hotfix needs to compare this exact payload
    // against the real-device diagnostic tests' payloads byte for byte.
    markStage(`PAYMENT:recipient:${params.recipient}`);
    if (hasInvisibleOrNonstandardChars(params.recipient)) {
      markStage('PAYMENT:recipient:contains-invisible-chars');
    }
    markStage(`PAYMENT:value-luna:${params.amountLuna}`);

    const dataBytes = new TextEncoder().encode(params.reference).length;
    markStage(`PAYMENT:data-bytes:${dataBytes}`);
    if (hasInvisibleOrNonstandardChars(params.reference)) {
      markStage('PAYMENT:reference:contains-invisible-chars');
    }
    if (dataBytes > MAX_REFERENCE_BYTES) {
      return {
        ok: false,
        kind: 'InvalidTransaction',
        message: 'This CareDrop reference is too long to send on-chain.',
      };
    }

    markStage('PAYMENT:send:start');
    const result = await provider.sendBasicTransactionWithData({
      recipient: params.recipient,
      value: params.amountLuna,
      data: params.reference,
    });

    if (isErrorResponse(result)) {
      const { kind, message, diagnostic } = classifyProviderFailure(result);
      markStage(`PAYMENT:send:error:${diagnostic}`);
      return { ok: false, kind, message };
    }
    return { ok: true, value: result };
  } catch (err) {
    const { kind, message, diagnostic } = classifyProviderFailure(err);
    markStage(`PAYMENT:send:error:${diagnostic}`);
    return { ok: false, kind, message };
  }
}
