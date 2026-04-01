import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useDatabase } from "../../src/context/DatabaseProvider";
import { sendMessage } from "../../src/api/claude";
import { useChatReducer } from "../../src/chat/useChatReducer";
import { MessageBubble } from "../../src/components/MessageBubble";
import { ChatInput } from "../../src/components/ChatInput";
import { ApiKeyModal } from "../../src/components/ApiKeyModal";
import type { ChatMessage } from "../../src/chat/types";

const API_KEY_STORE = "fridgely_api_key";

export default function ChatScreen() {
  const db = useDatabase();
  const {
    state,
    addUserMessage,
    addAssistantMessage,
    addToolMessage,
    setHistory,
    setLoading,
    setError,
  } = useChatReducer();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

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

  const handleSaveApiKey = useCallback(async (key: string) => {
    const clean = key.replace(/\s+/g, "");
    await SecureStore.setItemAsync(API_KEY_STORE, clean);
    setApiKey(clean);
    setShowKeyModal(false);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!apiKey) {
        setShowKeyModal(true);
        return;
      }

      addUserMessage(text);
      setLoading(true);

      try {
        const { assistantText, updatedHistory } = await sendMessage(
          apiKey,
          state.conversationHistory,
          text,
          db,
          (toolName, input) => {
            addToolMessage(toolName, JSON.stringify(input));
          }
        );

        setHistory(updatedHistory);
        if (assistantText) {
          addAssistantMessage(assistantText);
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
      addUserMessage,
      addAssistantMessage,
      addToolMessage,
      setHistory,
      setLoading,
      setError,
    ]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ApiKeyModal visible={showKeyModal} onSave={handleSaveApiKey} />

      {state.displayMessages.length === 0 && !state.isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧊</Text>
          <Text style={styles.emptyTitle}>Hey, I'm Fridgely!</Text>
          <Text style={styles.emptySubtitle}>
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
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      )}

      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

      <ChatInput onSend={handleSend} disabled={state.isLoading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#6B7280",
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
    color: "#6B7280",
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
});
