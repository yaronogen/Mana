import { Redirect } from 'expo-router';
import { usePreferences } from '../src/stores/preferences';

export default function EntryRoute() {
  const onboarded = usePreferences((state) => state.onboarded);
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
