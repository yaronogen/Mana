# Mana — Claude Code handoff

## Project
Mana is a local-first personal cookbook for iOS and Android, built with Expo SDK 57, React Native, Expo Router, and strict TypeScript. The interface supports English, German, and Hebrew; recipe content preserves its own output language, and Hebrew uses RTL layout support.

## Current state
The first application slice is implemented: onboarding and language preference, Home / Recipes / Favorites / Settings tabs, local SQLite recipe storage, manual recipe creation/editing, local search, favorites, recipe detail, native sharing, a local shopping list (Groceries tab, filled from recipe ingredients), metric/US measurement display, paste-import UI (recipe text or a single recipe link, read server-side via schema.org data to minimize model tokens), editable import review, and a Supabase Edge Function scaffold for AI extraction. Also: sharing into Mana from other apps (`expo-share-intent`; Instagram links are read from the post caption server-side), sending a recipe to another Mana user by link (`shared_recipes` table, `docs/r/` page, `mana://r/<code>`), a "My cookbook" PDF (`src/services/cookbook/`, built on the phone with `expo-print`, sent with the phone's mail app), servings scaling from the profile's "Cooking for" (`src/domain/scaling.ts`, display-time only), and a red allergen warning for profile allergies.

AI imports are not live until Supabase is configured, anonymous sign-in is enabled, the migration is applied, the Edge Function is deployed, and server-side model secrets are configured. Never add model-provider or service-role secrets to the app, `.env`, or source control. See README.md and docs/PRIVACY.md.

## Architecture conventions
- Use `src/data/database.ts` as the SQLite repository boundary. Saved recipes and preferences should work offline.
- Keep recipe types and deterministic transformations in `src/domain/`.
- Keep UI strings in `src/i18n/resources.ts`; maintain English, German, and Hebrew together. Keep Hebrew RTL and mixed-script quantities in mind.
- Keep AI logic out of route components. The client calls the authenticated Supabase Edge Function; validate structured output with Zod before preview/save.
- Preserve supplied quantities, units, ranges, temperatures, times, and attribution. Do not fill in missing facts. Surface ambiguity as a warning.
- Saved recipes follow the app language: `src/stores/translations.ts` asks the Edge Function (`action: 'translate'`, own monthly allowance, never an import) to translate a recipe's wording, cached in the `recipe_translations` table and keyed by a content fingerprint. The stored recipe is never overwritten: load with `getRecipe(id, language)` / `getRecipes({ language })` for display and without `language` for editing or saving.
- Text direction follows each text's content (Typography `Text`/`TextInput`): Hebrew right-to-left, other scripts left-to-right; screens don't set `writingDirection` per recipe.
- Recipe detail lives in `app/(tabs)/recipe/[id].tsx` (hidden tab, `href: null`) so the tab bar stays visible.
- Unit conversion (Settings → Measurements) is deterministic and display-time only (`src/domain/units.ts`): stored recipes keep their original amounts, converted amounts are shown with the original alongside, and the AI never converts.
- Add/update tests for domain, share, localization, and extraction-schema changes. Fixtures include German, English, Hebrew, Italian, French, and Spanish inputs.
- Avoid committing credentials, generated output (`dist/`), or `node_modules/`.

## Commands
Use pnpm via Corepack; `pnpm-lock.yaml` is the checked-in lockfile:
- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm start`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- Web bundle validation: `corepack pnpm expo export --platform web`
- Android bundle validation: `corepack pnpm expo export --platform android`

The web export needs Metro configured to include WASM assets for Expo SQLite; retain `metro.config.js` unless deliberately replacing the web SQLite strategy.

## Release caveats
This is a development baseline, not a store-ready release. Replace provisional application identifiers and starter artwork, verify app behavior on iOS and Android devices (especially Hebrew RTL and dynamic text), configure AI provider retention and abuse controls, and prepare verified privacy/legal/support content before submission. Local-only recipes are not backed up or synchronized.
