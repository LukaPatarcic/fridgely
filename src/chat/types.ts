export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
  toolName?: string;
  timestamp: number;
}

export interface ChatSummary {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}
