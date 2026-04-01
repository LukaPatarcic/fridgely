import React, { useCallback, useState } from "react";
import { View, FlatList, Text, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { useDatabase } from "../../src/context/DatabaseProvider";
import { listItems, removeItem, type FridgeItem } from "../../src/db/repository";
import { FridgeItemRow } from "../../src/components/FridgeItemRow";

export default function FridgeScreen() {
  const db = useDatabase();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🥬</Text>
          <Text style={styles.emptyTitle}>Your fridge is empty</Text>
          <Text style={styles.emptySubtitle}>
            Chat with Fridgely to add items!
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <FridgeItemRow item={item} onDelete={handleDelete} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerText}>
                {items.length} item{items.length !== 1 ? "s" : ""} in your fridge
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "uppercase",
  },
});
