# Hebrew RTL verification plan

Run on current iOS and Android devices (including a small phone and tablet) with Hebrew selected, then repeat key screens in English/German to confirm LTR remains intact.

- [ ] Onboarding language selection and language changes in Settings.
- [ ] Home: brand/header, search, category grid, recent cards, floating content actions, and bottom tabs.
- [ ] Recipes: search input, category chips, list cards, and empty state.
- [ ] Add Recipe: paste/write choices and directional icons/actions.
- [ ] Paste import: Hebrew source text, English/German recipe output selection, processing, and error states.
- [ ] Review/editor: title, ingredient quantities, optional/preparation text, reorder controls, and numbered steps.
- [ ] Detail: Hebrew title, metadata, ingredients, steps, tags, source, favorite/edit/delete controls.
- [ ] Settings: selected-language marker, appearance choices, dynamic text size.
- [ ] Share sheet output: Hebrew headings and paragraphs with mixed values such as `200 ml`, `1/2`, `180°C`, URLs, and Latin ingredient names.
- [ ] Verify screen-reader labels and logical focus order in both layout directions.

Text direction for recipe content follows each recipe’s saved output language; app navigation and UI direction follow the current app language. `I18nManager.forceRTL` is set when Hebrew is selected; fully native navigation direction may require relaunching the app, as noted in Settings.
