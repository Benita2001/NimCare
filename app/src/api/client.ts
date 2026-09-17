const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787/api';

export interface ApiError {
  error: string;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((json as ApiError).error ?? `HTTP ${res.status}`);
    (err as any).code = (json as ApiError).error;
    throw err;
  }
  return json as T;
}

export const api = {
  health: () => request<{ ok: boolean; rpcConfigured: boolean }>('/health'),

  nonce: (address: string) => request<{ nonce: string; expiresAt: string }>('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ address }),
  }),

  verify: (params: { address: string; publicKey: string; signature: string; nonce: string }) =>
    request<{ sessionToken: string; address: string }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  prompts: () => request<{ prompts: Array<{ id: string; emoji: string; title: string; promptText: string; relationshipTypes: string[] }> }>(
    '/caredrops/prompts',
  ),

  createInvite: (relationshipType: string, token: string) =>
    request<{ inviteId: string; pairId: string; token: string; expiresAt: string }>('/pairs/invite', {
      method: 'POST',
      body: JSON.stringify({ relationshipType }),
    }, token),

  getInvite: (inviteToken: string) =>
    request<{ pairId: string; relationshipType: string; invitedBy: string }>(`/pairs/invite/${inviteToken}`),

  acceptInvite: (inviteToken: string, token: string) =>
    request<{ pairId: string; status: string }>('/pairs/accept', {
      method: 'POST',
      body: JSON.stringify({ token: inviteToken }),
    }, token),

  myPairs: (token: string) => request<{ pairs: any[] }>('/pairs/mine', undefined, token),

  getPair: (pairId: string, token: string) => request<{ pair: any }>(`/pairs/${pairId}`, undefined, token),

  getMemory: (pairId: string, token: string) => request<{ memory: any[] }>(`/pairs/${pairId}/memory`, undefined, token),

  createCareDrop: (
    params: { pairId: string; promptId?: string; promptText: string; amountLuna: number; sealedNote: string },
    token: string,
  ) =>
    request<{ id: string; recipient: string; amountLuna: number; reference: string }>('/caredrops', {
      method: 'POST',
      body: JSON.stringify(params),
    }, token),

  submitPayment: (id: string, txHash: string, token: string) =>
    request<{ id: string; status: string }>(`/caredrops/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    }, token),

  getCareDrop: (id: string, token: string) => request<{ caredrop: any }>(`/caredrops/${id}`, undefined, token),

  respond: (id: string, responseText: string, token: string) =>
    request<{ caredrop: any }>(`/caredrops/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ responseText }),
    }, token),
};
