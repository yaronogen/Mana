import { usePreferences } from '@/stores/preferences';
import { useManaTheme } from '@/theme/useManaTheme';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const rtl = usePreferences((state) => state.language === 'he');

  return (
    <Tabs
      // Back from a recipe returns to the tab it was opened from.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { direction: rtl ? 'rtl' : 'ltr', backgroundColor: colors.surface, borderTopColor: colors.line, height: 78, paddingTop: 9, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: t('recipes'),
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' }} tintColor={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('favorites'),
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }} tintColor={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="groceries"
        options={{
          title: t('groceries'),
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' }} tintColor={color} size={22} />,
        }}
      />
      {/* Recipes open inside the tabs so the tab bar stays visible; the route has no tab button of its own. */}
      <Tabs.Screen name="recipe/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }} tintColor={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
