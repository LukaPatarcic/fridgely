import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "@fridgely_theme";

type ThemeMode = "light" | "dark";

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  cardBackground: string;
  tabBarBackground: string;
  headerBackground: string;
  accent: string;
  inputBackground: string;
  inputBorder: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const lightColors: ThemeColors = {
  background: "#FFFFFF",
  surface: "#F9FAFB",
  text: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  cardBackground: "#FFFFFF",
  tabBarBackground: "#FFFFFF",
  headerBackground: "#FFFFFF",
  accent: "#4F46E5",
  inputBackground: "#FFFFFF",
  inputBorder: "#D1D5DB",
};

const darkColors: ThemeColors = {
  background: "#111827",
  surface: "#1F2937",
  text: "#F9FAFB",
  textSecondary: "#9CA3AF",
  border: "#374151",
  cardBackground: "#1F2937",
  tabBarBackground: "#111827",
  headerBackground: "#1F2937",
  accent: "#6366F1",
  inputBackground: "#1F2937",
  inputBorder: "#374151",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  colors: lightColors,
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === "dark" || stored === "light") {
          setTheme(stored);
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  const colors = theme === "light" ? lightColors : darkColors;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
