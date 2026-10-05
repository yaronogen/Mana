import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './Typography';
import { getRecipes, toggleFavorite } from '../data/database';
import { RECIPE_CATEGORIES, type Recipe } from '../domain/recipe';
import { categoryLabels } from '../i18n/resources';
import { usePreferences } from '../stores/preferences';
import { useTranslations } from '../stores/translations';
import { useManaTheme } from '../theme/useManaTheme';
import { AppHeader } from './AppHeader';
import { Icon } from './Icon';
import { ManaButton } from './ManaButton';
import { RecipeImage } from './RecipeImage';
import { Screen } from './Screen';

const GRID_COLUMNS = 3;
const GRID_GAP = 8;

export function RecipeCollection({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string; category?: string }>();
  const [query, setQuery] = useState(typeof params.query === 'string' ? params.query : '');
  const [category, setCategory] = useState<string | undefined>(typeof params.category === 'string' ? params.category : undefined);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const translationVersion = useTranslations((state) => state.version);
  const translating = useTranslations((state) => Object.keys(state.pending).length > 0);

  useEffect(() => {
    setQuery(typeof params.query === 'string' ? params.query : '');
    setCategory(typeof params.category === 'string' ? params.category : undefined);
  }, [params.query, params.category]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    // Category filtering happens below, so every category can show how many recipes it holds.
    void getRecipes({ query, favoritesOnly, language }).then((results) => {
      if (active) setRecipes(results);
    }).catch(() => {
      if (active) setRecipes([]);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, favoritesOnly, language, translationVersion]);
  useFocusEffect(load);

  const shown = category ? recipes.filter((recipe) => recipe.category === category) : recipes;
  const counts = new Map<string, number>();
  for (const recipe of recipes) counts.set(recipe.category, (counts.get(recipe.category) ?? 0) + 1);

  const favorite = async (recipe: Recipe) => {
    await toggleFavorite(recipe.id);
    setRecipes((current) => favoritesOnly
      ? current.filter((item) => item.id !== recipe.id)
      : current.map((item) => item.id === recipe.id ? { ...item, favorite: !item.favorite } : item));
  };

  // Equal-width tiles, three to a row, measured from the real width so every row lines up.
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth = gridWidth ? Math.floor((gridWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS) : undefined;
  const tile = (key: string, label: string, count: number, selected: boolean, onPress: () => void) => (
    <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${label}, ${count}`} onPress={onPress}
      style={({ pressed }) => [styles.tile, { width: tileWidth, backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.line, opacity: pressed ? 0.8 : 1 }]}>
      <Text numberOfLines={2} style={[styles.tileLabel, { color: selected ? colors.onPrimary : count ? colors.text : colors.muted }]}>{label}</Text>
      <Text style={[styles.tileCount, { color: selected ? colors.onPrimary : colors.muted }]}>{count}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <AppHeader />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{favoritesOnly ? t('favorites') : t('recipes')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('addRecipe')} onPress={() => router.push('/add')} hitSlop={8} style={styles.iconButton}>
          <Icon name="plus" color={colors.text} size={22} />
        </Pressable>
      </View>
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Icon name="search" color={colors.muted} size={17} />
        <TextInput value={query} onChangeText={setQuery} placeholder={t('search')} placeholderTextColor={colors.muted} style={[styles.search, { color: colors.text }]} returnKeyType="search" />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => setQuery('')} hitSlop={8}><Icon name="close" color={colors.muted} size={16} /></Pressable>}
      </View>
      {!favoritesOnly && (
        // Every category stays visible in a centered grid; tap one to filter, tap it again (or All) to clear.
        <View style={styles.categoryGrid} accessibilityLabel={t('categories')} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
          {tile('all', t('all'), recipes.length, !category, () => setCategory(undefined))}
          {RECIPE_CATEGORIES.map((item) => tile(item, categoryLabels[language][item], counts.get(item) ?? 0, category === item, () => setCategory(category === item ? undefined : item)))}
        </View>
      )}
      {translating && <View style={[styles.notice, { backgroundColor: colors.primarySoft }]}>
        <ActivityIndicator size="small" color={colors.primaryText} />
        <Text style={[styles.noticeText, { color: colors.primaryText }]}>{t('translatingCookbook')}</Text>
      </View>}
      {loading ? <ActivityIndicator color={colors.primaryText} style={{ marginTop: 30 }} /> : shown.length ? (
        <View>{shown.map((recipe) => (
          <Pressable key={recipe.id} accessibilityRole="button" onPress={() => router.push(`/recipe/${recipe.id}`)} style={({ pressed }) => [styles.row, { borderBottomColor: colors.line, opacity: pressed ? 0.8 : 1 }]}>
            <RecipeImage uri={recipe.imageUri} style={styles.thumb} glyphSize={20} />
            <View style={styles.rowText}>
              <Text numberOfLines={2} style={[styles.rowTitle, { color: colors.text }]}>{recipe.title}</Text>
              <Text style={[styles.rowMeta, { color: colors.muted }]}>
                {recipe.totalTime ? `${recipe.totalTime} ${t('minuteAbbrev')}` : categoryLabels[language][recipe.category]}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('favorite')} accessibilityState={{ selected: recipe.favorite }} onPress={() => void favorite(recipe)} hitSlop={6} style={styles.heart}>
              <Icon name={recipe.favorite ? 'heartFill' : 'heart'} color={recipe.favorite ? colors.accentText : colors.muted} size={22} />
            </Pressable>
          </Pressable>
        ))}</View>
      ) : (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Icon name={favoritesOnly ? 'heart' : 'asterisk'} color={colors.leaf} size={48} />
          <Text style={[styles.emptyText, { color: colors.text }]}>{query || category ? t('noRecipesFound') : favoritesOnly ? t('emptyFavorites') : t('emptyRecipes')}</Text>
          {!favoritesOnly && <ManaButton title={t('addRecipe')} onPress={() => router.push('/add')} />}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  search: { flex: 1, paddingVertical: 10, fontSize: 15 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: GRID_GAP },
  tile: { minHeight: 60, borderWidth: 1, borderRadius: 14, paddingHorizontal: 6, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tileLabel: { fontSize: 13, fontWeight: '600', lineHeight: 17, textAlign: 'center' },
  tileCount: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  noticeText: { flex: 1, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  rowMeta: { fontSize: 12 },
  heart: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 1, borderRadius: 22, padding: 24, alignItems: 'center', gap: 15, minHeight: 240, justifyContent: 'center' },
  emptyArt: { fontSize: 48 },
  emptyText: { textAlign: 'center', fontSize: 16, lineHeight: 24, maxWidth: 270 },
});
