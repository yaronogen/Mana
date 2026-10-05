import { describe, expect, it } from 'vitest';
import { textDirectionOf } from './textDirection';

describe('textDirectionOf', () => {
  it('reads Hebrew right-to-left and other scripts left-to-right, from the first letter', () => {
    expect(textDirectionOf('שקשוקה')).toBe('rtl');
    expect(textDirectionOf('200 גרם קמח')).toBe('rtl');
    expect(textDirectionOf('Linsensuppe mit Zitrone')).toBe('ltr');
    expect(textDirectionOf('2 cups עגבניות')).toBe('ltr');
  });

  it('leaves text without letters to the app language', () => {
    expect(textDirectionOf('350° · 25 · ½')).toBeNull();
    expect(textDirectionOf('')).toBeNull();
  });
});
