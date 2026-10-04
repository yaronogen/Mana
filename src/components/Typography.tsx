import { forwardRef } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextInputProps, type TextProps } from 'react-native';
import { usePreferences } from '../stores/preferences';

// App-wide Text and TextInput that follow the app language's writing direction.
// They set `writingDirection` and leave alignment "natural": natural alignment follows the writing
// direction (Hebrew → right). Explicit textAlign left/right is avoided on purpose, because iOS swaps
// left and right inside right-to-left layouts. An explicit textAlign in `style` (e.g. 'center') still wins.

const direction = StyleSheet.create({ rtl: { writingDirection: 'rtl' }, ltr: { writingDirection: 'ltr' } });

export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  const rtl = usePreferences((state) => state.language === 'he');
  return <NativeText ref={ref} {...props} style={[rtl ? direction.rtl : direction.ltr, style]} />;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const rtl = usePreferences((state) => state.language === 'he');
  return <NativeTextInput ref={ref} {...props} style={[rtl ? direction.rtl : direction.ltr, style]} />;
});
