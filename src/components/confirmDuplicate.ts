import { Alert, Platform } from 'react-native';

/** Two-button confirmation. Native uses the system alert; web (development) uses the browser's confirm dialog. */
export function confirmAction(title: string, message: string, cancel: string, confirm: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirm, onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function confirmDuplicate(title: string, message: string, cancel: string, saveAnyway: string): Promise<boolean> {
  return confirmAction(title, message, cancel, saveAnyway);
}
