import { getShareExtensionKey } from 'expo-share-intent';

/**
 * Content shared into Mana from another app (the iOS share extension) opens the app with a
 * "mana://dataUrl=manaShareKey…" link that is not a screen. Stay where the app is, or start normally
 * when it was closed; ShareIntentHandler then opens the import. Every other link is routed as usual.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return initial ? '/' : null;
    return path;
  } catch {
    return '/';
  }
}
