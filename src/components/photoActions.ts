import type { TFunction } from 'i18next';
import { Alert, Platform } from 'react-native';

export type PhotoAction = 'camera' | 'library' | 'remove';

/** Asks how to change a recipe photo. Web has no camera or action sheet, so it goes straight to the library. */
export function choosePhotoAction(t: TFunction, hasPhoto: boolean): Promise<PhotoAction | null> {
  if (Platform.OS === 'web') return Promise.resolve('library');
  return new Promise((resolve) => {
    Alert.alert(hasPhoto ? t('changePhoto') : t('addPhoto'), undefined, [
      { text: t('takePhoto'), onPress: () => resolve('camera') },
      { text: t('choosePhoto'), onPress: () => resolve('library') },
      ...(hasPhoto ? [{ text: t('removePhoto'), style: 'destructive' as const, onPress: () => resolve('remove') }] : []),
      { text: t('cancel'), style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}
