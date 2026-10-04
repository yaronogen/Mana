import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { createId, type CookLogEntry, type Recipe } from '../domain/recipe';

let databasePromise: Promise<SQLiteDatabase> | undefined;
let setupPromise: Promise<void> | undefined;

async function getDatabase(): Promise<SQLiteDatabase> {
  databasePromise ??= openDatabaseAsync('mana.db');
  const database = await databasePromise;
  setupPromise ??= (async () => {
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        source_language TEXT,
        output_language TEXT NOT NULL,
        source_url TEXT,
        source_name TEXT,
        servings INTEGER,
        preparation_time INTEGER,
        cooking_time INTEGER,
        total_time INTEGER,
        ingredients TEXT NOT NULL,
        steps TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT NOT NULL,
        notes TEXT NOT NULL,
        warnings TEXT NOT NULL DEFAULT '[]',
        image_uri TEXT,
        favorite INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS recipes_updated_at_idx ON recipes(updated_at DESC);
      CREATE INDEX IF NOT EXISTS recipes_category_idx ON recipes(category);
      CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS cook_log (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL,
        cooked_at TEXT NOT NULL,
        rating INTEGER,
        note TEXT
      );
      CREATE INDEX IF NOT EXISTS cook_log_recipe_idx ON cook_log(recipe_id, cooked_at DESC);
    `);
    const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(recipes)');
    if (!columns.some((column) => column.name === 'warnings')) {
      await database.execAsync("ALTER TABLE recipes ADD COLUMN warnings TEXT NOT NULL DEFAULT '[]'");
    }
    if (!columns.some((column) => column.name === 'image_uri')) {
      await database.execAsync('ALTER TABLE recipes ADD COLUMN image_uri TEXT');
    }
    for (const [name, definition] of [['rating', 'INTEGER'], ['last_cooked_at', 'TEXT'], ['cook_count', 'INTEGER NOT NULL DEFAULT 0']]) {
      if (!columns.some((column) => column.name === name)) await database.execAsync(`ALTER TABLE recipes ADD COLUMN ${name} ${definition}`);
    }
  })();
  await setupPromise;
  return database;
}

function fromRow(row: Record<string, unknown>): Recipe {
  return {
    id: String(row.id), title: String(row.title), description: row.description as string | null,
    sourceLanguage: row.source_language as string | null, outputLanguage: row.output_language as Recipe['outputLanguage'],
    sourceUrl: row.source_url as string | null, sourceName: row.source_name as string | null,
    imageUri: (row.image_uri as string | null) ?? null,
    servings: row.servings == null ? null : Number(row.servings),
    preparationTime: row.preparation_time == null ? null : Number(row.preparation_time),
    cookingTime: row.cooking_time == null ? null : Number(row.cooking_time),
    totalTime: row.total_time == null ? null : Number(row.total_time),
    ingredients: JSON.parse(String(row.ingredients)) as Recipe['ingredients'],
    steps: JSON.parse(String(row.steps)) as Recipe['steps'], category: row.category as Recipe['category'],
    tags: JSON.parse(String(row.tags)) as string[], notes: JSON.parse(String(row.notes)) as string[],
    warnings: JSON.parse(String(row.warnings ?? '[]')) as string[], favorite: Number(row.favorite) === 1,
    rating: row.rating == null ? null : Number(row.rating), lastCookedAt: (row.last_cooked_at as string | null) ?? null,
    cookCount: Number(row.cook_count ?? 0),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function getRecipes(options: { query?: string; favoritesOnly?: boolean; category?: string } = {}): Promise<Recipe[]> {
  const database = await getDatabase();
  const clauses: string[] = [];
  const arguments_: (string | number)[] = [];
  if (options.favoritesOnly) clauses.push('favorite = 1');
  if (options.category) { clauses.push('category = ?'); arguments_.push(options.category); }
  const query = options.query?.trim().toLocaleLowerCase();
  if (query) {
    const like = `%${query}%`;
    clauses.push('(lower(title) LIKE ? OR lower(ingredients) LIKE ? OR lower(category) LIKE ? OR lower(tags) LIKE ?)');
    arguments_.push(like, like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await database.getAllAsync<Record<string, unknown>>(`SELECT * FROM recipes ${where} ORDER BY updated_at DESC`, ...arguments_);
  return rows.map(fromRow);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM recipes WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO recipes (id, title, description, source_language, output_language, source_url, source_name,
      servings, preparation_time, cooking_time, total_time, ingredients, steps, category, tags, notes, warnings, image_uri, favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description,
      source_language=excluded.source_language, output_language=excluded.output_language, source_url=excluded.source_url,
      source_name=excluded.source_name, servings=excluded.servings, preparation_time=excluded.preparation_time,
      cooking_time=excluded.cooking_time, total_time=excluded.total_time, ingredients=excluded.ingredients,
      steps=excluded.steps, category=excluded.category, tags=excluded.tags, notes=excluded.notes,
      warnings=excluded.warnings, image_uri=excluded.image_uri, favorite=excluded.favorite, updated_at=excluded.updated_at`,
    recipe.id, recipe.title, recipe.description, recipe.sourceLanguage, recipe.outputLanguage, recipe.sourceUrl,
    recipe.sourceName, recipe.servings, recipe.preparationTime, recipe.cookingTime, recipe.totalTime,
    JSON.stringify(recipe.ingredients), JSON.stringify(recipe.steps), recipe.category,
    JSON.stringify(recipe.tags), JSON.stringify(recipe.notes), JSON.stringify(recipe.warnings), recipe.imageUri, recipe.favorite ? 1 : 0,
    recipe.createdAt, recipe.updatedAt,
  );
}

export async function toggleFavorite(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE recipes SET favorite = CASE favorite WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?', new Date().toISOString(), id);
}

export async function deleteRecipe(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM recipes WHERE id = ?', id);
  await database.runAsync('DELETE FROM cook_log WHERE recipe_id = ?', id);
}

/** Records that a recipe was cooked, with an optional 1–5 rating and a personal note. */
export async function logCook(recipeId: string, rating: number | null, note: string | null): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync('INSERT INTO cook_log (id, recipe_id, cooked_at, rating, note) VALUES (?, ?, ?, ?, ?)', createId(), recipeId, now, rating, note);
  await database.runAsync(
    'UPDATE recipes SET cook_count = cook_count + 1, last_cooked_at = ?, rating = COALESCE(?, rating) WHERE id = ?',
    now, rating, recipeId,
  );
}

export async function getCookLog(recipeId: string): Promise<CookLogEntry[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Record<string, unknown>>('SELECT * FROM cook_log WHERE recipe_id = ? ORDER BY cooked_at DESC', recipeId);
  return rows.map((row) => ({
    id: String(row.id), recipeId: String(row.recipe_id), cookedAt: String(row.cooked_at),
    rating: row.rating == null ? null : Number(row.rating), note: (row.note as string | null) ?? null,
  }));
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, value);
}
