import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getNutrition, getRecipe } from '../../data/database';
import { isNutritionFresh, roundKcal } from '../../domain/nutrition';
import { isLocalRecipeImage } from '../images/recipeImages';
import { buildCookbookHtml, paperFor, type CookbookOptions } from './cookbookHtml';

const imageType = (uri: string) => /\.png$/i.test(uri) ? 'image/png' : /\.webp$/i.test(uri) ? 'image/webp' : 'image/jpeg';

/** Recipe photos stored on the phone, embedded in the PDF (the print renderer cannot read app files by path). */
async function embeddedImages(recipes: CookbookOptions['recipes']): Promise<Record<string, string>> {
  const images: Record<string, string> = {};
  for (const recipe of recipes) {
    const uri = recipe.imageUri;
    if (!uri) continue;
    if (/^https:\/\//i.test(uri)) { images[recipe.id] = uri; continue; }
    if (!isLocalRecipeImage(uri)) continue;
    try {
      images[recipe.id] = `data:${imageType(uri)};base64,${await new File(uri).base64()}`;
    } catch {
      // A missing photo just leaves the recipe without one.
    }
  }
  return images;
}

/** Saved calorie estimates that still match each recipe (the cookbook shows recipes in the app language, same ids). */
async function freshKcal(recipes: CookbookOptions['recipes']): Promise<Record<string, number>> {
  const kcal: Record<string, number> = {};
  for (const recipe of recipes) {
    const stored = await getRecipe(recipe.id).catch(() => null);
    const estimate = stored ? await getNutrition(recipe.id).catch(() => null) : null;
    if (stored && isNutritionFresh(stored, estimate) && estimate.kcalPerServing !== null) kcal[recipe.id] = roundKcal(estimate.kcalPerServing);
  }
  return kcal;
}

/** Builds the cookbook PDF on the phone and returns its file URI, named after the cookbook. */
export async function createCookbookPdf(options: Omit<CookbookOptions, 'images' | 'kcal'>): Promise<string> {
  const html = buildCookbookHtml({ ...options, images: await embeddedImages(options.recipes), kcal: await freshKcal(options.recipes) });
  const paper = paperFor(options.unitSystem);
  const { uri } = await Print.printToFileAsync({ html, width: paper.width, height: paper.height });
  const name = `${options.title.replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 60) || 'Mana'}.pdf`;
  try {
    const target = new File(Paths.cache, name);
    if (target.exists) target.delete();
    await new File(uri).copy(target);
    return target.uri;
  } catch {
    return uri;
  }
}

/**
 * Opens the share sheet with the PDF: Gmail, Mail or Outlook start a new email with it attached; Files,
 * Print and messaging apps work too. 'unavailable' when the platform cannot share files.
 */
export async function sharePdf(pdfUri: string, title: string): Promise<'shared' | 'unavailable'> {
  if (!await Sharing.isAvailableAsync()) return 'unavailable';
  await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
  return 'shared';
}
