import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { deleteRecipe, saveRecipe } from '../../data/database';
import type { Recipe } from '../../domain/recipe';

// Recipe photos live next to the SQLite database in the app's document directory, so they work
// offline and are removed with the app. On web (development only) URIs are stored as-is.

const IMAGE_FOLDER = 'recipe-images';

function imageDirectory(): Directory {
  const directory = new Directory(Paths.document, IMAGE_FOLDER);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

export function isLocalRecipeImage(uri: string | null): boolean {
  return Boolean(uri && Platform.OS !== 'web' && uri.includes(`/${IMAGE_FOLDER}/`));
}

function extensionFor(uri: string): string {
  const match = uri.split('?')[0].match(/\.(jpe?g|png|webp|heic|gif)$/i);
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

/**
 * Copies a picked photo or downloads a web photo into Mana's image folder and returns the local URI.
 * A failed download keeps the remote URL so the recipe still shows its photo while online.
 */
export async function persistRecipeImage(uri: string | null, recipeId: string): Promise<string | null> {
  if (!uri || Platform.OS === 'web' || isLocalRecipeImage(uri)) return uri;
  const destination = new File(imageDirectory(), `${recipeId}-${Date.now().toString(36)}.${extensionFor(uri)}`);
  try {
    if (/^https?:\/\//i.test(uri)) {
      const downloaded = await File.downloadFileAsync(uri, destination, { idempotent: true });
      return downloaded.uri;
    }
    await new File(uri).copy(destination);
    return destination.uri;
  } catch {
    return /^https?:\/\//i.test(uri) ? uri : null;
  }
}

export function deleteRecipeImage(uri: string | null): void {
  if (!uri || !isLocalRecipeImage(uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing file is already gone; nothing else to clean up.
  }
}

export type ImageSource = 'camera' | 'library';

/** Opens the camera or photo library. Returns the picked image URI, or null when cancelled/denied. */
export async function pickRecipeImage(source: ImageSource): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    const result = await ImagePicker.launchCameraAsync(options);
    return result.canceled ? null : result.assets[0]?.uri ?? null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}

export const cameraAvailable = Platform.OS !== 'web';

/** Saves a recipe, storing its photo locally first and cleaning up a replaced photo afterwards. */
export async function saveRecipeWithImage(recipe: Recipe, previousImageUri: string | null): Promise<Recipe> {
  const imageUri = await persistRecipeImage(recipe.imageUri, recipe.id);
  const saved = { ...recipe, imageUri };
  await saveRecipe(saved);
  if (previousImageUri && previousImageUri !== imageUri) deleteRecipeImage(previousImageUri);
  return saved;
}

export async function deleteRecipeWithImage(recipe: Recipe): Promise<void> {
  await deleteRecipe(recipe.id);
  deleteRecipeImage(recipe.imageUri);
}
