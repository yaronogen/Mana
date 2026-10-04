import { isFetchableUrl } from '../../../src/services/import/webRecipe.ts';

export class PageFetchError extends Error {}

const MAX_REDIRECTS = 4;
const MAX_BYTES = 3_000_000;
const TIMEOUT_MS = 10_000;

async function readCapped(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  // Recipe structured data sits in <head> or early in <body>; a truncated tail is acceptable.
  await reader.cancel().catch(() => undefined);
  const bytes = new Uint8Array(Math.min(size, MAX_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, Math.min(chunk.byteLength, bytes.byteLength - offset));
    bytes.set(part, offset);
    offset += part.byteLength;
    if (offset >= bytes.byteLength) break;
  }
  return bytes;
}

function decode(bytes: Uint8Array, contentType: string): string {
  const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.trim().replace(/["']/g, '') ?? 'utf-8';
  try { return new TextDecoder(charset).decode(bytes); } catch { return new TextDecoder('utf-8').decode(bytes); }
}

/** Downloads one public HTML page for recipe extraction. The page is never logged or stored. */
export async function fetchRecipePage(startUrl: string): Promise<{ html: string; finalUrl: string }> {
  let url = startUrl;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isFetchableUrl(url)) throw new PageFetchError('url_not_allowed');
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual', signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ManaRecipeImporter/1.0)', Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' },
      });
    } catch {
      throw new PageFetchError('fetch_failed');
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => undefined);
      if (!location) throw new PageFetchError('fetch_failed');
      url = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new PageFetchError('fetch_failed');
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      await response.body?.cancel().catch(() => undefined);
      throw new PageFetchError('not_html');
    }
    return { html: decode(await readCapped(response), contentType), finalUrl: url };
  }
  throw new PageFetchError('too_many_redirects');
}
