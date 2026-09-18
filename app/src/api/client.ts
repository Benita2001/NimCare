const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787/api';

export interface ApiError {
  error: string;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
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

export interface CareDropType {
  type: 'PHOTO' | 'PLAYLIST' | 'MOVIE' | 'TREAT';
  emoji: string;
  cardTitle: string;
  headline: string;
}

export interface CareDrop {
  id: string;
  pairId: string;
  senderWallet: string;
  recipientWallet: string;
  type: CareDropType['type'];
  title: string | null;
  caption: string | null;
  mediaUrl: string | null;
  mediaMime: string | null;
  externalUrl: string | null;
  externalProvider: string | null;
  amountLuna: number;
  status: string;
  failureReason: string | null;
  transactionHash: string | null;
  blockchainVerificationStatus: string;
  createdAt: string;
  openedAt: string | null;
  completedAt: string | null;
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

  careDropTypes: () => request<{ types: CareDropType[] }>('/caredrops/types'),

  uploadPhoto: async (file: File, token: string) => {
    const form = new FormData();
    form.append('photo', file);
    return request<{ url: string; mime: string }>('/media/photo', { method: 'POST', body: form }, token);
  },

  createCareDrop: (
    params: {
      recipientWallet: string;
      type: CareDropType['type'];
      title?: string;
      caption?: string;
      mediaUrl?: string;
      mediaMime?: string;
      externalUrl?: string;
      amountLuna: number;
    },
    token: string,
  ) =>
    request<{ id: string; recipient: string; amountLuna: number; reference: string; shareToken: string }>(
      '/caredrops',
      { method: 'POST', body: JSON.stringify(params) },
      token,
    ),

  submitPayment: (id: string, txHash: string, token: string) =>
    request<{ id: string; status: string }>(`/caredrops/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    }, token),

  getCareDrop: (id: string, token: string) => request<{ caredrop: CareDrop }>(`/caredrops/${id}`, undefined, token),

  getCareDropByToken: (shareToken: string, token: string) =>
    request<{ caredrop: CareDrop }>(`/caredrops/by-token/${shareToken}`, undefined, token),

  respond: (id: string, responseText: string, token: string) =>
    request<{ caredrop: CareDrop }>(`/caredrops/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ responseText }),
    }, token),

  myLoops: (token: string) => request<{ pairs: any[] }>('/pairs/mine', undefined, token),

  getLoop: (pairId: string, token: string) => request<{ pair: any }>(`/pairs/${pairId}`, undefined, token),

  getLoopMoments: (pairId: string, token: string) => request<{ memory: any[] }>(`/pairs/${pairId}/memory`, undefined, token),
};
