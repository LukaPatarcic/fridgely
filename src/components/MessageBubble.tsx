import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ChatMessage } from "../chat/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "tool") {
    return (
      <View style={styles.toolContainer}>
        <Text style={styles.toolLabel}>{message.toolName}</Text>
        <Text style={styles.toolText}>{formatToolResult(message.text)}</Text>
      </View>
    );
  }

  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
        {message.text}
      </Text>
    </View>
  );
}

function formatToolResult(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.item) {
      const { name, quantity, unit } = parsed.item;
      return `Added ${quantity}${unit ? ` ${unit}` : ""} ${name}`;
    }
    if (parsed.removed_count !== undefined) {
      return parsed.message;
    }
    if (parsed.items) {
      if (parsed.total === 0) return "Fridge is empty";
      return parsed.items
        .map(
          (i: { name: string; quantity: number; unit?: string }) =>
            `${i.quantity}${i.unit ? ` ${i.unit}` : ""} ${i.name}`
        )
        .join(", ");
    }
    return raw;
  } catch {
    return raw;
  }
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 4,
    marginHorizontal: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#4F46E5",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: "#1F2937",
  },
  toolContainer: {
    alignSelf: "flex-start",
    marginHorizontal: 12,
    marginVertical: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  toolText: {
    fontSize: 13,
    color: "#065F46",
  },
});
