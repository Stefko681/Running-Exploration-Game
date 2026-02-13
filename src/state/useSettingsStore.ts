import { create } from "zustand";

const SETTINGS_KEY = "fogrun:settings:v2";

export type CityId = "sofia" | "varna" | "plovdiv" | "burgas" | "ruse" | "stara_zagora";
export type HudMode = "full" | "minimal";

// Approximate exploration cell counts per city
export const CITY_CELL_COUNTS: Record<CityId, number> = {
  sofia: 98000,
  varna: 12000,
  plovdiv: 8000,
  burgas: 10000,
  ruse: 7000,
  stara_zagora: 5000,
};

export const CITY_LABELS: Record<CityId, string> = {
  sofia: "София",
  varna: "Варна",
  plovdiv: "Пловдив",
  burgas: "Бургас",
  ruse: "Русе",
  stara_zagora: "Стара Загора",
};

type SettingsState = {
  /** Preferred zoom level when starting a run (approx. run area size). */
  runZoom: number;
  /** User weight in kg for calorie estimation */
  weightKg: number;
  /** Selected city for exploration percentage calculation */
  selectedCity: CityId;
  /** HUD display mode */
  hudMode: HudMode;
  setRunZoom: (zoom: number) => void;
  setWeightKg: (weight: number) => void;
  setSelectedCity: (city: CityId) => void;
  setHudMode: (mode: HudMode) => void;
};

type PersistedSettings = {
  runZoom?: number;
  weightKg?: number;
  selectedCity?: CityId;
  hudMode?: HudMode;
};

function loadInitialSettings(): Pick<SettingsState, "runZoom" | "weightKg" | "selectedCity" | "hudMode"> {
  const defaults = { runZoom: 13, weightKg: 70, selectedCity: "sofia" as CityId, hudMode: "full" as HudMode };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as PersistedSettings;
    return {
      runZoom: typeof parsed.runZoom === "number" ? parsed.runZoom : 13,
      weightKg: typeof parsed.weightKg === "number" ? parsed.weightKg : 70,
      selectedCity: parsed.selectedCity || "sofia",
      hudMode: parsed.hudMode || "full",
    };
  } catch {
    return defaults;
  }
}

function persistSettings(state: SettingsState) {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        runZoom: state.runZoom,
        weightKg: state.weightKg,
        selectedCity: state.selectedCity,
        hudMode: state.hudMode,
      })
    );
  } catch {
    // ignore persistence issues
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadInitialSettings(),
  setRunZoom: (zoom) => {
    set({ runZoom: zoom });
    persistSettings(get());
  },
  setWeightKg: (weight) => {
    set({ weightKg: Math.max(30, Math.min(300, weight)) });
    persistSettings(get());
  },
  setSelectedCity: (city) => {
    set({ selectedCity: city });
    persistSettings(get());
  },
  setHudMode: (mode) => {
    set({ hudMode: mode });
    persistSettings(get());
  },
}));

