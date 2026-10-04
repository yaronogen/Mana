import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { TFunction } from 'i18next';
import { dislikedIngredients, profileConflicts, type Conflict } from '../domain/personalization';
import type { Profile } from '../domain/profile';
import type { Recipe } from '../domain/recipe';
import { useProfile } from '../stores/profile';
import { useManaTheme } from '../theme/useManaTheme';
import { Icon } from './Icon';
import { Text } from './Typography';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export const conflictLabelKey = (conflict: Conflict) =>
  ['meat', 'pork', 'honey', 'meatAndDairy'].includes(conflict) ? `conflict${capitalize(conflict)}` : `allergen${capitalize(conflict)}`;

/** Everything in the recipe the profile avoids: allergies, diet conflicts and the user's own dislikes. */
export function avoidedLabels(recipe: Pick<Recipe, 'ingredients'>, profile: Profile, t: TFunction): string[] {
  return [
    ...profileConflicts(recipe, profile).map((conflict) => t(conflictLabelKey(conflict))),
    ...dislikedIngredients(recipe, profile.dislikes),
  ];
}

/** Soft note when a recipe contains something the user's profile avoids. Never changes the recipe. */
export function HeadsUp({ recipe }: { recipe: Pick<Recipe, 'ingredients'> }) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const profile = useProfile((state) => state.profile);
  const items = avoidedLabels(recipe, profile, t);
  if (!items.length) return null;
  return (
    <View style={[styles.box, { backgroundColor: colors.warningBg }]}>
      <Icon name="info" color={colors.warningText} size={17} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: colors.warningText }]}>{t('headsUp')}</Text>
        <Text style={[styles.body, { color: colors.warningText }]}>{t('headsUpContains', { items: items.join(', ') })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 12, alignItems: 'flex-start' },
  title: { fontSize: 13, fontWeight: '700' }, body: { fontSize: 13, lineHeight: 18 },
});
