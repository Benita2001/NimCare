import { createContext, useContext } from 'react';

export interface SessionContextValue {
  address: string | null;
  sessionToken: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  errorKind: string | null;
  errorMessage: string | null;
  connect: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
