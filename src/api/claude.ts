import { toolDefinitions, executeTool } from "./tools";
import type { SQLiteDatabase } from "expo-sqlite";
import Constants from "expo-constants";

const PROXY_URL =
  Constants.expoConfig?.extra?.proxyUrl ?? "http://localhost:3001";
const API_URL = `${PROXY_URL}/api/messages`;
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOOL_ROUNDS = 5;

function buildSystemPrompt(preferences?: { foodPreferences?: string; allergies?: string }): string {
  let prompt = `You are Fridgely, a friendly fridge management assistant. You help users track what's in their fridge and suggest recipes based on available ingredients.

When the user tells you about food they bought or have, use add_to_fridge to save it. If the item already exists, its quantity will be incremented automatically.
IMPORTANT: When adding items, always provide expires_in_days with a realistic estimate based on food safety knowledge for refrigerated storage. Examples: raw chicken/fish ~2 days, ground meat ~2 days, milk ~7 days, yogurt ~14 days, eggs ~28 days, fresh berries ~5 days, apples ~21 days, bread ~5 days, cheese ~21 days, leafy greens ~5 days, cooked leftovers ~4 days.
When they say they used something up or discarded it entirely, use remove_from_fridge.
When the user wants to cook or make a meal, first use list_fridge_contents to see what they have, then use use_from_fridge for each ingredient they will use in the recipe. This decrements the quantity or removes the item if fully used up.
When they ask what's in their fridge or want recipe suggestions, first use list_fridge_contents to check, then provide suggestions. PRIORITIZE items that are expiring soon — suggest recipes that use up items closest to their expiry date first. Mention which items need to be used soon.
Always confirm actions after performing them.
Keep responses concise and friendly.`;

  if (preferences?.foodPreferences) {
    prompt += `\n\nThe user has the following dietary preferences: ${preferences.foodPreferences}. Always respect these when suggesting recipes or meals.`;
  }
  if (preferences?.allergies) {
    prompt += `\n\nCRITICAL - The user has the following allergies: ${preferences.allergies}. NEVER suggest recipes or ingredients that contain these allergens. Always check ingredients against this list before recommending anything.`;
  }

  prompt += `\n\nWhen the user sends a photo, identify all visible food items. For each item, estimate a reasonable quantity and unit, then use add_to_fridge to save each one. After adding, summarize what was added.`;

  return prompt;
}

export interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  source?: {
    type: string;
    media_type: string;
    data: string;
  };
}

export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ApiResponse {
  content: ContentBlock[];
  stop_reason: string;
}

async function callClaude(
  apiKey: string,
  messages: Message[],
  preferences?: { foodPreferences?: string; allergies?: string }
): Promise<ApiResponse> {
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(preferences),
    tools: toolDefinitions,
    messages,
    apiKey,
  });

  const response = await new Promise<{ status: number; text: string }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_URL);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.onload = () => {
        resolve({ status: xhr.status, text: xhr.responseText });
      };
      xhr.onerror = () => {
        reject(new Error("Unable to connect to server"));
      };
      xhr.ontimeout = () => reject(new Error("Request timed out"));
      xhr.timeout = 60000;
      xhr.send(body);
    }
  );

  if (response.status < 200 || response.status >= 300) {
    // Parse error but don't expose raw API details
    let userMessage = "Something went wrong";
    try {
      const err = JSON.parse(response.text);
      if (response.status === 401) userMessage = "Invalid API key";
      else if (response.status === 429) userMessage = "Too many requests, please wait";
      else if (response.status === 400) userMessage = err.error?.message ?? "Bad request";
      else if (response.status === 403) userMessage = "Access denied";
      else if (response.status === 504) userMessage = "Request timed out";
    } catch {
      // ignore parse errors
    }
    throw new Error(userMessage);
  }

  return JSON.parse(response.text);
}

export async function sendMessage(
  apiKey: string,
  conversationHistory: Message[],
  userText: string,
  db: SQLiteDatabase,
  onToolUse?: (toolName: string, result: string) => void,
  preferences?: { foodPreferences?: string; allergies?: string },
  image?: { base64: string; mimeType: string } | null
): Promise<{ assistantText: string; updatedHistory: Message[] }> {
  const userContent: string | ContentBlock[] = image
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: image.mimeType,
            data: image.base64,
          },
        },
        { type: "text", text: userText },
      ]
    : userText;

  const messages: Message[] = [
    ...conversationHistory,
    { role: "user", content: userContent },
  ];

  let rounds = 0;
  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const response = await callClaude(apiKey, messages, preferences);

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return {
        assistantText: textBlock?.text ?? "",
        updatedHistory: messages,
      };
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b) => b.type === "tool_use"
      );
      const toolResults: ContentBlock[] = [];

      for (const block of toolUseBlocks) {
        const result = await executeTool(db, block.name!, block.input!);
        onToolUse?.(block.name!, result);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id!,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  return {
    assistantText: "I've been doing too many operations. Could you try again?",
    updatedHistory: messages,
  };
}
