/**
 * Minimal JSON-RPC client matching the wire format used by
 * @nimiq/mini-app-sdk's RPCServer (verified by reading its compiled source,
 * see MEMORY.md): POST { id, jsonrpc: '2.0', method, params }, response is
 * { result: { data, metadata? }, error?: { message, data } } — the payload
 * lives at result.data, not result directly.
 */

export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  timestamp: number;
  confirmations: number;
  size: number;
  relatedAddresses: string[];
  from: string;
  fromType: number;
  to: string;
  toType: number;
  value: number;
  fee: number;
  senderData: string;
  recipientData: string;
  flags: number;
  validityStartHeight: number;
  proof: string;
  networkId: number;
}

export class NimiqRpcUnavailableError extends Error {}

export async function getTransactionByHash(hash: string): Promise<TransactionInfo | null> {
  const rpcUrl = process.env.NIMIQ_RPC_URL;
  if (!rpcUrl) {
    throw new NimiqRpcUnavailableError('NIMIQ_RPC_URL is not configured');
  }

  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: Date.now(),
      jsonrpc: '2.0',
      method: 'getTransactionByHash',
      params: [hash],
    }),
  });

  if (!res.ok) {
    throw new NimiqRpcUnavailableError(`RPC HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    result?: { data?: TransactionInfo | null };
    error?: { message?: string; data?: string };
  };

  if (json.error) {
    // A "not found" style error is treated as "not yet visible", not a hard failure.
    return null;
  }

  return json.result?.data ?? null;
}
