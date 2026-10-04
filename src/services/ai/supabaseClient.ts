import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} = {
  getItem: async (key) => Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key),
  setItem: async (key, value) => { if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value); else await SecureStore.setItemAsync(key, value); },
  removeItem: async (key) => { if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key); else await SecureStore.deleteItemAsync(key); },
};

export const supabase = url && anonKey ? createClient(url, anonKey, {
  auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
}) : null;

export async function ensureAnonymousSession(): Promise<void> {
  if (!supabase) throw new Error('backend_not_configured');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
