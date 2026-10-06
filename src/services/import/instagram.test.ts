import { describe, expect, it } from 'vitest';
import { extractInstagramCaption, formatInstagramForModel, instagramEmbedUrl, instagramPostCode, isFetchableUrl } from './webRecipe';

// Same structure as Instagram's public embed page (/p/<code>/embed/captioned/).
const embedPage = (author: string, captionHtml: string) => `<html><body><div class="Embed">
<img class="EmbeddedMediaImage" alt="Instagram post shared by &#064;${author}" src="https://scontent.cdninstagram.com/v/photo.jpg?stp=dst-jpg&amp;_nc_cat=104">
<div class="Caption"><a class="CaptionUsername" href="https://www.instagram.com/${author}/?utm_source=ig_embed" target="_blank">${author}</a><br /><br />${captionHtml}<div class="CaptionComments"><a class="CaptionCommentsExpand" href="#">View all 12 comments</a></div></div>
<div class="Footer"><a class="CommentInput" href="#">Add a comment...</a></div></div></body></html>`;

describe('Instagram captions', () => {
  it('recognises post and reel links, ignoring tracking parameters', () => {
    expect(instagramPostCode('https://www.instagram.com/reel/C9xYz12AbCd/?igsh=MWQ1ZGUxMzBkMA==')).toBe('C9xYz12AbCd');
    expect(instagramPostCode('https://instagram.com/p/BsOGulcndj-/')).toBe('BsOGulcndj-');
    expect(instagramPostCode('https://www.instagram.com/some.cook/reel/C9xYz12AbCd')).toBe('C9xYz12AbCd');
    expect(instagramPostCode('https://www.instagram.com/some.cook/')).toBeNull();
    expect(instagramPostCode('https://www.chefkoch.de/rezepte/123/p/abc.html')).toBeNull();
    expect(isFetchableUrl(instagramEmbedUrl('C9xYz12AbCd'))).toBe(true);
  });

  it('reads a Hebrew caption with its line breaks, author and photo from the embed page', () => {
    const html = embedPage('shira.bakes', 'עוגת שוקולד בחושה 🍫<br /><br />מרכיבים:<br />200 גרם שוקולד מריר<br />3 ביצים<br />½ כוס סוכר<br /><br />אופים 25 דקות ב-180°C<br /><a href="/explore/tags/baking/">#baking</a>');
    const result = extractInstagramCaption(html);
    expect(result).toEqual({
      author: 'shira.bakes',
      imageUrl: 'https://scontent.cdninstagram.com/v/photo.jpg?stp=dst-jpg&_nc_cat=104',
      caption: 'עוגת שוקולד בחושה 🍫\nמרכיבים:\n200 גרם שוקולד מריר\n3 ביצים\n½ כוס סוכר\nאופים 25 דקות ב-180°C\n#baking',
    });
    expect(formatInstagramForModel(result!)).toBe(`Instagram post by @shira.bakes\n\n${result!.caption}`);
  });

  it('decodes entities in German captions and keeps quantities as written', () => {
    const result = extractInstagramCaption(embedPage('kochliebe', 'Schnelle Pasta &amp; Pesto<br />Zutaten:<br />250 g Spaghetti<br />2&ndash;3 EL Pesto<br />Parmesan nach Geschmack'));
    expect(result?.caption).toBe('Schnelle Pasta & Pesto\nZutaten:\n250 g Spaghetti\n2–3 EL Pesto\nParmesan nach Geschmack');
  });

  it('falls back to the post page description', () => {
    const html = '<html><head><meta property="og:image" content="https://scontent.cdninstagram.com/og.jpg"><meta property="og:description" content="1,204 likes, 31 comments - maria.cocina on October 1, 2026: &quot;Tortilla española&#x1f954;\n4 huevos\n500 g patatas&quot;."></head></html>';
    expect(extractInstagramCaption(html)).toEqual({ author: 'maria.cocina', imageUrl: 'https://scontent.cdninstagram.com/og.jpg', caption: 'Tortilla española🥔\n4 huevos\n500 g patatas' });
  });

  it('returns null when the page has no caption (private post or login wall)', () => {
    expect(extractInstagramCaption('<html><head><title>Instagram</title></head><body>Log in</body></html>')).toBeNull();
  });
});
