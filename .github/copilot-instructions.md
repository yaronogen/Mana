# Mana development notes

- Mana is an Expo Router React Native app written in strict TypeScript for iOS and Android.
- Keep UI copy in `src/i18n/resources.ts`; support English (`en`), German (`de`), and Hebrew (`he`). Keep Hebrew RTL and mixed-script recipe content in mind.
- SQLite is the local source of truth. Use the repository functions in `src/data/database.ts`; never require network access for saved-recipe browsing, edits, favorites, or search.
- Keep AI provider secrets on the server. The mobile import client calls the authenticated Supabase Edge Function and must validate structured output before review/save.
- Recipe extraction and translation must preserve provided quantities, temperatures, times, and attribution. Missing information stays missing; uncertain output should be flagged.
- Keep transformations and service logic out of route components. Add tests for domain changes and maintain translation fixtures for English, German, Hebrew, Italian, French, and Spanish inputs.
- Run `npm run typecheck` and `npm test` after changes. Do not claim live AI imports work until Supabase configuration and provider secrets are supplied.
