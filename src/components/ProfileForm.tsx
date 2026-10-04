import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { ALLERGENS, CUISINES, DIETS, parseDislikes, type Allergen, type Cuisine, type Diet, type Profile } from '../domain/profile';
import { useManaTheme } from '../theme/useManaTheme';
import { Icon } from './Icon';
import { Text, TextInput } from './Typography';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export const dietLabelKey = (diet: Diet) => `diet${capitalize(diet)}`;
export const allergenLabelKey = (allergen: Allergen) => `allergen${capitalize(allergen)}`;
export const cuisineLabelKey = (cuisine: Cuisine) => `cuisine${capitalize(cuisine)}`;

/** Name, household size, diets, allergies and favorite cuisines. Controlled: the parent owns the profile. */
export function ProfileForm({ value, onChange }: { value: Profile; onChange: (profile: Profile) => void }) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const toggle = <T extends string>(list: T[], item: T) => list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
  const size = value.householdSize;
  // Keep the typed text as-is (trailing commas and spaces) and store the parsed list.
  const [dislikesText, setDislikesText] = useState(value.dislikes.join(', '));

  const chips = <T extends string>(items: readonly T[], selected: T[], labelKey: (item: T) => string, onToggle: (item: T) => void) => (
    <View style={styles.chips}>
      {items.map((item) => {
        const active = selected.includes(item);
        return <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => onToggle(item)}
          style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.line }]}>
          <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.text }]}>{t(labelKey(item))}</Text>
        </Pressable>;
      })}
    </View>
  );

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('yourName')}</Text>
        <TextInput value={value.name} onChangeText={(name) => onChange({ ...value, name })} maxLength={40} placeholder={t('namePlaceholder')} placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.line }]} />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('householdSize')}</Text>
        <View style={styles.stepper}>
          <Pressable accessibilityRole="button" accessibilityLabel="-" onPress={() => onChange({ ...value, householdSize: size && size > 1 ? size - 1 : size })}
            style={[styles.stepButton, { backgroundColor: colors.surface, borderColor: colors.line }]}><Text style={[styles.stepGlyph, { color: colors.primaryText }]}>−</Text></Pressable>
          <View style={styles.stepValue}>
            <Icon name="restaurant" color={colors.muted} size={16} />
            <Text style={[styles.stepNumber, { color: colors.text }]}>{size ?? '—'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="+" onPress={() => onChange({ ...value, householdSize: size ? Math.min(12, size + 1) : 2 })}
            style={[styles.stepButton, { backgroundColor: colors.surface, borderColor: colors.line }]}><Text style={[styles.stepGlyph, { color: colors.primaryText }]}>+</Text></Pressable>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('dietsLabel')}</Text>
        {chips(DIETS, value.diets, dietLabelKey, (diet) => onChange({ ...value, diets: toggle(value.diets, diet) }))}
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('allergiesLabel')}</Text>
        {chips(ALLERGENS, value.allergies, allergenLabelKey, (allergen) => onChange({ ...value, allergies: toggle(value.allergies, allergen) }))}
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('dislikesLabel')}</Text>
        <TextInput value={dislikesText} onChangeText={(text) => { setDislikesText(text); onChange({ ...value, dislikes: parseDislikes(text) }); }}
          placeholder={t('dislikesPlaceholder')} placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.line }]} />
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('cuisinesLabel')}</Text>
        {chips(CUISINES, value.cuisines, cuisineLabelKey, (cuisine) => onChange({ ...value, cuisines: toggle(value.cuisines, cuisine) }))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  field: { gap: 9 },
  label: { fontSize: 14, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 22, fontWeight: '700' },
  stepValue: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 54, justifyContent: 'center' },
  stepNumber: { fontSize: 20, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
});
