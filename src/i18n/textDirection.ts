const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
const STRONG_CHAR = /[\p{L}]/u;

/**
 * Direction of a piece of text from its first letter: Hebrew (or Arabic) reads right-to-left, any
 * other script left-to-right. Text without letters (numbers, symbols) returns null: use the app language.
 */
export function textDirectionOf(text: string): 'rtl' | 'ltr' | null {
  const first = text.match(STRONG_CHAR)?.[0];
  if (!first) return null;
  return RTL_CHAR.test(first) ? 'rtl' : 'ltr';
}
