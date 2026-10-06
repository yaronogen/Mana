import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { formatIngredient } from '../domain/ingredientText';
import type { Recipe } from '../domain/recipe';
import { displayIngredient } from '../domain/scaling';
import { resources } from '../i18n/resources';
import { usePreferences } from '../stores/preferences';
import { useManaTheme } from '../theme/useManaTheme';
import { Icon } from './Icon';
import { ManaButton } from './ManaButton';
import { Text } from './Typography';

/** Bottom sheet to pick which of a recipe's ingredients go on the shopping list, in the amounts for the chosen servings. */
export function AddToGroceriesSheet({ recipe, servingsFactor = 1, visible, onClose, onAdd }: {
  recipe: Recipe; servingsFactor?: number; visible: boolean; onClose: () => void; onAdd: (ingredientIds: string[]) => Promise<void>;
}) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const rtl = usePreferences((state) => state.language === 'he');
  const unitSystem = usePreferences((state) => state.unitSystem);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  // Start with nothing ticked each time the sheet opens: you pick what you need to buy.
  useEffect(() => { if (visible) setSelected(new Set()); }, [visible, recipe.ingredients]);

  const allSelected = selected.size === recipe.ingredients.length;
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const add = async () => {
    setBusy(true);
    try { await onAdd(recipe.ingredients.filter((item) => selected.has(item.id)).map((item) => item.id)); } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('cancel')} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background, direction: rtl ? 'rtl' : 'ltr' }]}>
          <View style={[styles.grabber, { backgroundColor: colors.line }]} />
          <Text style={[styles.title, { color: colors.text }]}>{t('addToShoppingList')}</Text>
          <View style={styles.headRow}>
            <Text style={[styles.hint, { color: colors.muted }]}>{t('addToListHint')}</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setSelected(allSelected ? new Set() : new Set(recipe.ingredients.map((item) => item.id)))}>
              <Text style={[styles.toggleAll, { color: colors.primaryText }]}>{allSelected ? t('selectNone') : t('selectAll')}</Text>
            </Pressable>
          </View>
          <ScrollView style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {recipe.ingredients.map((ingredient, index) => {
              const checked = selected.has(ingredient.id);
              return <Pressable key={ingredient.id} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => toggle(ingredient.id)}
                style={[styles.row, index < recipe.ingredients.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                <Icon name={checked ? 'checkSquare' : 'square'} color={checked ? colors.primaryText : colors.muted} size={22} />
                <Text style={[styles.rowText, { color: checked ? colors.text : colors.muted }]}>{formatIngredient(displayIngredient(ingredient, { factor: servingsFactor, unitSystem, language: recipe.outputLanguage }).ingredient, resources[recipe.outputLanguage].optional)}</Text>
              </Pressable>;
            })}
          </ScrollView>
          <ManaButton title={t('addItems', { n: selected.size })} onPress={() => void add()} loading={busy} disabled={selected.size === 0}
            icon={<Icon name="cartAdd" color={colors.onPrimary} size={18} />} />
          <Pressable onPress={onClose} style={styles.cancel}><Text style={[styles.cancelText, { color: colors.muted }]}>{t('cancel')}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34, gap: 14 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: -8 },
  title: { fontSize: 22, fontWeight: '700' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -6 },
  hint: { flex: 1, fontSize: 13, lineHeight: 19 },
  toggleAll: { fontSize: 13, fontWeight: '700' },
  list: { flexGrow: 0, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowText: { flex: 1, fontSize: 15, lineHeight: 22 },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 44 }, cancelText: { fontSize: 14, fontWeight: '600' },
});
