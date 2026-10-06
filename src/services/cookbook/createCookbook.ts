import { File, Paths } from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

/** Builds the cookbook PDF on the phone and returns its file URI, named after the cookbook. */
export async function createCookbookPdf(options: Omit<CookbookOptions, 'images'>): Promise<string> {
  const html = buildCookbookHtml({ ...options, images: await embeddedImages(options.recipes) });
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

export type CookbookDelivery = 'sent' | 'saved' | 'cancelled' | 'shared' | 'unavailable';

/**
 * Opens the phone's mail app with the PDF attached and the address filled in; the user sends it from there.
 * Without a mail account it opens the share sheet instead (save to Files, AirDrop, print, other apps).
 */
export async function emailCookbook(pdfUri: string, email: string, subject: string, body: string): Promise<CookbookDelivery> {
  if (await MailComposer.isAvailableAsync()) {
    const result = await MailComposer.composeAsync({ recipients: email.trim() ? [email.trim()] : [], subject, body, attachments: [pdfUri] });
    return result.status === 'saved' || result.status === 'cancelled' ? result.status : 'sent';
  }
  return sharePdf(pdfUri, subject);
}

export async function sharePdf(pdfUri: string, title: string): Promise<CookbookDelivery> {
  if (!await Sharing.isAvailableAsync()) return 'unavailable';
  await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
  return 'shared';
}

export const isEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

/** False when the phone has no mail account set up (the PDF is then shared instead). */
export const canEmail = () => MailComposer.isAvailableAsync();
