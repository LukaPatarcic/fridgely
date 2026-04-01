import type { SQLiteDatabase } from "expo-sqlite";
import { addItem, removeItem, listItems, clearAll, decrementItemQuantity } from "../db/repository";
import { daysUntilExpiry } from "../utils/expiryEstimator";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "add_to_fridge",
    description:
      "Add a grocery item to the user's fridge. Use this when the user mentions buying or having food items. Always estimate shelf life.",
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
        expires_in_days: {
          type: "number",
          description:
            "Estimated number of days until this food expires when stored in a fridge. Use your food safety knowledge to estimate (e.g. raw chicken ~2 days, milk ~7 days, eggs ~28 days, apples ~21 days). Always provide this.",
        },
      },
      required: ["name", "quantity", "expires_in_days"],
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
  {
    name: "use_from_fridge",
    description:
      "Use/consume an item from the fridge by decrementing its quantity. If quantity reaches 0, the item is removed. Use this when the user wants to cook or make something, to subtract the ingredients they will use.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the item to use",
        },
        quantity: {
          type: "number",
          description:
            "Quantity to use. If omitted, uses all of the item.",
        },
      },
      required: ["name"],
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
        let expiresAt: string | undefined;
        const expiresInDays = typeof input.expires_in_days === "number" ? input.expires_in_days : undefined;
        if (expiresInDays && expiresInDays > 0) {
          const date = new Date();
          date.setDate(date.getDate() + expiresInDays);
          expiresAt = date.toISOString().slice(0, 19).replace("T", " ");
        }
        const item = await addItem(db, name, quantity, unit, expiresAt);
        return JSON.stringify({
          success: true,
          action: item.updated ? "quantity_updated" : "added_new",
          item: {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            expires_at: item.expires_at,
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
            expires_at: i.expires_at,
            days_until_expiry: i.expires_at ? daysUntilExpiry(i.expires_at) : null,
          })),
          total: items.length,
        });
      }
      case "clear_fridge": {
        await clearAll(db);
        return JSON.stringify({ success: true, message: "Fridge cleared" });
      }
      case "use_from_fridge": {
        const useName = typeof input.name === "string" ? input.name.trim() : "";
        if (!useName || useName.length > 200) {
          return JSON.stringify({ error: "Invalid item name" });
        }
        const useQuantity = typeof input.quantity === "number" ? input.quantity : undefined;
        if (useQuantity !== undefined && (useQuantity <= 0 || useQuantity > 10000)) {
          return JSON.stringify({ error: "Quantity must be between 1 and 10000" });
        }
        const result = await decrementItemQuantity(db, useName, useQuantity);
        if (result.remaining === 0 && result.removed) {
          return JSON.stringify({
            success: true,
            message: `Used all ${useName} (removed from fridge)`,
          });
        }
        if (result.remaining === 0 && !result.removed) {
          return JSON.stringify({
            success: false,
            message: `No item named "${useName}" found in the fridge`,
          });
        }
        return JSON.stringify({
          success: true,
          message: `Used some ${result.name}, ${result.remaining} remaining`,
          remaining: result.remaining,
        });
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
