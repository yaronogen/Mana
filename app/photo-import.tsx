import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { confirmAction } from '../src/components/confirmDuplicate';
import { avoidedLabels } from '../src/components/HeadsUp';
import { Icon } from '../src/components/Icon';
import { ManaButton } from '../src/components/ManaButton';
import { PreparingRecipe } from '../src/components/PreparingRecipe';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Typography';
import { MAX_RECIPE_PHOTOS, parseRecipePhotos, type RecipePhoto } from '../src/services/ai/photoParser';
import { RecipeImportError } from '../src/services/ai/recipeParser';
import { fetchImportUsage, type ImportUsage } from '../src/services/billing/plan';
import { useImportDraft } from '../src/stores/importDraft';
import { usePreferences } from '../src/stores/preferences';
import { useProfile } from '../src/stores/profile';
import { useManaTheme } from '../src/theme/useManaTheme';

/** A recipe from 1–3 photos of a handwritten, typed or printed recipe, read by the recipe service. */
export default function PhotoImportScreen() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const language = usePreferences((state) => state.language);
  const setDraft = useImportDraft((state) => state.setDraft);
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<ImportUsage | null>(null);
  const importMutation = useMutation({ mutationFn: (selected: RecipePhoto[]) => parseRecipePhotos(selected, language) });
  useFocusEffect(useCallback(() => {
    let active = true;
    void fetchImportUsage().then((result) => { if (active) setUsage(result); });
    return () => { active = false; };
  }, []));

  const remaining = MAX_RECIPE_PHOTOS - photos.length;
  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    setError(null);
    setPhotos((current) => [...current, ...assets.map((asset) => ({ uri: asset.uri, width: asset.width, height: asset.height }))].slice(0, MAX_RECIPE_PHOTOS));
  };
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) addAssets(result.assets);
  };
  const choosePhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: true, selectionLimit: remaining, orderedSelection: true });
    if (!result.canceled) addAssets(result.assets);
  };

  const create = async () => {
    setError(null);
    try {
      const { recipe, clarifications } = await importMutation.mutateAsync(photos);
      const { allergens, avoided } = avoidedLabels(recipe, useProfile.getState().profile, t);
      if (allergens.length && !await confirmAction(t('importAllergenTitle'), t('importAllergenBody', { items: allergens.join(', ') }), t('cancel'), t('reviewAnyway'))) return;
      if (!allergens.length && avoided.length && !await confirmAction(t('importHeadsUpTitle'), t('importHeadsUpBody', { items: avoided.join(', ') }), t('cancel'), t('reviewAnyway'))) return;
      setDraft(recipe, clarifications);
      router.push('/import-review');
    } catch (caught) {
      const code = caught instanceof RecipeImportError ? caught.code : 'invalid_response';
      setError(code === 'not_configured' ? t('importUnavailable')
        : code === 'no_recipe' ? t('photoNoRecipe')
          : code === 'too_long' ? t('photoTooLarge')
            : code === 'rate_limited' ? t('importLimit')
              : code === 'network' ? t('networkImportFailed') : t('importFailed'));
    }
  };

  if (importMutation.isPending) return <PreparingRecipe fromLink={false} fromPhotos />;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('photoScreenTitle')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('photoHint')}</Text>
      </View>

      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={`${photo.uri}-${index}`} style={[styles.tile, { borderColor: colors.line }]}>
            <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
            <View style={[styles.badge, { backgroundColor: colors.primary }]}><Text style={[styles.badgeText, { color: colors.onPrimary }]}>{index + 1}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('removePhoto')} hitSlop={6} onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
              style={[styles.remove, { backgroundColor: colors.surface }]}>
              <Icon name="close" color={colors.accentText} size={16} />
            </Pressable>
          </View>
        ))}
        {remaining > 0 && <View style={[styles.tile, styles.addTile, { borderColor: colors.line, backgroundColor: colors.surface }]}>
          {Platform.OS !== 'web' && <Pressable accessibilityRole="button" onPress={() => void takePhoto()} style={styles.addButton}>
            <Icon name="camera" color={colors.primaryText} size={22} />
            <Text style={[styles.addLabel, { color: colors.primaryText }]}>{t('takePhoto')}</Text>
          </Pressable>}
          <Pressable accessibilityRole="button" onPress={() => void choosePhotos()} style={styles.addButton}>
            <Icon name="photo" color={colors.primaryText} size={22} />
            <Text style={[styles.addLabel, { color: colors.primaryText }]}>{t('choosePhoto')}</Text>
          </Pressable>
        </View>}
      </View>

      <View style={styles.meta}>
        <Text style={[styles.counter, { color: colors.muted }]}>{t('photoCount', { n: photos.length, max: MAX_RECIPE_PHOTOS })}</Text>
        {usage && <Text style={[styles.counter, { color: usage.used >= usage.limit ? colors.accentText : colors.muted }]}>{t('importsLeft', { left: Math.max(0, usage.limit - usage.used), limit: usage.limit })}</Text>}
      </View>

      {error && <View style={[styles.note, { backgroundColor: colors.warningBg }]}><Text style={[styles.noteText, { color: colors.warningText }]}>{error}</Text></View>}

      <View style={{ flex: 1 }} />
      <ManaButton title={t('createRecipe')} onPress={() => void create()} disabled={!photos.length} />
      <Pressable onPress={() => router.back()} style={styles.cancel}><Text style={[styles.cancelText, { color: colors.muted }]}>{t('cancel')}</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 14 }, header: { gap: 8, marginBottom: 6 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 }, body: { fontSize: 15, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, aspectRatio: 3 / 4, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, start: 8, minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 13, fontWeight: '800' },
  remove: { position: 'absolute', top: 8, end: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addTile: { borderStyle: 'dashed', alignItems: 'stretch', justifyContent: 'center', gap: 6, padding: 10 },
  addButton: { minHeight: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, counter: { fontSize: 12 },
  note: { borderRadius: 16, padding: 14 }, noteText: { fontSize: 13, lineHeight: 19 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancelText: { fontSize: 14, fontWeight: '600' },
});
