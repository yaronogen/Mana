import { Children, forwardRef, isValidElement, type ReactNode } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextInputProps, type TextProps } from 'react-native';
import { textDirectionOf } from '../i18n/textDirection';
import { usePreferences } from '../stores/preferences';

// App-wide Text and TextInput whose writing direction follows their own content: Hebrew reads and aligns
// right-to-left and every other script left-to-right, whatever the app language. Text without letters
// (numbers, symbols) follows the app language. Alignment stays "natural", which follows the writing
// direction (Android already aligns by content; `writingDirection` makes iOS do the same). Explicit
// textAlign left/right is avoided on purpose, because iOS swaps left and right inside right-to-left
// layouts. An explicit textAlign or writingDirection in `style` still wins.

const direction = StyleSheet.create({ rtl: { writingDirection: 'rtl' }, ltr: { writingDirection: 'ltr' } });

/** The plain text inside Text children, including nested Text, for direction detection. */
function plainText(children: ReactNode, depth = 0): string {
  if (depth > 3) return '';
  return Children.toArray(children).map((child) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return plainText(child.props.children, depth + 1);
    return '';
  }).join('');
}

function useDirection(text: string) {
  const appRtl = usePreferences((state) => state.language === 'he');
  const detected = textDirectionOf(text);
  return detected ? direction[detected] : appRtl ? direction.rtl : direction.ltr;
}

export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  const textDirection = useDirection(plainText(props.children));
  return <NativeText ref={ref} {...props} style={[textDirection, style]} />;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  // While empty, the placeholder (in the app language) decides; once typing starts, the typed text does.
  const textDirection = useDirection(props.value || props.defaultValue || props.placeholder || '');
  return <NativeTextInput ref={ref} {...props} style={[textDirection, style]} />;
});
