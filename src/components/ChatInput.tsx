import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    // Keep keyboard open after sending so user can continue chatting
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Tell me what's in your fridge..."
        placeholderTextColor="#9CA3AF"
        multiline
        maxLength={1000}
        editable={!disabled}
        onSubmitEditing={handleSend}
        blurOnSubmit={Platform.OS !== "ios"}
        returnKeyType="send"
      />
      <TouchableOpacity
        style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={disabled || !text.trim()}
      >
        <Ionicons
          name="send"
          size={20}
          color={disabled || !text.trim() ? "#9CA3AF" : "#FFFFFF"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
});
