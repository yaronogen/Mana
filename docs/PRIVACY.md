# Mana privacy notes (implementation draft)

The published, user-facing policy is [privacy.html](privacy.html) (https://yaronogen.github.io/Mana/privacy.html); keep both in step.

## Data stored on-device

- Recipes, ingredients, preparation steps, notes, tags, favorites, source metadata, and app preferences are stored in the local SQLite database.
- Recipe photos (taken with the camera, chosen from the library, or downloaded from an imported recipe page) are stored in the app's document folder (`recipe-images/`) and never uploaded.
- Anonymous Supabase authentication state is stored with Expo SecureStore on native devices so the app does not ask the user to register.
- No full-cookbook synchronization or cloud recipe database is implemented.

## Data sent off-device

When a user submits pasted text for AI import, Mana sends only that text and the selected target language to the Mana Supabase Edge Function. The function authenticates the anonymous session, checks the import quota, and sends the same necessary source text to the configured model provider for extraction and translation. The structured response returns to the device and is not automatically saved until the user reviews and confirms it.

When a user submits a recipe link, the link and target language are sent to the function, which downloads that page from its public server. Only the extracted recipe facts (or capped readable page text when the page has no structured recipe data) are sent to the model provider, and nothing is sent to the provider when the recipe is already in the requested language. The downloaded page is not stored or logged. When the page names a recipe photo, the function returns only its URL; the phone then downloads that one image directly from the website, so the website sees the device's network address for that request.

When a user sends a recipe to another Mana user, the app uploads that recipe (wording, quantities, times, attribution and a web photo URL if it has one; never ratings, cook notes, favorites or on-device photos) to the function, which stores it in `shared_recipes` under a random 10-character code with the anonymous creator id. The row expires after 90 days and expired rows are deleted when new links are created; each user may create 50 links per day. Anyone with the code can retrieve the recipe through the authenticated function. The recipient's app validates it with Zod and translates it with the normal `translate` action when the languages differ.

The function does not log request bodies or provider response content. Supabase and the model provider may process operational metadata under their service terms. Configure and verify provider retention/training settings before production use, and include the resulting disclosure in the published privacy policy and Apple/Google privacy forms.

## Security boundaries and remaining release work

- Model-provider API keys and the Supabase service-role key belong only in server-side secrets.
- The app’s Supabase URL and publishable/anon key are public client configuration; authorization relies on the anonymous session JWT and server-side checks, not secrecy of these values.
- Anonymous users can be recreated. The per-account daily quota is a cost-control baseline, not adequate standalone abuse prevention. Add App Attest / Play Integrity and server-side network abuse controls before open public access.
- Add verified user-facing privacy policy, terms, contact details, data deletion/export guidance, provider/subprocessor disclosures, and store-specific data declarations before submission.
- Local data is not synchronized or guaranteed to survive app removal/device loss. Explain this until backup/sync is added.
