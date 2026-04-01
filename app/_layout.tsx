import { Slot } from "expo-router";
import { DatabaseProvider } from "../src/context/DatabaseProvider";
import { ThemeProvider } from "../src/context/ThemeProvider";
import { PreferencesProvider } from "../src/context/PreferencesProvider";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <DatabaseProvider>
          <Slot />
        </DatabaseProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
