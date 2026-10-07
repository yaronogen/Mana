import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import { useManaTheme } from '../theme/useManaTheme';
import { Icon } from './Icon';
import { Screen } from './Screen';

// The import is one server call, so progress is paced by time: each step completes as typical
// imports pass it, and the last step stays open until the result arrives.
const STEP_DONE_AFTER_MS = [1500, 4500, 9000];

export function PreparingRecipe({ fromLink, fromPhotos = false }: { fromLink: boolean; fromPhotos?: boolean }) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const [done, setDone] = useState(0);
  useEffect(() => {
    const timers = STEP_DONE_AFTER_MS.map((delay, index) => setTimeout(() => setDone(index + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, []);
  const steps = [fromPhotos ? t('stepReadingPhotos') : fromLink ? t('stepReadingPage') : t('stepReadingText'), t('stepExtracting'), t('stepCleaning'), t('stepTranslating')];
  return (
    <Screen contentStyle={styles.container}>
      <View style={[styles.ring, { borderColor: colors.primarySoft }]}><ActivityIndicator size="large" color={colors.primaryText} /></View>
      <Text style={[styles.title, { color: colors.text }]}>{t('preparing')}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{fromPhotos ? t('readingPhotosNote') : fromLink ? t('readingPageNote') : t('processingNote')}</Text>
      <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {steps.map((label, index) => {
          const complete = index < done;
          const current = index === done;
          return <View key={label} style={[styles.step, index < steps.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            <View style={styles.stepIcon}>
              {current ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Icon name={complete ? 'checkCircle' : 'circle'} color={complete ? colors.success : colors.line} size={18} />}
            </View>
            <Text style={[styles.stepText, { color: complete || current ? colors.text : colors.muted }]}>{label}</Text>
            {complete && <Icon name="check" color={colors.success} size={16} />}
          </View>;
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  ring: { width: 110, height: 110, borderRadius: 55, borderWidth: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  list: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, marginTop: 22 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  stepIcon: { width: 22, alignItems: 'center' },
  stepText: { flex: 1, fontSize: 14 },
});
