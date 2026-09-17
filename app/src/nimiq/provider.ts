import { init, type NimiqProvider, type ErrorResponse } from '@nimiq/mini-app-sdk';

export type NimiqResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'ProviderUnavailable' | 'PermissionDenied' | 'ConsensusNotEstablished' | 'Unknown'; message: string };

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

export async function sendCareDropPayment(params: {
  recipient: string;
  amountLuna: number;
  reference: string;
}): Promise<NimiqResult<string>> {
  try {
    const provider = await getProvider();

    const consensus = await provider.isConsensusEstablished();
    if (!consensus) {
      return {
        ok: false,
        kind: 'ConsensusNotEstablished',
        message: 'Your wallet is still syncing with the network. Please try again in a moment.',
      };
    }

    const result = await provider.sendBasicTransactionWithData({
      recipient: params.recipient,
      value: params.amountLuna,
      data: params.reference,
    });

    if (isErrorResponse(result)) {
      return { ok: false, kind: 'PermissionDenied', message: result.error.message };
    }
    return { ok: true, value: result };
  } catch (err) {
    return { ok: false, kind: 'Unknown', message: err instanceof Error ? err.message : 'Payment failed' };
  }
}
