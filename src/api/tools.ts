import type { SQLiteDatabase } from "expo-sqlite";
import { addItem, removeItem, listItems, clearAll } from "../db/repository";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "add_to_fridge",
    description:
      "Add a grocery item to the user's fridge. Use this when the user mentions buying or having food items.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the item" },
        quantity: {
          type: "number",
          description: "Quantity of the item (default 1)",
        },
        unit: {
          type: "string",
          description:
            'Unit of measurement (e.g. "pieces", "lbs", "liters", "gallons"). Optional.',
        },
      },
      required: ["name", "quantity"],
    },
  },
  {
    name: "remove_from_fridge",
    description:
      "Remove a grocery item from the user's fridge by name. Use when the user says they used up or discarded an item.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the item to remove",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_fridge_contents",
    description:
      "List all items currently in the user's fridge. Use this before suggesting recipes or when the user asks what they have.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "clear_fridge",
    description:
      "Remove all items from the fridge. Only use when the user explicitly asks to clear everything.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

export async function executeTool(
  db: SQLiteDatabase,
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (toolName) {
      case "add_to_fridge": {
        const name = typeof input.name === "string" ? input.name.trim() : "";
        const quantity = typeof input.quantity === "number" ? input.quantity : 0;
        if (!name || name.length > 200) {
          return JSON.stringify({ error: "Invalid item name" });
        }
        if (quantity <= 0 || quantity > 10000) {
          return JSON.stringify({ error: "Quantity must be between 1 and 10000" });
        }
        const unit = typeof input.unit === "string" ? input.unit.trim().slice(0, 50) : undefined;
        const item = await addItem(db, name, quantity, unit);
        return JSON.stringify({
          success: true,
          item: {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
          },
        });
      }
      case "remove_from_fridge": {
        const removeName = typeof input.name === "string" ? input.name.trim() : "";
        if (!removeName || removeName.length > 200) {
          return JSON.stringify({ error: "Invalid item name" });
        }
        const removed = await removeItem(db, removeName);
        return JSON.stringify({
          success: true,
          removed_count: removed,
          message:
            removed > 0
              ? `Removed ${removeName}`
              : `No item named "${removeName}" found`,
        });
      }
      case "list_fridge_contents": {
        const items = await listItems(db);
        return JSON.stringify({
          items: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          })),
          total: items.length,
        });
      }
      case "clear_fridge": {
        await clearAll(db);
        return JSON.stringify({ success: true, message: "Fridge cleared" });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
