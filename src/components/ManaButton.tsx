import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Text } from './Typography';
import { useManaTheme } from '../theme/useManaTheme';

type Props = {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function ManaButton({ title, onPress, secondary = false, disabled = false, loading = false, icon }: Props) {
  const { colors } = useManaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, {
        backgroundColor: secondary ? colors.primarySoft : colors.primary,
        opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
      }]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.primaryText : colors.onPrimary} /> : icon}
      <Text style={[styles.label, { color: secondary ? colors.primaryText : colors.onPrimary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});
