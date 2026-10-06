import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { relativeDay } from '../domain/personalization';
import { usePreferences } from '../stores/preferences';
import { useManaTheme } from '../theme/useManaTheme';
import { ManaButton } from './ManaButton';
import { Text, TextInput } from './Typography';

/** "2 weeks ago", "yesterday"… in the app language. */
export function describeWhen(t: TFunction, iso: string): string {
  const { unit, count } = relativeDay(iso);
  const key = { today: 'whenToday', yesterday: 'whenYesterday', days: 'whenDays', week: 'whenWeek', weeks: 'whenWeeks', month: 'whenMonth', months: 'whenMonths' }[unit];
  return t(key, { n: count });
}

export function Stars({ value, size = 16, color }: { value: number; size?: number; color: string }) {
  return <Text style={{ fontSize: size, color, letterSpacing: 1 }}>{'★'.repeat(value)}<Text style={{ opacity: 0.25 }}>{'★'.repeat(5 - value)}</Text></Text>;
}

/**
 * Bottom sheet to log a cook: optional 1–5 stars and a note for next time.
 * In "rate" mode it only sets the stars, starting from the current rating, and logs no cook.
 */
export function CookedSheet({ visible, onClose, onSave, mode = 'cook', initialRating = null }: {
  visible: boolean; onClose: () => void; onSave: (rating: number | null, note: string | null) => Promise<void>; mode?: 'cook' | 'rate'; initialRating?: number | null;
}) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const rtl = usePreferences((state) => state.language === 'he');
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const rateOnly = mode === 'rate';
  useEffect(() => { if (visible) setRating(rateOnly ? initialRating : null); }, [visible, rateOnly, initialRating]);

  const close = () => { setRating(null); setNote(''); onClose(); };
  const save = async () => {
    setBusy(true);
    try { await onSave(rating, note.trim() || null); close(); } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('cancel')} style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: colors.background, direction: rtl ? 'rtl' : 'ltr' }]}>
          <View style={[styles.grabber, { backgroundColor: colors.line }]} />
          <Text style={[styles.title, { color: colors.text }]}>{rateOnly ? t('rateTitle') : t('howDidItGo')}</Text>
          {!rateOnly && <Text style={[styles.label, { color: colors.muted }]}>{t('yourRating')}</Text>}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value}`} accessibilityState={{ selected: rating === value }} hitSlop={6}
                onPress={() => setRating(rating === value ? null : value)}>
                <Text style={[styles.star, { color: rating !== null && value <= rating ? colors.accentText : colors.line }]}>★</Text>
              </Pressable>
            ))}
          </View>
          {!rateOnly && <TextInput value={note} onChangeText={setNote} multiline maxLength={300} placeholder={t('cookNotePlaceholder')} placeholderTextColor={colors.muted}
            style={[styles.note, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.line }]} />}
          <ManaButton title={rateOnly ? t('saveRating') : t('save')} onPress={() => void save()} loading={busy} />
          <Pressable onPress={close} style={styles.cancel}><Text style={[styles.cancelText, { color: colors.muted }]}>{t('cancel')}</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34, gap: 14 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: -8 },
  title: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600' },
  stars: { flexDirection: 'row', gap: 10 },
  star: { fontSize: 36 },
  note: { minHeight: 90, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 44 }, cancelText: { fontSize: 14, fontWeight: '600' },
});
