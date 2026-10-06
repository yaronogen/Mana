import { useRootNavigationState, useRouter } from 'expo-router';
import { ShareIntentModule, ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { sharedImportText } from '../services/import/sharedText';

// Expo Go and the web have no share extension; the module is then simply absent.
const available = Platform.OS !== 'web' && !!ShareIntentModule;

function Handler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const router = useRouter();
  const navigationReady = !!useRootNavigationState()?.key;
  useEffect(() => {
    if (!hasShareIntent || !navigationReady) return;
    const shared = sharedImportText(shareIntent);
    resetShareIntent();
    if (shared) router.push({ pathname: '/paste', params: { shared } });
  }, [hasShareIntent, navigationReady, shareIntent, resetShareIntent, router]);
  return null;
}

/** Receives links and text shared into Mana from other apps (e.g. an Instagram reel) and opens the import. */
export function ShareIntentHandler({ children }: { children: ReactNode }) {
  if (!available) return <>{children}</>;
  return <ShareIntentProvider options={{ resetOnBackground: true }}>{children}<Handler /></ShareIntentProvider>;
}
