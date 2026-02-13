import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeId = "cyberpunk" | "matrix" | "vaporwave" | "daylight";

type ThemeState = {
    theme: ThemeId;
    setTheme: (theme: ThemeId) => void;
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: "cyberpunk",
            setTheme: (theme) => set({ theme })
        }),
        {
            name: "fogrun:theme"
        }
    )
);
