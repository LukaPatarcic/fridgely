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
): Promise<FridgeItem & { updated: boolean }> {
  const existing = await db.getFirstAsync<FridgeItem>(
    "SELECT * FROM fridge_items WHERE LOWER(name) = LOWER(?)",
    [name]
  );

  if (existing) {
    const newQuantity = existing.quantity + quantity;
    await updateItemQuantity(db, name, newQuantity);
    const updated = await db.getFirstAsync<FridgeItem>(
      "SELECT * FROM fridge_items WHERE id = ?",
      [existing.id]
    );
    return { ...updated!, updated: true };
  }

  const result = await db.runAsync(
    "INSERT INTO fridge_items (name, quantity, unit) VALUES (?, ?, ?)",
    [name, quantity, unit ?? null]
  );
  const row = await db.getFirstAsync<FridgeItem>(
    "SELECT * FROM fridge_items WHERE id = ?",
    [result.lastInsertRowId]
  );
  return { ...row!, updated: false };
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

export async function decrementItemQuantity(
  db: SQLiteDatabase,
  name: string,
  quantity?: number
): Promise<{ removed: boolean; remaining: number; name: string }> {
  const existing = await db.getFirstAsync<FridgeItem>(
    "SELECT * FROM fridge_items WHERE LOWER(name) = LOWER(?)",
    [name]
  );

  if (!existing) {
    return { removed: false, remaining: 0, name };
  }

  const decrementBy = quantity ?? existing.quantity;
  const newQuantity = existing.quantity - decrementBy;

  if (newQuantity <= 0) {
    await db.runAsync(
      "DELETE FROM fridge_items WHERE LOWER(name) = LOWER(?)",
      [name]
    );
    return { removed: true, remaining: 0, name: existing.name };
  }

  await updateItemQuantity(db, name, newQuantity);
  return { removed: false, remaining: newQuantity, name: existing.name };
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
