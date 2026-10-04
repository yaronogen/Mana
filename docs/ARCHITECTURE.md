# Architecture decisions

## Mobile app

- Expo Router provides typed file-based navigation and the EAS build path for iOS/Android.
- Feature routes render UI; recipe parsing/formatting lives in domain/service modules.
- SQLite is the source of truth for the cookbook. `src/data/database.ts` owns parameterized repository queries and idempotent local schema initialization. A future larger schema may adopt Drizzle migrations; the V1 data shape remains relational and migration-ready.
- i18next resources contain UI strings and localized category labels. Recipe output language is saved with each recipe, so changing UI language does not rewrite user content.
- TanStack Query is the remote request/cache boundary; Zustand holds only preferences and transient import-review state.

## AI boundary

The app sends a single pasted recipe and target language through Supabase anonymous auth to the `recipe-process` Edge Function. The function validates input and identity, applies a per-account quota, uses a strict structured-output schema, and returns only the recipe object. The client validates again with Zod and does not save the result before explicit review.

Pasting a single link sends `{ url, targetLanguage }` instead of text. The function fetches the page server-side (public http/https hosts only, re-checked on every redirect, 10 s timeout, 3 MB cap) and extracts the schema.org Recipe with `src/services/import/webRecipe.ts`, a dependency-free module shared with the app. Raw HTML is never sent to the model: a same-language structured recipe is returned as `{ source }` and turned into a draft on-device with no model call; otherwise only the compact recipe text (about 1–2k characters) or capped readable page text is sent for extraction/translation. The page URL is recorded as the recipe source.

No provider key is included in the client. Prompt instructions require preserving quantities, temperatures, times, and source attribution, and require warnings for ambiguity. This is a model constraint, not a mathematical guarantee; live output still needs language-specific fact-fidelity evaluation.

## Recipe photos

Each recipe has an optional `imageUri`. Link imports take the schema.org `image` (or the page's `og:image`) as a remote URL; on save, `src/services/images/recipeImages.ts` downloads it, or copies a camera/library photo from `expo-image-picker`, into `Paths.document/recipe-images/` and stores the local file URI in SQLite. Replaced and deleted recipes remove their old file. On web (development only) URIs are kept as-is.

## State and offline behavior

- Recipe CRUD, favorites, local search, and sharing use local SQLite and work without network access.
- Only AI import needs the backend. There is no cloud sync, backup, or account registration UI in the current slice.
- Measurements are represented with display text plus optional numeric quantity. This preserves fractions/ranges and leaves future scaling possible without changing the user-visible source amount.

## Release gates

Replace provisional bundle/package IDs and starter artwork; test actual iOS/Android builds and Hebrew RTL on devices; configure provider retention and privacy disclosures; add monitoring, attestation/network abuse protection, backup/export, and store legal/support content before public release.
