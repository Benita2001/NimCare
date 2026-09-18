import { useCallback, useState, type ReactNode } from 'react';
import { connectWallet, signMessage } from './nimiq/provider';
import { api } from './api/client';
import { SessionContext } from './sessionContext';
import { markStage } from './diagnostics';

interface SessionState {
  address: string | null;
  sessionToken: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  errorKind: string | null;
  errorMessage: string | null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    address: null,
    sessionToken: null,
    status: 'idle',
    errorKind: null,
    errorMessage: null,
  });

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, status: 'connecting', errorKind: null, errorMessage: null }));

    const accounts = await connectWallet();
    if (!accounts.ok) {
      setState((s) => ({ ...s, status: 'error', errorKind: accounts.kind, errorMessage: accounts.message }));
      return;
    }
    markStage('SESSION:listAccounts:ok');
    const address = accounts.value[0];
    if (!address) {
      setState((s) => ({ ...s, status: 'error', errorKind: 'NoAccounts', errorMessage: 'No wallet account found.' }));
      return;
    }

    try {
      const { nonce } = await api.nonce(address);
      markStage('SESSION:nonce:ok');
      const sig = await signMessage(nonce);
      if (!sig.ok) {
        setState((s) => ({ ...s, status: 'error', errorKind: sig.kind, errorMessage: sig.message }));
        return;
      }
      markStage('SESSION:sign:ok');
      const { sessionToken } = await api.verify({
        address,
        publicKey: sig.value.publicKey,
        signature: sig.value.signature,
        nonce,
      });
      markStage('SESSION:verify:ok');
      setState({ address, sessionToken, status: 'connected', errorKind: null, errorMessage: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        errorKind: 'BackendError',
        errorMessage: err instanceof Error ? err.message : 'Could not reach NimCare servers.',
      }));
    }
  }, []);

  return <SessionContext.Provider value={{ ...state, connect }}>{children}</SessionContext.Provider>;
}
