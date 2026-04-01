import { Slot } from "expo-router";
import { DatabaseProvider } from "../src/context/DatabaseProvider";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Slot />
    </DatabaseProvider>
  );
}
