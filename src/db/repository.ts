import type { SQLiteDatabase } from "expo-sqlite";

export interface FridgeItem {
  id: number;
  name: string;
  quantity: number;
  unit: string | null;
  added_at: string;
}

export async function addItem(
  db: SQLiteDatabase,
  name: string,
  quantity: number,
  unit?: string
): Promise<FridgeItem> {
  const result = await db.runAsync(
    "INSERT INTO fridge_items (name, quantity, unit) VALUES (?, ?, ?)",
    [name, quantity, unit ?? null]
  );
  const row = await db.getFirstAsync<FridgeItem>(
    "SELECT * FROM fridge_items WHERE id = ?",
    [result.lastInsertRowId]
  );
  return row!;
}

export async function removeItem(
  db: SQLiteDatabase,
  name: string
): Promise<number> {
  const result = await db.runAsync(
    "DELETE FROM fridge_items WHERE LOWER(name) = LOWER(?)",
    [name]
  );
  return result.changes;
}

export async function listItems(db: SQLiteDatabase): Promise<FridgeItem[]> {
  return db.getAllAsync<FridgeItem>(
    "SELECT * FROM fridge_items ORDER BY added_at DESC"
  );
}

export async function clearAll(db: SQLiteDatabase): Promise<void> {
  await db.runAsync("DELETE FROM fridge_items");
}

export async function updateItemQuantity(
  db: SQLiteDatabase,
  name: string,
  quantity: number
): Promise<number> {
  const result = await db.runAsync(
    "UPDATE fridge_items SET quantity = ? WHERE LOWER(name) = LOWER(?)",
    [quantity, name]
  );
  return result.changes;
}
