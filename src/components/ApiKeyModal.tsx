import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeProvider";

interface ApiKeyModalProps {
  visible: boolean;
  onSave: (key: string) => void;
}

export function ApiKeyModal({ visible, onSave }: ApiKeyModalProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const { colors } = useTheme();

  const isValid = key.replace(/\s+/g, "").startsWith("sk-ant-");

  const handleSave = () => {
    const cleaned = key.replace(/\s+/g, "");
    if (!cleaned.startsWith("sk-ant-")) {
      setError("API key must start with \"sk-ant-\"");
      return;
    }
    setError("");
    onSave(cleaned);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to Fridgely!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your Anthropic API key to get started. Your key is stored
            securely on your device.
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={key}
            onChangeText={(t) => { setKey(t); setError(""); }}
            placeholder="sk-ant-..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }, !isValid && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!isValid}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
});
