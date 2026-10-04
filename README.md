# Mana

Mana is a local-first personal recipe library for iOS and Android. Save a recipe manually or submit copied recipe text for structured extraction and culinary-aware translation. The app UI and saved recipes support English, German, and Hebrew.

## Current implementation

- Expo SDK 57, React Native, TypeScript, and Expo Router.
- SQLite storage through Expo SQLite; saved recipes, search, edits, and favorites work offline.
- i18next resources for English, German, and Hebrew, plus Hebrew RTL layout handling.
- A provider-isolated mobile AI client calling a Supabase Edge Function. The function validates anonymous Supabase identity, enforces a daily per-account import quota, and calls the model from the server only.
- AI output is schema-validated on the server and again on-device, then shown in an editable review form before local save.
- Native share sheet with localized recipe text.
- Recipe photos: link imports keep the website's recipe photo, and any recipe can get a photo from the camera or photo library. Photos are stored on the device.
- Recipe links: pasting a single web link imports the recipe from that page. The Edge Function downloads the page, reads its schema.org Recipe data, and sends only a compact ingredients/steps text to the model when translation is needed. If the recipe is already in the requested language, no model call is made. Pages without structured data fall back to readable page text capped at 12,000 characters.

AI import remains disabled until a Supabase project and server-side model secret are configured. The starter icon/splash imagery is temporary and should be replaced before store submission. The configured app identifiers are provisional and must be replaced with identifiers owned by the publisher.

## Run locally

1. Install Node.js LTS and npm.
2. Run `corepack pnpm install` (or `npm install` if you prefer npm).
3. Copy `.env.example` to `.env` and fill in the public Supabase project URL and publishable/anon key. These are public client configuration values, not model secrets.
4. Run `corepack pnpm start`, then open the app in an iOS simulator, Android emulator, or a compatible development build.
5. Run `corepack pnpm typecheck` and `corepack pnpm test` before committing.

Manual recipes, saved recipe browsing, editing, local search, favorites, and sharing need no Supabase connection.

## Enable AI recipe import

1. Create a Supabase project and enable **Anonymous Sign-Ins** in its Auth settings.
2. Install the Supabase CLI and link this workspace to the project.
3. Apply the SQL migration with `supabase db push`.
4. Set server-side function secrets: `ANTHROPIC_API_KEY` (from console.anthropic.com). Optional: `CLAUDE_MODEL` (defaults to `claude-opus-5-5`; `claude-sonnet-5-5` or `claude-haiku-4-5` are cheaper) and `CLAUDE_EFFORT` (`low` by default; `medium`/`high` trade more tokens for more careful output). Hosted Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically; names starting with `SUPABASE_` cannot be set as secrets. Never put the provider key or service-role key in `.env`, Expo config, or the mobile app.
5. Deploy the function with `supabase functions deploy recipe-process`.
6. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the app environment and restart Metro.

The initial server quota is 30 import attempts per anonymous account per UTC day. Anonymous identities are not strong proof of device identity and can be reset; before a public launch, add platform attestation and an edge/IP abuse-control layer, monitor spend, and test provider retention settings. The backend intentionally does not log pasted recipe text.

## Tests

The deterministic unit tests cover fraction/range parsing, share-text formatting, localization completeness, and the required translation-direction fixture matrix. `src/services/ai/testRecipes.ts` contains original German/English/Hebrew and Italian/French/Spanish evaluation samples with protected quantities, times, temperatures, and cooking terminology. Live model-quality tests should run against a controlled staging project and must compare extracted facts before provider/model changes.

## Privacy

Saved cookbook data is stored in the app’s local SQLite database. Only the pasted text and selected output language for that one import are sent to the Mana Edge Function and then to the configured model provider. The full cookbook is never uploaded. See `docs/PRIVACY.md` before enabling production AI imports or preparing store disclosures.
