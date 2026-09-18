import { useState } from 'react';
import { SessionProvider } from './session';
import { useSession } from './sessionContext';
import { WelcomeScreen } from './screens/Welcome';
import { HomeScreen } from './screens/Home';
import { ComposerScreen } from './screens/Composer';
import { ShareSuccessScreen } from './screens/ShareSuccess';
import { CareDropScreen } from './screens/Reveal';
import { LoopScreen } from './screens/LoopScreen';
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

  if (status !== 'connected') {
    return <WelcomeScreen />;
  }

  switch (route.name) {
    case 'home':
      return (
        <HomeScreen
          onSendType={(type) => setRoute({ name: 'compose', type })}
          onOpenLoop={(pairId) => setRoute({ name: 'loop', pairId })}
          onLoopsLoaded={setLoops}
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
    <SessionProvider>
      <Router />
    </SessionProvider>
  );
}
