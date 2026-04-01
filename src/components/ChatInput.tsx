import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendImage: (base64: string, mimeType: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onSendImage, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const { colors } = useTheme();

  const handleCamera = async () => {
    if (disabled) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission",
        "Please allow camera access to take photos of your food."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      onSendImage(result.assets[0].base64, "image/jpeg");
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    // Keep keyboard open after sending so user can continue chatting
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.cameraButton, disabled && styles.sendButtonDisabled]}
        onPress={handleCamera}
        disabled={disabled}
      >
        <Ionicons
          name="camera-outline"
          size={24}
          color={disabled ? "#9CA3AF" : colors.accent}
        />
      </TouchableOpacity>
      <TextInput
        ref={inputRef}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={text}
        onChangeText={setText}
        placeholder="Tell me what's in your fridge..."
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={1000}
        editable={!disabled}
        onSubmitEditing={handleSend}
        blurOnSubmit={Platform.OS !== "ios"}
        returnKeyType="send"
      />
      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: colors.accent }, disabled && styles.sendButtonDisabled]}
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
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
