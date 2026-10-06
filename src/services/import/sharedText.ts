/**
 * What to import from something shared into Mana from another app: the link when a link was shared
 * (Instagram, a recipe site; apps often add a short "Look at this" line), or the whole text when
 * someone shared a written recipe, even one that ends with its source link.
 */
export function sharedImportText(share: { text?: string | null; webUrl?: string | null }): string | null {
  const text = share.text?.trim() ?? '';
  const withoutLink = share.webUrl ? text.split(share.webUrl).join('').trim() : text;
  if (!share.webUrl || withoutLink.length > 80) return text || null;
  return share.webUrl;
}
