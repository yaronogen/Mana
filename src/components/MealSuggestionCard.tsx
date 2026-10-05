import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { mealSuggestions, mealTimeFor, type MealTime } from '../domain/mealTime';
import { dislikedIngredients, matchesFavoriteCuisine, profileConflicts } from '../domain/personalization';
import { useProfile } from '../stores/profile';
import type { Recipe } from '../domain/recipe';
import { useManaTheme } from '../theme/useManaTheme';
import { Icon } from './Icon';
import { ManaButton } from './ManaButton';
import { RecipeImage } from './RecipeImage';
import { Text } from './Typography';

const meal: Record<MealTime, { greeting: string; label: string }> = {
  breakfast: { greeting: 'goodMorning', label: 'mealBreakfast' },
  lunch: { greeting: 'goodAfternoon', label: 'mealLunch' },
  afternoon: { greeting: 'goodAfternoon', label: 'mealAfternoon' },
  dinner: { greeting: 'goodEvening', label: 'mealDinner' },
  lateNight: { greeting: 'goodNight', label: 'mealLateNight' },
};

/** Suggests what to cook for the current local meal time, with "Another idea" to step through the matches. */
export function MealSuggestionCard({ recipes }: { recipes: Recipe[] }) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile((state) => state.profile);
  const mealTime = mealTimeFor(new Date().getHours());
  const { recipes: suggestions, fallback } = mealSuggestions(recipes, mealTime, {
    conflicts: (recipe) => profileConflicts(recipe, profile).length > 0 || dislikedIngredients(recipe, profile.dislikes).length > 0,
    favoriteCuisine: (recipe) => matchesFavoriteCuisine(recipe, profile.cuisines),
  });
  const [index, setIndex] = useState(0);
  const pop = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();
  useEffect(() => setIndex(0), [mealTime, suggestions.length]);
  if (!suggestions.length) return null;
  const recipe = suggestions[index % suggestions.length];
  const { greeting, label } = meal[mealTime];

  const next = () => {
    setIndex((value) => value + 1);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (reduceMotion) return;
    pop.setValue(0.94);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.head}>
        <Image source={require('../../assets/images/icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t(greeting)}{profile.name ? `, ${profile.name}` : ''} · {t(label)}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{fallback ? t('noMealMatch') : t('howAbout')}</Text>
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Pressable accessibilityRole="button" onPress={() => router.push(`/recipe/${recipe.id}`)} style={({ pressed }) => [styles.result, { backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 }]}>
          <RecipeImage uri={recipe.imageUri} style={styles.thumb} glyphSize={22} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text numberOfLines={2} style={[styles.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
            {recipe.totalTime !== null && <Text style={[styles.meta, { color: colors.muted }]}>{recipe.totalTime} {t('minuteAbbrev')}</Text>}
          </View>
          <Icon name="chevron" color={colors.text} size={18} />
        </Pressable>
      </Animated.View>

      {suggestions.length > 1 && <ManaButton title={t('anotherIdea')} onPress={next} secondary icon={<Icon name="sparkles" color={colors.primaryText} size={17} />} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 14 },
  title: { fontSize: 16, fontWeight: '700' }, body: { fontSize: 13, lineHeight: 18 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 10, minHeight: 84 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  recipeTitle: { fontSize: 16, fontWeight: '700', lineHeight: 21 }, meta: { fontSize: 12 },
});
