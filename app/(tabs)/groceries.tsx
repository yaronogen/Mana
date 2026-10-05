import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { Icon } from '../../src/components/Icon';
import { Screen } from '../../src/components/Screen';
import { Text, TextInput } from '../../src/components/Typography';
import { addGroceries, clearCheckedGroceries, deleteGrocery, getGroceries, setGroceryChecked } from '../../src/data/database';
import { formatGroceryShare, groupGroceries, manualGroceryItem, type GroceryItem } from '../../src/domain/groceries';
import { useManaTheme } from '../../src/theme/useManaTheme';

export default function GroceriesScreen() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [draft, setDraft] = useState('');

  const reload = useCallback(async () => { setItems(await getGroceries()); }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    void getGroceries().then((result) => { if (active) setItems(result); }).catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, []));

  const addDraft = async () => {
    const item = manualGroceryItem(draft);
    if (!item) return;
    setDraft('');
    await addGroceries([item]);
    await reload();
  };
  const toggle = async (item: GroceryItem) => {
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry));
    await setGroceryChecked(item.id, !item.checked);
  };
  const remove = async (item: GroceryItem) => {
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    await deleteGrocery(item.id);
  };
  const clearChecked = async () => { await clearCheckedGroceries(); await reload(); };
  const share = async () => { await Share.share({ message: formatGroceryShare(items, { title: t('shoppingList'), myItems: t('myItems') }) }); };

  const open = items.filter((item) => !item.checked).length;
  const hasChecked = items.length > open;
  const groups = groupGroceries(items);

  return (
    <Screen>
      <AppHeader />
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t('shoppingList')}</Text>
          {items.length > 0 && <Text style={[styles.subtitle, { color: colors.muted }]}>{t('groceriesLeft', { n: open })}</Text>}
        </View>
        {open > 0 && <Pressable accessibilityRole="button" accessibilityLabel={t('share')} onPress={() => void share()} hitSlop={8} style={styles.iconButton}>
          <Icon name="share" color={colors.text} size={20} />
        </Pressable>}
      </View>

      <View style={[styles.addWrap, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Icon name="plus" color={colors.muted} size={17} />
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => void addDraft()} placeholder={t('groceryPlaceholder')} placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]} returnKeyType="done" submitBehavior="submit" maxLength={200} />
        {!!draft.trim() && <Pressable accessibilityRole="button" onPress={() => void addDraft()} hitSlop={8}>
          <Text style={[styles.addText, { color: colors.primaryText }]}>{t('add')}</Text>
        </Pressable>}
      </View>

      {groups.length ? groups.map((group) => (
        <View key={group.recipeId ?? 'mine'} style={styles.group}>
          {group.recipeId && group.recipeTitle ? (
            <Pressable accessibilityRole="link" onPress={() => router.push(`/recipe/${group.recipeId}`)} hitSlop={6} style={styles.groupHead}>
              <Icon name="restaurant" color={colors.primaryText} size={14} />
              <Text numberOfLines={1} style={[styles.groupTitle, { color: colors.primaryText }]}>{group.recipeTitle}</Text>
            </Pressable>
          ) : <Text style={[styles.groupTitle, { color: colors.muted }]}>{t('myItems')}</Text>}
          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {group.items.map((item, index) => (
              <View key={item.id} style={[styles.row, index < group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.checked }} onPress={() => void toggle(item)} style={styles.rowMain}>
                  <Icon name={item.checked ? 'checkSquare' : 'square'} color={item.checked ? colors.primaryText : colors.muted} size={22} />
                  <Text style={[styles.rowText, { color: item.checked ? colors.muted : colors.text }, item.checked && styles.done]}>{item.text}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t('remove')} onPress={() => void remove(item)} hitSlop={8} style={styles.removeButton}>
                  <Icon name="close" color={colors.muted} size={15} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )) : (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Icon name="cart" color={colors.leaf} size={48} />
          <Text style={[styles.emptyText, { color: colors.text }]}>{t('emptyGroceries')}</Text>
        </View>
      )}

      {hasChecked && <Pressable accessibilityRole="button" onPress={() => void clearChecked()} style={[styles.clear, { borderColor: colors.line }]}>
        <Icon name="trash" color={colors.accentText} size={16} />
        <Text style={[styles.clearText, { color: colors.accentText }]}>{t('clearChecked')}</Text>
      </Pressable>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, fontWeight: '500' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addWrap: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, paddingVertical: 10, fontSize: 15 },
  addText: { fontSize: 14, fontWeight: '700' },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: { flexShrink: 1, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  list: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowText: { flex: 1, fontSize: 15, lineHeight: 22 },
  done: { textDecorationLine: 'line-through' },
  removeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 1, borderRadius: 22, padding: 24, alignItems: 'center', gap: 15, minHeight: 220, justifyContent: 'center' },
  emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 23, maxWidth: 280 },
  clear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderRadius: 16 },
  clearText: { fontSize: 14, fontWeight: '700' },
});
