import { useReducer, useCallback } from "react";
import type { ChatMessage } from "./types";
import type { Message } from "../api/claude";

interface ChatState {
  displayMessages: ChatMessage[];
  conversationHistory: Message[];
  isLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: "ADD_USER_MESSAGE"; text: string }
  | { type: "ADD_ASSISTANT_MESSAGE"; text: string }
  | { type: "ADD_TOOL_MESSAGE"; toolName: string; result: string }
  | { type: "SET_HISTORY"; history: Message[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null };

let msgId = 0;
function nextId(): string {
  return `msg_${++msgId}_${Date.now()}`;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "ADD_USER_MESSAGE":
      return {
        ...state,
        displayMessages: [
          ...state.displayMessages,
          {
            id: nextId(),
            role: "user",
            text: action.text,
            timestamp: Date.now(),
          },
        ],
        error: null,
      };
    case "ADD_ASSISTANT_MESSAGE":
      return {
        ...state,
        displayMessages: [
          ...state.displayMessages,
          {
            id: nextId(),
            role: "assistant",
            text: action.text,
            timestamp: Date.now(),
          },
        ],
      };
    case "ADD_TOOL_MESSAGE":
      return {
        ...state,
        displayMessages: [
          ...state.displayMessages,
          {
            id: nextId(),
            role: "tool",
            text: action.result,
            toolName: action.toolName,
            timestamp: Date.now(),
          },
        ],
      };
    case "SET_HISTORY":
      return { ...state, conversationHistory: action.history };
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error, isLoading: false };
    default:
      return state;
  }
}

const initialState: ChatState = {
  displayMessages: [],
  conversationHistory: [],
  isLoading: false,
  error: null,
};

export function useChatReducer() {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const addUserMessage = useCallback(
    (text: string) => dispatch({ type: "ADD_USER_MESSAGE", text }),
    []
  );
  const addAssistantMessage = useCallback(
    (text: string) => dispatch({ type: "ADD_ASSISTANT_MESSAGE", text }),
    []
  );
  const addToolMessage = useCallback(
    (toolName: string, result: string) =>
      dispatch({ type: "ADD_TOOL_MESSAGE", toolName, result }),
    []
  );
  const setHistory = useCallback(
    (history: Message[]) => dispatch({ type: "SET_HISTORY", history }),
    []
  );
  const setLoading = useCallback(
    (loading: boolean) => dispatch({ type: "SET_LOADING", loading }),
    []
  );
  const setError = useCallback(
    (error: string | null) => dispatch({ type: "SET_ERROR", error }),
    []
  );

  return {
    state,
    addUserMessage,
    addAssistantMessage,
    addToolMessage,
    setHistory,
    setLoading,
    setError,
  };
}
