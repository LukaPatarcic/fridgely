import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useDatabase } from "../../src/context/DatabaseProvider";
import { useTheme } from "../../src/context/ThemeProvider";
import {
  listItems,
  removeItem,
  addItem,
  updateItemQuantity,
  decrementItemQuantity,
  type FridgeItem,
} from "../../src/db/repository";
import { FridgeItemRow } from "../../src/components/FridgeItemRow";
import { estimateExpiryDate, daysUntilExpiry, getExpiryLabel, getExpiryStatus } from "../../src/utils/expiryEstimator";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr.replace(" ", "T"));
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FridgeScreen() {
  const db = useDatabase();
  const { colors, theme } = useTheme();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [selectedItem, setSelectedItem] = useState<FridgeItem | null>(null);

  const loadItems = useCallback(async () => {
    const data = await listItems(db);
    setItems(data);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  const handleDelete = useCallback(
    async (name: string) => {
      await removeItem(db, name);
      await loadItems();
    },
    [db, loadItems]
  );

  const handleIncrement = useCallback(
    async (name: string) => {
      const item = items.find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      );
      if (item) {
        await updateItemQuantity(db, name, item.quantity + 1);
        await loadItems();
      }
    },
    [db, items, loadItems]
  );

  const handleDecrement = useCallback(
    async (name: string, currentQuantity: number) => {
      if (currentQuantity <= 1) {
        await removeItem(db, name);
      } else {
        await updateItemQuantity(db, name, currentQuantity - 1);
      }
      await loadItems();
    },
    [db, loadItems]
  );

  const handleAddItem = useCallback(async () => {
    const name = newItemName.trim();
    if (!name) return;
    const quantity = parseInt(newItemQuantity, 10) || 1;
    const unit = newItemUnit.trim() || undefined;
    const expiresAt = estimateExpiryDate(name) ?? undefined;
    await addItem(db, name, quantity, unit, expiresAt);
    setModalVisible(false);
    setNewItemName("");
    setNewItemQuantity("1");
    setNewItemUnit("");
    await loadItems();
  }, [db, newItemName, newItemQuantity, newItemUnit, loadItems]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🥬</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your fridge is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Chat with Fridgely to add items or tap + below!
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <FridgeItemRow
              item={item}
              onPress={setSelectedItem}
              onDelete={handleDelete}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>
                {items.length} item{items.length !== 1 ? "s" : ""} in your fridge
              </Text>
              {(() => {
                const expiringSoon = items.filter(
                  (i) => i.expires_at && daysUntilExpiry(i.expires_at) <= 2
                ).length;
                if (expiringSoon === 0) return null;
                return (
                  <View style={styles.expiryBanner}>
                    <Ionicons name="warning" size={14} color="#EA580C" />
                    <Text style={styles.expiryBannerText}>
                      {expiringSoon} item{expiringSoon !== 1 ? "s" : ""} expiring soon — use first!
                    </Text>
                  </View>
                );
              })()}
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={selectedItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedItem(null)}
        >
          <View style={styles.modalBackdrop} />
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedItem && (() => {
              const status = selectedItem.expires_at ? getExpiryStatus(selectedItem.expires_at) : null;
              const statusColors: Record<string, string> = {
                expired: "#DC2626",
                urgent: "#EA580C",
                soon: "#D97706",
                ok: "#16A34A",
              };
              return (
                <>
                  <View style={styles.detailHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {selectedItem.name}
                    </Text>
                    {status && status !== "ok" && (
                      <View style={[styles.detailBadge, { backgroundColor: statusColors[status] }]}>
                        <Text style={styles.detailBadgeText}>
                          {status === "expired" ? "EXPIRED" : status === "urgent" ? "USE SOON" : "EXPIRING SOON"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={[styles.detailCard, { backgroundColor: colors.inputBackground }]}>
                      <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedItem.quantity}{selectedItem.unit ? ` ${selectedItem.unit}` : ""}
                      </Text>
                    </View>

                    <View style={[styles.detailCard, { backgroundColor: colors.inputBackground }]}>
                      <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Added</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {formatDate(selectedItem.added_at)}
                      </Text>
                    </View>

                    <View style={[styles.detailCard, { backgroundColor: colors.inputBackground }]}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={status ? statusColors[status] : colors.textSecondary}
                      />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expires</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          { color: status ? statusColors[status] : colors.text },
                        ]}
                      >
                        {selectedItem.expires_at
                          ? formatDate(selectedItem.expires_at)
                          : "Unknown"}
                      </Text>
                    </View>

                    <View style={[styles.detailCard, { backgroundColor: colors.inputBackground }]}>
                      <Ionicons
                        name="hourglass-outline"
                        size={20}
                        color={status ? statusColors[status] : colors.textSecondary}
                      />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          { color: status ? statusColors[status] : colors.text },
                        ]}
                      >
                        {selectedItem.expires_at
                          ? getExpiryLabel(selectedItem.expires_at)
                          : "No expiry set"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.detailDeleteButton}
                    onPress={() => {
                      handleDelete(selectedItem.name);
                      setSelectedItem(null);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.detailDeleteText}>Remove from Fridge</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Item</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Item Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
              placeholder="e.g. Milk"
              placeholderTextColor={colors.textSecondary}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unit (optional)</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                  placeholder="e.g. lbs"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  !newItemName.trim() && styles.addButtonDisabled,
                ]}
                onPress={handleAddItem}
                disabled={!newItemName.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  expiryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "rgba(234, 88, 12, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  expiryBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EA580C",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  detailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  detailCard: {
    width: "47%",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    marginTop: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  detailDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 10,
  },
  detailDeleteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
