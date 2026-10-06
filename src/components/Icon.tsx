import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { usePreferences } from '../stores/preferences';

type SymbolName = SymbolViewProps['name'];

// One place for the outline icons used across the design: SF Symbols on iOS, Material Symbols elsewhere.
const icons = {
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  link: { ios: 'link', android: 'link', web: 'link' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  forward: { ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronBack: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  photo: { ios: 'photo', android: 'image', web: 'image' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  grid: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  heart: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
  heartFill: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  globe: { ios: 'globe', android: 'language', web: 'language' },
  doc: { ios: 'doc.text', android: 'description', web: 'description' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  translate: { ios: 'globe', android: 'translate', web: 'translate' },
  book: { ios: 'book', android: 'menu_book', web: 'menu_book' },
  sun: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  moon: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  system: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  restaurant: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  asterisk: { ios: 'asterisk', android: 'asterisk', web: 'asterisk' },
  dice: { ios: 'dice', android: 'casino', web: 'casino' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  alert: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  person: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
  drag: { ios: 'line.3.horizontal', android: 'drag_indicator', web: 'drag_indicator' },
  cart: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  cartAdd: { ios: 'cart.badge.plus', android: 'add_shopping_cart', web: 'add_shopping_cart' },
  checkSquare: { ios: 'checkmark.square.fill', android: 'check_box', web: 'check_box' },
  square: { ios: 'square', android: 'check_box_outline_blank', web: 'check_box_outline_blank' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof icons;

// Direction-sensitive icons swap with their mirror in right-to-left (Hebrew) layouts.
const mirrored: Partial<Record<IconName, IconName>> = { back: 'forward', forward: 'back', chevron: 'chevronBack', chevronBack: 'chevron' };

export function Icon({ name, color, size = 20 }: { name: IconName; color: string; size?: number }) {
  const rtl = usePreferences((state) => state.language === 'he');
  const resolved = rtl ? mirrored[name] ?? name : name;
  return <SymbolView name={icons[resolved]} tintColor={color} size={size} accessible={false} importantForAccessibility="no" accessibilityElementsHidden />;
}
