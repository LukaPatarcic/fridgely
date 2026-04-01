import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import type { FridgeItem } from "../db/repository";
import { getExpiryLabel, getExpiryStatus } from "../utils/expiryEstimator";

interface FridgeItemRowProps {
  item: FridgeItem;
  onPress: (item: FridgeItem) => void;
  onDelete: (name: string) => void;
  onIncrement: (name: string) => void;
  onDecrement: (name: string, currentQuantity: number) => void;
}

const EXPIRY_COLORS = {
  expired: "#DC2626",
  urgent: "#EA580C",
  soon: "#D97706",
  ok: "#16A34A",
} as const;

export function FridgeItemRow({ item, onPress, onDelete, onIncrement, onDecrement }: FridgeItemRowProps) {
  const { colors } = useTheme();

  const expiryStatus = item.expires_at ? getExpiryStatus(item.expires_at) : null;
  const expiryLabel = item.expires_at ? getExpiryLabel(item.expires_at) : null;
  const expiryColor = expiryStatus ? EXPIRY_COLORS[expiryStatus] : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      style={[
        styles.row,
        { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
        expiryStatus === "expired" && styles.expiredRow,
        expiryStatus === "urgent" && styles.urgentRow,
      ]}
    >
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          {expiryStatus === "expired" && (
            <View style={[styles.badge, { backgroundColor: EXPIRY_COLORS.expired }]}>
              <Text style={styles.badgeText}>EXPIRED</Text>
            </View>
          )}
          {expiryStatus === "urgent" && (
            <View style={[styles.badge, { backgroundColor: EXPIRY_COLORS.urgent }]}>
              <Text style={styles.badgeText}>USE SOON</Text>
            </View>
          )}
        </View>
        <View style={styles.detailRow}>
          {item.unit ? (
            <Text style={[styles.detail, { color: colors.textSecondary }]}>{item.unit}</Text>
          ) : null}
          {expiryLabel ? (
            <Text style={[styles.expiryText, { color: expiryColor }]}>{expiryLabel}</Text>
          ) : null}
        </View>
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
    </TouchableOpacity>
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
  expiredRow: {
    backgroundColor: "rgba(220, 38, 38, 0.06)",
  },
  urgentRow: {
    backgroundColor: "rgba(234, 88, 12, 0.06)",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  detail: {
    fontSize: 14,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: "500",
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
