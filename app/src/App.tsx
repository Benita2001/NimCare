import { useEffect, useState } from 'react';
import { SessionProvider } from './session';
import { useSession } from './sessionContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeScreen } from './screens/Welcome';
import { HomeScreen } from './screens/Home';
import { ComposerScreen } from './screens/Composer';
import { ShareSuccessScreen } from './screens/ShareSuccess';
import { CareDropScreen } from './screens/Reveal';
import { LoopScreen } from './screens/LoopScreen';
import { TxDiagnosticScreen } from './screens/TxDiagnostic';
import { PreparedCardTestScreen } from './screens/PreparedCardTest';
import { PrivacyScreen } from './screens/Privacy';
import { TermsScreen } from './screens/Terms';
import type { CareDropType } from './api/client';

type Route =
  | { name: 'home' }
  | { name: 'compose'; type: CareDropType['type']; presetRecipient?: string }
  | { name: 'shareSuccess'; shareToken: string }
  | { name: 'caredrop'; caredropId?: string; shareToken?: string }
  | { name: 'loop'; pairId: string };

function Router() {
  const { status } = useSession();
  const initialShareToken = new URLSearchParams(window.location.search).get('d');
  const [route, setRoute] = useState<Route>(
    initialShareToken ? { name: 'caredrop', shareToken: initialShareToken } : { name: 'home' },
  );
  const [loops, setLoops] = useState<any[]>([]);
  // A simple overlay flag rather than a Route variant — Privacy/Terms must
  // be reachable regardless of auth state (a visitor who hasn't connected
  // yet should still be able to read them), which the authenticated-only
  // Route union below doesn't cover.
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);

  // This is a single-page app with state-based "screens", not real route
  // navigation — the browser never resets scroll position on its own.
  // Without this, navigating from a long, scrolled-down screen to a
  // shorter one (e.g. Home -> Privacy) leaves the viewport scrolled past
  // all of the new screen's content, rendering as a blank page until the
  // user manually scrolls up. Found during the post-submission mobile
  // audit — see MEMORY.md.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route, legalView]);

  if (legalView === 'privacy') {
    return <PrivacyScreen onBack={() => setLegalView(null)} />;
  }
  if (legalView === 'terms') {
    return <TermsScreen onBack={() => setLegalView(null)} />;
  }

  if (status !== 'connected') {
    return <WelcomeScreen onShowPrivacy={() => setLegalView('privacy')} onShowTerms={() => setLegalView('terms')} />;
  }

  // Temporary, diagnostic-only escape hatch for the 2026-09-18 real-device
  // internal_error investigation (see TxDiagnostic.tsx / MEMORY.md). Only
  // reachable via ?diag=tx — never linked from normal navigation.
  if (new URLSearchParams(window.location.search).get('diag') === 'tx') {
    return <TxDiagnosticScreen />;
  }
  // Same pattern, for the "prepared-card" test (see PreparedCardTest.tsx /
  // MEMORY.md instruction #20) — only reachable via ?diag=prepared.
  if (new URLSearchParams(window.location.search).get('diag') === 'prepared') {
    return <PreparedCardTestScreen />;
  }

  switch (route.name) {
    case 'home':
      return (
        <HomeScreen
          onSendType={(type) => setRoute({ name: 'compose', type })}
          onOpenLoop={(pairId) => setRoute({ name: 'loop', pairId })}
          onLoopsLoaded={setLoops}
          onShowPrivacy={() => setLegalView('privacy')}
          onShowTerms={() => setLegalView('terms')}
        />
      );
    case 'compose':
      return (
        <ComposerScreen
          type={route.type}
          loops={loops}
          presetRecipient={route.presetRecipient}
          onBack={() => setRoute({ name: 'home' })}
          onCreated={({ shareToken }) => setRoute({ name: 'shareSuccess', shareToken })}
        />
      );
    case 'shareSuccess':
      return <ShareSuccessScreen shareToken={route.shareToken} onDone={() => setRoute({ name: 'home' })} />;
    case 'caredrop':
      return (
        <CareDropScreen
          caredropId={route.caredropId}
          shareToken={route.shareToken}
          onBack={() => setRoute({ name: 'home' })}
          onSendOneBack={(recipientWallet) => setRoute({ name: 'compose', type: 'TREAT', presetRecipient: recipientWallet })}
        />
      );
    case 'loop':
      return (
        <LoopScreen
          pairId={route.pairId}
          onBack={() => setRoute({ name: 'home' })}
          onOpenMoment={(id) => setRoute({ name: 'caredrop', caredropId: id })}
        />
      );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <Router />
      </SessionProvider>
    </ErrorBoundary>
  );
}
