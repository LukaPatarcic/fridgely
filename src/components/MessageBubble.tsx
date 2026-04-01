import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
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

  if (isUser) {
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <Text style={[styles.text, styles.userText]}>{message.text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubble, styles.assistantBubble]}>
      <Markdown style={markdownStyles}>{message.text}</Markdown>
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

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: "#1F2937",
  },
  heading1: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
    marginTop: 8,
  },
  heading2: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
    marginTop: 6,
  },
  heading3: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    marginTop: 4,
  },
  strong: {
    fontWeight: "700",
  },
  em: {
    fontStyle: "italic",
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  code_inline: {
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 14,
    fontFamily: "monospace",
    color: "#1F2937",
  },
  fence: {
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    fontSize: 14,
    fontFamily: "monospace",
    color: "#1F2937",
  },
  code_block: {
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    fontSize: 14,
    fontFamily: "monospace",
    color: "#1F2937",
  },
  blockquote: {
    backgroundColor: "#E5E7EB",
    borderLeftWidth: 3,
    borderLeftColor: "#4F46E5",
    paddingLeft: 10,
    marginVertical: 4,
  },
  link: {
    color: "#4F46E5",
    textDecorationLine: "underline",
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 4,
  },
});

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
