import { create } from "zustand";

const SETTINGS_KEY = "fogrun:settings:v1";

type SettingsState = {
  /** Preferred zoom level when starting a run (approx. run area size). */
  runZoom: number;
  setRunZoom: (zoom: number) => void;
};

function loadInitialSettings(): Pick<SettingsState, "runZoom"> {
  if (typeof window === "undefined") {
    return { runZoom: 13 };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { runZoom: 13 };
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    const z = typeof parsed.runZoom === "number" ? parsed.runZoom : 13;
    return { runZoom: z };
  } catch {
    return { runZoom: 13 };
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadInitialSettings(),
  setRunZoom: (zoom) => {
    set({ runZoom: zoom });
    try {
      const current = get();
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          runZoom: current.runZoom
        })
      );
    } catch {
      // ignore persistence issues
    }
  }
}));

