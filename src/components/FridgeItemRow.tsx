import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FridgeItem } from "../db/repository";

interface FridgeItemRowProps {
  item: FridgeItem;
  onDelete: (name: string) => void;
}

export function FridgeItemRow({ item, onDelete }: FridgeItemRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>
          {item.quantity}
          {item.unit ? ` ${item.unit}` : ""}
        </Text>
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    textTransform: "capitalize",
  },
  detail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
});
