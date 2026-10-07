import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../src/components/Icon';
import { ManaButton } from '../src/components/ManaButton';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Typography';
import { fetchImportUsage, PLANS, purchasesAvailable, type ImportUsage, type PlanId } from '../src/services/billing/plan';
import { usePreferences } from '../src/stores/preferences';
import { useManaTheme } from '../src/theme/useManaTheme';

function formatDate(iso: string, language: string): string {
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(language, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  } catch {
    return iso;
  }
}

export default function BillingScreen() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const [usage, setUsage] = useState<ImportUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly');

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void fetchImportUsage().then((result) => { if (active) setUsage(result); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  // Testers see the free plan here; their larger allowance shows in the usage line.
  const plan: PlanId = usage?.plan === 'premium' ? 'premium' : 'free';
  const notYet = () => {
    if (Platform.OS === 'web') globalThis.alert?.(`${t('purchaseSoonTitle')}\n\n${t('purchaseSoonBody')}`);
    else Alert.alert(t('purchaseSoonTitle'), t('purchaseSoonBody'));
  };
  const upgrade = () => { if (!purchasesAvailable) notYet(); };
  const restore = () => { if (!purchasesAvailable) notYet(); };

  const feature = (label: string, tint: string) => (
    <View key={label} style={styles.feature}>
      <Icon name="check" color={tint} size={16} />
      <Text style={[styles.featureText, { color: colors.text }]}>{label}</Text>
    </View>
  );

  const progress = usage ? Math.min(1, usage.used / usage.limit) : 0;
  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>{t('planAndBilling')}</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.muted }]}>{t('currentPlan')}</Text>
          <View style={[styles.badge, { backgroundColor: plan === 'premium' ? colors.primary : colors.primarySoft }]}>
            <Text style={[styles.badgeText, { color: plan === 'premium' ? colors.onPrimary : colors.primaryText }]}>{plan === 'premium' ? t('planPremium') : t('planFree')}</Text>
          </View>
        </View>
        {loading ? <ActivityIndicator color={colors.primaryText} /> : usage ? <>
          <Text style={[styles.usage, { color: colors.text }]}>{t('importsUsed', { used: usage.used, limit: usage.limit })}</Text>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: usage.limit, now: usage.used }} style={[styles.track, { backgroundColor: colors.primarySoft }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? colors.accentText : colors.primary }]} />
          </View>
          <Text style={[styles.small, { color: colors.muted }]}>{t('resetsOn', { date: formatDate(usage.resetsAt, language) })}</Text>
        </> : <Text style={[styles.small, { color: colors.muted }]}>{t('usageUnavailable')}</Text>}
        <Text style={[styles.small, { color: colors.muted }]}>{t('whatCounts')}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: plan === 'free' ? colors.primary : colors.line }]}>
        <View style={styles.row}>
          <Text style={[styles.planName, { color: colors.text }]}>{t('planFree')}</Text>
          {plan === 'free' && <Text style={[styles.current, { color: colors.primaryText }]}>{t('currentBadge')}</Text>}
        </View>
        {[t('freeFeature1'), t('freeFeature2'), t('freeFeature3')].map((label) => feature(label, colors.primaryText))}
      </View>

      <View style={[styles.card, styles.premium, { backgroundColor: colors.primarySoft, borderColor: plan === 'premium' ? colors.primary : colors.primarySoft }]}>
        <View style={styles.row}>
          <Text style={[styles.planName, { color: colors.text }]}>{t('planPremium')}</Text>
          {plan === 'premium' && <Text style={[styles.current, { color: colors.primaryText }]}>{t('currentBadge')}</Text>}
        </View>
        {[t('premiumFeature1'), t('premiumFeature2'), t('premiumFeature3')].map((label) => feature(label, colors.primaryText))}

        <View style={[styles.segment, { backgroundColor: colors.surface }]}>
          {(['monthly', 'yearly'] as const).map((option) => {
            const selected = period === option;
            return <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setPeriod(option)}
              style={[styles.segmentItem, { backgroundColor: selected ? colors.primary : 'transparent' }]}>
              <Text style={[styles.segmentText, { color: selected ? colors.onPrimary : colors.text }]}>{option === 'monthly' ? t('monthly') : t('yearly')}</Text>
              {option === 'yearly' && <Text style={[styles.save, { color: selected ? colors.onPrimary : colors.accentText }]}>{t('yearlySave')}</Text>}
            </Pressable>;
          })}
        </View>
        <View style={styles.price}>
          <Text style={[styles.priceValue, { color: colors.text }]}>{period === 'monthly' ? PLANS.premium.monthlyPrice : PLANS.premium.yearlyPrice}</Text>
          <Text style={[styles.pricePer, { color: colors.muted }]}>{period === 'monthly' ? t('perMonth') : t('perYear')}</Text>
        </View>
        {plan !== 'premium' && <ManaButton title={t('upgrade')} onPress={upgrade} />}
      </View>

      <Pressable accessibilityRole="button" onPress={restore} style={styles.restore}>
        <Text style={[styles.restoreText, { color: colors.primaryText }]}>{t('restorePurchases')}</Text>
      </Pressable>
      <Text style={[styles.terms, { color: colors.muted }]}>{t('subscriptionTerms')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  card: { borderWidth: 1.5, borderRadius: 18, padding: 16, gap: 10 },
  premium: {},
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { fontSize: 13, fontWeight: '600' },
  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  usage: { fontSize: 16, fontWeight: '700' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  small: { fontSize: 13, lineHeight: 19 },
  planName: { fontSize: 20, fontWeight: '700' },
  current: { fontSize: 13, fontWeight: '700' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, flex: 1, lineHeight: 20 },
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4, marginTop: 4 },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  segmentText: { fontSize: 14, fontWeight: '700' },
  save: { fontSize: 12, fontWeight: '700' },
  price: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  priceValue: { fontSize: 30, fontWeight: '800' },
  pricePer: { fontSize: 14 },
  restore: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  restoreText: { fontSize: 14, fontWeight: '700' },
  terms: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
