import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { useManaTheme } from '../theme/useManaTheme';
import { Icon } from './Icon';

/** The dish photo, or the Mana placeholder when there is no photo (or it can't be loaded). */
export function RecipeImage({ uri, style, glyphSize = 40 }: { uri: string | null; style: StyleProp<ImageStyle>; glyphSize?: number }) {
  const { colors } = useManaTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (uri && !failed) return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
  return <View style={[style as object, styles.placeholder, { backgroundColor: colors.primarySoft }]}>
    <Icon name="asterisk" color={colors.leaf} size={glyphSize} />
  </View>;
}

const styles = StyleSheet.create({ placeholder: { alignItems: 'center', justifyContent: 'center' } });
