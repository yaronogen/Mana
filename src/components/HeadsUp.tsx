import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { TFunction } from 'i18next';
import { dislikedIngredients, splitConflicts, type Conflict } from '../domain/personalization';
import type { Profile } from '../domain/profile';
import type { Recipe } from '../domain/recipe';
import { useProfile } from '../stores/profile';
import { useManaTheme } from '../theme/useManaTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Typography';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export const conflictLabelKey = (conflict: Conflict) =>
  ['meat', 'pork', 'honey', 'meatAndDairy'].includes(conflict) ? `conflict${capitalize(conflict)}` : `allergen${capitalize(conflict)}`;

/**
 * Everything in the recipe the profile avoids, split into the user's allergies and the rest
 * (diet conflicts and the user's own dislikes).
 */
export function avoidedLabels(recipe: Pick<Recipe, 'ingredients'>, profile: Profile, t: TFunction): { allergens: string[]; avoided: string[] } {
  const { allergens, other } = splitConflicts(recipe, profile);
  return {
    allergens: allergens.map((conflict) => t(conflictLabelKey(conflict))),
    avoided: [...other.map((conflict) => t(conflictLabelKey(conflict))), ...dislikedIngredients(recipe, profile.dislikes)],
  };
}

/**
 * Notes when a recipe contains something the user's profile avoids: a red allergen warning for allergies,
 * a soft heads-up for diet conflicts and dislikes. Never changes the recipe.
 */
export function HeadsUp({ recipe }: { recipe: Pick<Recipe, 'ingredients'> }) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const profile = useProfile((state) => state.profile);
  const { allergens, avoided } = avoidedLabels(recipe, profile, t);
  const box = (icon: IconName, title: string, items: string[], background: string, color: string) => (
    <View accessibilityRole={icon === 'alert' ? 'alert' : undefined} style={[styles.box, { backgroundColor: background }]}>
      <Icon name={icon} color={color} size={17} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <Text style={[styles.body, { color }]}>{t('headsUpContains', { items: items.join(', ') })}</Text>
      </View>
    </View>
  );
  return <>
    {allergens.length > 0 && box('alert', t('allergenWarning'), allergens, colors.dangerBg, colors.dangerText)}
    {avoided.length > 0 && box('info', t('headsUp'), avoided, colors.warningBg, colors.warningText)}
  </>;
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 12, alignItems: 'flex-start' },
  title: { fontSize: 13, fontWeight: '700' }, body: { fontSize: 13, lineHeight: 18 },
});
