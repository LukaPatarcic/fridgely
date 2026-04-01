import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
  Keyboard,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useDatabase } from "../../src/context/DatabaseProvider";
import { useTheme } from "../../src/context/ThemeProvider";
import { usePreferences } from "../../src/context/PreferencesProvider";
import { sendMessage } from "../../src/api/claude";
import type { Message } from "../../src/api/claude";
import { useChatReducer } from "../../src/chat/useChatReducer";
import { MessageBubble } from "../../src/components/MessageBubble";
import { ChatInput } from "../../src/components/ChatInput";
import { ApiKeyModal } from "../../src/components/ApiKeyModal";
import type { ChatMessage, ChatSummary } from "../../src/chat/types";
import {
  createChat,
  listChats,
  getChatMessages,
  addChatMessage,
  updateChatTitle,
  deleteChat,
} from "../../src/db/repository";
import type { ChatMessageRow } from "../../src/db/repository";

const API_KEY_STORE = "fridgely_api_key";

export default function ChatScreen() {
  const db = useDatabase();
  const { colors } = useTheme();
  const { foodPreferences, allergies } = usePreferences();
  const tabBarHeight = useBottomTabBarHeight();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const {
    state,
    addUserMessage,
    addAssistantMessage,
    addToolMessage,
    setHistory,
    setLoading,
    setError,
    loadChat,
    setChatId,
    clearChat,
  } = useChatReducer();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [chatList, setChatList] = useState<ChatSummary[]>([]);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [tabBarHeight]);

  useEffect(() => {
    SecureStore.getItemAsync(API_KEY_STORE)
      .then((key) => {
        if (key) {
          setApiKey(key);
        } else {
          setShowKeyModal(true);
        }
      })
      .catch(() => {
        setShowKeyModal(true);
      });
  }, []);

  // Load most recent chat on mount
  useEffect(() => {
    loadMostRecentChat();
  }, []);

  async function loadMostRecentChat() {
    try {
      const chats = await listChats(db);
      if (chats.length > 0) {
        await loadChatById(chats[0].id);
      }
    } catch {
      // No chats yet, start fresh
    }
  }

  async function loadChatById(chatId: number) {
    try {
      const rows = await getChatMessages(db, chatId);
      const displayMessages: ChatMessage[] = rows.map(
        (row: ChatMessageRow, index: number) => {
          const parsed = JSON.parse(row.content);
          return {
            id: `db_${row.id}_${index}`,
            role: row.role as "user" | "assistant" | "tool",
            text: parsed.text ?? "",
            toolName: parsed.toolName,
            timestamp: new Date(row.created_at).getTime(),
          };
        }
      );

      // Rebuild conversation history from stored messages for API context
      const history = rebuildHistoryFromRows(rows);

      loadChat(displayMessages, history);
      setChatId(chatId);
    } catch {
      // Failed to load, start fresh
    }
  }

  function rebuildHistoryFromRows(
    rows: ChatMessageRow[]
  ): Message[] {
    const history: Message[] = [];

    for (const row of rows) {
      const parsed = JSON.parse(row.content);
      if (row.role === "user") {
        if (parsed.apiContent) {
          history.push({ role: "user", content: parsed.apiContent });
        } else {
          history.push({ role: "user", content: parsed.text });
        }
      } else if (row.role === "assistant") {
        if (parsed.apiContent) {
          history.push({ role: "assistant", content: parsed.apiContent });
        } else {
          history.push({ role: "assistant", content: parsed.text });
        }
      }
      // tool messages are part of user messages in the API history, skip separate entries
    }

    return history;
  }

  const handleSaveApiKey = useCallback(async (key: string) => {
    const clean = key.replace(/\s+/g, "");
    await SecureStore.setItemAsync(API_KEY_STORE, clean);
    setApiKey(clean);
    setShowKeyModal(false);
  }, []);

  const handleNewChat = useCallback(() => {
    clearChat();
    setChatId(null);
  }, [clearChat, setChatId]);

  const handleOpenHistory = useCallback(async () => {
    try {
      const chats = await listChats(db);
      setChatList(chats);
      setShowHistoryModal(true);
    } catch {
      // ignore
    }
  }, [db]);

  const handleSelectChat = useCallback(
    async (chatId: number) => {
      setShowHistoryModal(false);
      await loadChatById(chatId);
    },
    [db]
  );

  const handleDeleteChat = useCallback(
    async (chatId: number) => {
      Alert.alert("Delete Chat", "Are you sure you want to delete this chat?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteChat(db, chatId);
            const updated = await listChats(db);
            setChatList(updated);
            if (state.currentChatId === chatId) {
              clearChat();
              setChatId(null);
            }
          },
        },
      ]);
    },
    [db, state.currentChatId, clearChat, setChatId]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!apiKey) {
        setShowKeyModal(true);
        return;
      }

      // Create chat if needed
      let chatId = state.currentChatId;
      if (!chatId) {
        const title = text.length > 30 ? text.slice(0, 30) + "..." : text;
        const chat = await createChat(db, title);
        chatId = chat.id;
        setChatId(chatId);
      }

      addUserMessage(text);
      setLoading(true);

      // Save user message
      await addChatMessage(
        db,
        chatId,
        "user",
        JSON.stringify({ text })
      );

      try {
        const { assistantText, updatedHistory } = await sendMessage(
          apiKey,
          state.conversationHistory,
          text,
          db,
          async (toolName, result) => {
            addToolMessage(toolName, result);
            // Save tool message
            await addChatMessage(
              db,
              chatId!,
              "tool",
              JSON.stringify({ text: result, toolName })
            );
          },
          { foodPreferences, allergies }
        );

        setHistory(updatedHistory);
        if (assistantText) {
          addAssistantMessage(assistantText);
          // Save assistant message
          await addChatMessage(
            db,
            chatId,
            "assistant",
            JSON.stringify({ text: assistantText })
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [
      apiKey,
      db,
      state.conversationHistory,
      state.currentChatId,
      addUserMessage,
      addAssistantMessage,
      addToolMessage,
      setHistory,
      setLoading,
      setError,
      setChatId,
      foodPreferences,
      allergies,
    ]
  );

  const handleSendImage = useCallback(
    async (base64: string, mimeType: string) => {
      if (!apiKey) {
        setShowKeyModal(true);
        return;
      }

      let chatId = state.currentChatId;
      if (!chatId) {
        const chat = await createChat(db, "Photo upload");
        chatId = chat.id;
        setChatId(chatId);
      }

      const displayText = "📷 Sent a photo";
      addUserMessage(displayText);
      setLoading(true);

      await addChatMessage(
        db,
        chatId,
        "user",
        JSON.stringify({ text: displayText })
      );

      try {
        const promptText =
          "I just took a photo of food items. Please identify each food item visible and add them all to my fridge using add_to_fridge.";
        const { assistantText, updatedHistory } = await sendMessage(
          apiKey,
          state.conversationHistory,
          promptText,
          db,
          async (toolName, result) => {
            addToolMessage(toolName, result);
            await addChatMessage(
              db,
              chatId!,
              "tool",
              JSON.stringify({ text: result, toolName })
            );
          },
          { foodPreferences, allergies },
          { base64, mimeType }
        );

        setHistory(updatedHistory);
        if (assistantText) {
          addAssistantMessage(assistantText);
          await addChatMessage(
            db,
            chatId,
            "assistant",
            JSON.stringify({ text: assistantText })
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [
      apiKey,
      db,
      state.conversationHistory,
      state.currentChatId,
      addUserMessage,
      addAssistantMessage,
      addToolMessage,
      setHistory,
      setLoading,
      setError,
      setChatId,
      foodPreferences,
      allergies,
    ]
  );

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background, paddingBottom: keyboardHeight }]}
    >
      <ApiKeyModal visible={showKeyModal} onSave={handleSaveApiKey} />

      {/* Header buttons */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleOpenHistory}
        >
          <Ionicons name="time-outline" size={20} color={colors.accent} />
          <Text style={[styles.headerButtonText, { color: colors.accent }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleNewChat}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={[styles.headerButtonText, { color: colors.accent }]}>New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Chat History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chat History</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {chatList.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>No past chats yet.</Text>
            </View>
          ) : (
            <FlatList
              data={chatList}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={[styles.chatRow, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.chatRowContent}
                    onPress={() => handleSelectChat(item.id)}
                  >
                    <Text style={[styles.chatTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.chatDate, { color: colors.textSecondary }]}>
                      {formatDate(item.updated_at)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteChat(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.chatListContent}
            />
          )}
        </View>
      </Modal>

      {state.displayMessages.length === 0 && !state.isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧊</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Hey, I'm Fridgely!</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Tell me what you bought and I'll keep track of your fridge. Ask me
            for recipe suggestions anytime!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={state.displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      {state.isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Thinking...</Text>
        </View>
      )}

      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

      <ChatInput onSend={handleSend} onSendImage={handleSendImage} disabled={state.isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  messageList: {
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  errorContainer: {
    marginHorizontal: 12,
    marginBottom: 4,
    padding: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyHistory: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyHistoryText: {
    fontSize: 15,
  },
  chatListContent: {
    paddingVertical: 8,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  chatRowContent: {
    flex: 1,
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  chatDate: {
    fontSize: 13,
  },
  deleteButton: {
    padding: 8,
  },
});
