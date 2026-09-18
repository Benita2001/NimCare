import { useState } from 'react';
import { SessionProvider } from './session';
import { useSession } from './sessionContext';
import { WelcomeScreen } from './screens/Welcome';
import { HomeScreen } from './screens/Home';
import { CreateInviteScreen, AcceptInviteScreen } from './screens/Pairing';
import { PairHomeScreen } from './screens/PairHome';
import { CreateCareDropScreen } from './screens/CreateCareDrop';
import { CareDropViewScreen } from './screens/CareDropView';

type Route =
  | { name: 'home' }
  | { name: 'createInvite' }
  | { name: 'acceptInvite'; inviteToken: string }
  | { name: 'pair'; pairId: string }
  | { name: 'createCareDrop'; pairId: string; recipientAddress: string }
  | { name: 'caredrop'; caredropId: string };

function Router() {
  const { status } = useSession();
  const initialInviteToken = new URLSearchParams(window.location.search).get('invite');
  const [route, setRoute] = useState<Route>(
    initialInviteToken ? { name: 'acceptInvite', inviteToken: initialInviteToken } : { name: 'home' },
  );

  if (status !== 'connected') {
    return <WelcomeScreen />;
  }

  switch (route.name) {
    case 'home':
      return (
        <HomeScreen
          onCreateInvite={() => setRoute({ name: 'createInvite' })}
          onOpenPair={(pairId) => setRoute({ name: 'pair', pairId })}
          onAcceptInviteCode={(token) => setRoute({ name: 'acceptInvite', inviteToken: token })}
        />
      );
    case 'createInvite':
      return (
        <CreateInviteScreen
          onBack={() => setRoute({ name: 'home' })}
          onCreated={(pairId) => setRoute({ name: 'pair', pairId })}
        />
      );
    case 'acceptInvite':
      return (
        <AcceptInviteScreen
          inviteToken={route.inviteToken}
          onBack={() => setRoute({ name: 'home' })}
          onAccepted={(pairId) => setRoute({ name: 'pair', pairId })}
        />
      );
    case 'pair':
      return (
        <PairHomeScreen
          pairId={route.pairId}
          onBack={() => setRoute({ name: 'home' })}
          onSendCareDrop={(recipientAddress) =>
            setRoute({ name: 'createCareDrop', pairId: route.pairId, recipientAddress })
          }
          onOpenCareDrop={(id) => setRoute({ name: 'caredrop', caredropId: id })}
        />
      );
    case 'createCareDrop':
      return (
        <CreateCareDropScreen
          pairId={route.pairId}
          recipientAddress={route.recipientAddress}
          onBack={() => setRoute({ name: 'pair', pairId: route.pairId })}
          onSent={(caredropId) => setRoute({ name: 'caredrop', caredropId })}
        />
      );
    case 'caredrop':
      return <CareDropViewScreen caredropId={route.caredropId} onBack={() => setRoute({ name: 'home' })} />;
  }
}

export default function App() {
  return (
    <SessionProvider>
      <Router />
    </SessionProvider>
  );
}
