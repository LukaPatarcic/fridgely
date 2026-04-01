import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { useTheme } from "../../src/context/ThemeProvider";
import { usePreferences } from "../../src/context/PreferencesProvider";
import { ApiKeyModal } from "../../src/components/ApiKeyModal";

const API_KEY_STORE = "fridgely_api_key";

export default function SettingsScreen() {
  const { theme, toggleTheme, colors } = useTheme();
  const { foodPreferences, allergies, updateFoodPreferences, updateAllergies } =
    usePreferences();
  const [showKeyModal, setShowKeyModal] = useState(false);

  const handleSaveApiKey = useCallback(async (key: string) => {
    const clean = key.replace(/\s+/g, "");
    await SecureStore.setItemAsync(API_KEY_STORE, clean);
    setShowKeyModal(false);
  }, []);

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? "1.0.0";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.content}
    >
      <ApiKeyModal visible={showKeyModal} onSave={handleSaveApiKey} />

      {/* Appearance */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        Appearance
      </Text>
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={theme === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ false: "#D1D5DB", true: "#6366F1" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Food Preferences */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        Food Preferences
      </Text>
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          E.g. vegetarian, low-carb, keto, Mediterranean
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
          value={foodPreferences}
          onChangeText={updateFoodPreferences}
          placeholder="Enter your dietary preferences..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>

      {/* Allergies */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        Allergies
      </Text>
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          E.g. nuts, dairy, gluten, shellfish
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
          value={allergies}
          onChangeText={updateAllergies}
          placeholder="Enter your allergies..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>

      {/* API Key */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        API Key
      </Text>
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={() => setShowKeyModal(true)}
        >
          <Text style={styles.buttonText}>Update API Key</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        About
      </Text>
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>App Name</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>
            Fridgely
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>Version</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>
            {appVersion}
          </Text>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 44,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    marginVertical: 12,
  },
  bottomSpacer: {
    height: 40,
  },
});
