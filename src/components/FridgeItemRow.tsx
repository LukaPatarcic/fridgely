import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import type { FridgeItem } from "../db/repository";

interface FridgeItemRowProps {
  item: FridgeItem;
  onDelete: (name: string) => void;
  onIncrement: (name: string) => void;
  onDecrement: (name: string, currentQuantity: number) => void;
}

export function FridgeItemRow({ item, onDelete, onIncrement, onDecrement }: FridgeItemRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>
          {item.unit ? `${item.unit}` : ""}
        </Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          onPress={() => onDecrement(item.name, item.quantity)}
          style={styles.quantityButton}
        >
          <Ionicons name="remove-circle-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.quantityText, { color: colors.text }]}>{item.quantity}</Text>
        <TouchableOpacity
          onPress={() => onIncrement(item.name)}
          style={styles.quantityButton}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={() => onDelete(item.name)}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  detail: {
    fontSize: 14,
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 28,
    textAlign: "center",
  },
  deleteButton: {
    padding: 8,
  },
});
