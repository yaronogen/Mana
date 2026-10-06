import { describe, expect, it } from 'vitest';
import { sharedImportText } from './sharedText';

describe('text shared into Mana', () => {
  it('imports the link from a shared Instagram reel or web page', () => {
    expect(sharedImportText({ text: 'https://www.instagram.com/reel/C9xYz12AbCd/?igsh=MWQ1', webUrl: 'https://www.instagram.com/reel/C9xYz12AbCd/?igsh=MWQ1' }))
      .toBe('https://www.instagram.com/reel/C9xYz12AbCd/?igsh=MWQ1');
    expect(sharedImportText({ text: 'Look at this: https://www.chefkoch.de/rezepte/123', webUrl: 'https://www.chefkoch.de/rezepte/123' })).toBe('https://www.chefkoch.de/rezepte/123');
  });

  it('imports a whole shared recipe text, even when it contains a link', () => {
    const recipe = `שקשוקה\nמרכיבים:\n4 ביצים\n400 גרם עגבניות\n1 בצל\n2 שיני שום\nאופן ההכנה:\nמטגנים את הבצל, מוסיפים עגבניות ומבשלים 10 דקות. שוברים את הביצים ומכסים.\nמקור: https://example.com/shakshuka`;
    expect(sharedImportText({ text: recipe, webUrl: 'https://example.com/shakshuka' })).toBe(recipe);
  });

  it('ignores empty shares', () => {
    expect(sharedImportText({ text: '   ', webUrl: null })).toBeNull();
    expect(sharedImportText({})).toBeNull();
  });
});
