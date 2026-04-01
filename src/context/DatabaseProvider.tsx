import React, { createContext, useContext, useEffect, useState } from "react";
import * as SQLite from "expo-sqlite";
import { initializeDatabase } from "../db/schema";

type DatabaseContextType = SQLite.SQLiteDatabase | null;

const DatabaseContext = createContext<DatabaseContextType>(null);

export function useDatabase(): SQLite.SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const database = await SQLite.openDatabaseAsync("fridgely.db");
      await initializeDatabase(database);
      if (mounted) setDb(database);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!db) return null;

  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
}
