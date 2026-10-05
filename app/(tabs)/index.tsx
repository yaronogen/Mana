import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Typography';
import { AppHeader } from '../../src/components/AppHeader';
import { Icon } from '../../src/components/Icon';
import { ManaButton } from '../../src/components/ManaButton';
import { RecipeCard } from '../../src/components/RecipeCard';
import { Screen } from '../../src/components/Screen';
import { MealSuggestionCard } from '../../src/components/MealSuggestionCard';
import { getRecipes } from '../../src/data/database';
import { RECIPE_CATEGORIES, type Recipe } from '../../src/domain/recipe';
import { categoryLabels } from '../../src/i18n/resources';
import { usePreferences } from '../../src/stores/preferences';
import { useTranslations } from '../../src/stores/translations';
import { useManaTheme } from '../../src/theme/useManaTheme';

// Home answers "what should I cook today?"; the Recipes tab is the full, searchable library.
export default function HomeScreen() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const translationVersion = useTranslations((state) => state.version);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getRecipes({ language }).then((items) => { if (active) setRecipes(items); }).catch(() => { if (active) setRecipes([]); });
    return () => { active = false; };
  }, [language, translationVersion]));

  const favorites = recipes.filter((recipe) => recipe.favorite);
  const categories = RECIPE_CATEGORIES
    .map((category) => ({ category, count: recipes.filter((recipe) => recipe.category === category).length }))
    .filter((item) => item.count > 0);
  const shelf = (title: string, items: Recipe[], href: Href) => <>
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Pressable onPress={() => router.push(href)} hitSlop={8}><Text style={[styles.seeAll, { color: colors.primaryText }]}>{t('seeAll')}</Text></Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} style={styles.shelf}>
      {items.slice(0, 6).map((recipe) => <RecipeCard key={recipe.id} compact recipe={recipe} onPress={() => router.push(`/recipe/${recipe.id}`)} />)}
    </ScrollView>
  </>;

  return (
    <Screen>
      <AppHeader />

      <ManaButton title={t('addRecipe')} onPress={() => router.push('/add')} icon={<Icon name="plus" color={colors.onPrimary} size={18} />} />

      {recipes.length ? <>
        <MealSuggestionCard recipes={recipes} />
        {shelf(t('recentlyAdded'), [...recipes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), '/(tabs)/recipes')}
        {favorites.length > 0 && shelf(t('favorites'), favorites, '/(tabs)/favorites')}
        <Text style={[styles.sectionTitle, styles.categoriesTitle, { color: colors.text }]}>{t('browseCategories')}</Text>
        <View style={styles.categoryGrid}>
          {categories.map(({ category, count }, index) => {
            const warm = index % 2 === 1;
            return <Pressable key={category} accessibilityRole="button" accessibilityLabel={`${categoryLabels[language][category]}, ${count} ${t('recipesCount')}`} onPress={() => router.push({ pathname: '/(tabs)/recipes', params: { category } })} style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.categoryMark, { backgroundColor: warm ? colors.accentSoft : colors.primarySoft }]}><Text style={[styles.categoryCount, { color: warm ? colors.accentText : colors.primaryText }]}>{count}</Text></View>
              <Text numberOfLines={1} style={[styles.categoryName, { color: colors.text }]}>{categoryLabels[language][category]}</Text>
            </Pressable>;
          })}
        </View>
      </> : <Pressable accessibilityRole="button" onPress={() => router.push('/add')} style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Icon name="asterisk" color={colors.primaryText} size={36} /></View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('emptyRecipes')}</Text>
        <Text style={[styles.emptyHint, { color: colors.muted }]}>{t('firstRecipeHint')}</Text>
      </Pressable>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 4 },
  shelf: { marginHorizontal: -22, flexGrow: 0 },
  cards: { gap: 12, paddingHorizontal: 22, paddingBottom: 2 },
  empty: { alignItems: 'center', paddingVertical: 26, gap: 8 },
  emptyIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', lineHeight: 22, textAlign: 'center', maxWidth: 240 },
  emptyHint: { fontSize: 13, textAlign: 'center' },
  categoriesTitle: { marginTop: 6 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '48%', minHeight: 54, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  categoryMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  categoryCount: { fontSize: 13, fontWeight: '700' },
  categoryName: { fontSize: 13, fontWeight: '600', flex: 1 },
});
