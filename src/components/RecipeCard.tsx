import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import type { Recipe } from '../domain/recipe';
import { categoryLabels } from '../i18n/resources';
import { usePreferences } from '../stores/preferences';
import { useManaTheme } from '../theme/useManaTheme';
import { RecipeImage } from './RecipeImage';

/** Photo card used in the "Recently added" shelf. */
export function RecipeCard({ recipe, onPress, compact = false }: { recipe: Recipe; onPress: () => void; compact?: boolean }) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const label = categoryLabels[language][recipe.category];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, {
      width: compact ? 200 : '100%', backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.84 : 1,
    }]}>
      <View>
        <RecipeImage uri={recipe.imageUri} style={styles.art} />
        {recipe.favorite && <View style={[styles.heart, { backgroundColor: colors.surface }]}><Text style={{ color: colors.accentText, fontSize: 14 }}>{'♥︎'}</Text></View>}
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.category, { color: colors.muted }]}>{label}</Text>
        <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {recipe.totalTime ? `${recipe.totalTime} ${t('minuteAbbrev')}` : recipe.servings ? `${recipe.servings} ${t('servingsAbbrev')}` : t('recipeCardFallback')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  art: { width: '100%', height: 120 },
  heart: { position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 14, paddingVertical: 12 },
  category: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20, minHeight: 40 },
  meta: { fontSize: 12, marginTop: 6 },
});
