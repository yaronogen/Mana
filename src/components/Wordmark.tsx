import { StyleSheet, View } from 'react-native';
import { useManaTheme } from '../theme/useManaTheme';
import { Text } from './Typography';

/**
 * The "Mana" wordmark with the brand-orange dot over the "n" (as in the icon), which hints at the stress: Ma-NA.
 * Always left-to-right, at the start edge, in every app language.
 */
export function Wordmark({ size }: { size: number }) {
  const { colors } = useManaTheme();
  const text = { fontSize: size, lineHeight: Math.round(size * 1.15), fontWeight: '800' as const, letterSpacing: -size * 0.045, color: colors.primaryText, writingDirection: 'ltr' as const };
  const dot = Math.round(size * 0.21);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Mana" style={styles.row}>
      <Text style={text}>Ma</Text>
      <View>
        <Text style={text}>n</Text>
        {/* Sits just above the x-height of the "n"; positions scale with the font size. */}
        <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2, top: Math.round(size * 0.08), backgroundColor: colors.accent, marginLeft: -dot / 2 + text.letterSpacing / 2 }]} />
      </View>
      <Text style={text}>a</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', direction: 'ltr', alignSelf: 'flex-start' },
  dot: { position: 'absolute', left: '50%' },
});
