import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FOOD_PREFS_KEY = "@fridgely_food_preferences";
const ALLERGIES_KEY = "@fridgely_allergies";

interface PreferencesContextType {
  foodPreferences: string;
  allergies: string;
  updateFoodPreferences: (value: string) => void;
  updateAllergies: (value: string) => void;
}

const PreferencesContext = createContext<PreferencesContextType>({
  foodPreferences: "",
  allergies: "",
  updateFoodPreferences: () => {},
  updateAllergies: () => {},
});

export function usePreferences(): PreferencesContextType {
  return useContext(PreferencesContext);
}

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [foodPreferences, setFoodPreferences] = useState("");
  const [allergies, setAllergies] = useState("");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(FOOD_PREFS_KEY),
      AsyncStorage.getItem(ALLERGIES_KEY),
    ]).then(([prefs, allergy]) => {
      if (prefs) setFoodPreferences(prefs);
      if (allergy) setAllergies(allergy);
    });
  }, []);

  const updateFoodPreferences = (value: string) => {
    setFoodPreferences(value);
    AsyncStorage.setItem(FOOD_PREFS_KEY, value);
  };

  const updateAllergies = (value: string) => {
    setAllergies(value);
    AsyncStorage.setItem(ALLERGIES_KEY, value);
  };

  return (
    <PreferencesContext.Provider
      value={{ foodPreferences, allergies, updateFoodPreferences, updateAllergies }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
