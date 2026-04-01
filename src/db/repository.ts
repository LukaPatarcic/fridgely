import type { SQLiteDatabase } from "expo-sqlite";

export interface FridgeItem {
  id: number;
  name: string;
  quantity: number;
  unit: string | null;
  added_at: string;
}

export interface Chat {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  created_at: string;
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

// --- Chat repository functions ---

export async function createChat(
  db: SQLiteDatabase,
  title: string
): Promise<Chat> {
  const result = await db.runAsync(
    "INSERT INTO chats (title) VALUES (?)",
    [title]
  );
  const row = await db.getFirstAsync<Chat>(
    "SELECT * FROM chats WHERE id = ?",
    [result.lastInsertRowId]
  );
  return row!;
}

export async function listChats(db: SQLiteDatabase): Promise<Chat[]> {
  return db.getAllAsync<Chat>(
    "SELECT * FROM chats ORDER BY updated_at DESC"
  );
}

export async function getChatMessages(
  db: SQLiteDatabase,
  chatId: number
): Promise<ChatMessageRow[]> {
  return db.getAllAsync<ChatMessageRow>(
    "SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC",
    [chatId]
  );
}

export async function addChatMessage(
  db: SQLiteDatabase,
  chatId: number,
  role: string,
  content: string
): Promise<void> {
  await db.runAsync(
    "INSERT INTO chat_messages (chat_id, role, content) VALUES (?, ?, ?)",
    [chatId, role, content]
  );
  await db.runAsync(
    "UPDATE chats SET updated_at = datetime('now') WHERE id = ?",
    [chatId]
  );
}

export async function updateChatTitle(
  db: SQLiteDatabase,
  chatId: number,
  title: string
): Promise<void> {
  await db.runAsync(
    "UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ?",
    [title, chatId]
  );
}

export async function deleteChat(
  db: SQLiteDatabase,
  chatId: number
): Promise<void> {
  await db.runAsync("DELETE FROM chat_messages WHERE chat_id = ?", [chatId]);
  await db.runAsync("DELETE FROM chats WHERE id = ?", [chatId]);
}
