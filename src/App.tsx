import { useEffect, useState } from "react";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import { HistoryScreen } from "./screens/HistoryScreen";
import { MapScreen } from "./screens/MapScreen";
import { useThemeStore } from "./state/useThemeStore";

type TabId = "map" | "history";

export default function App() {
  const [tab, setTab] = useState<TabId>("map");
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Prevent flash of wrong theme by setting it early if possible, but useEffect is fine for now

  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">City Fog of War</div>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <button
              type="button"
              onClick={() => setTab("map")}
              className={`transition-colors ${tab === "map" ? "text-app-accent" : "hover:text-slate-300"
                }`}
            >
              Map
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`transition-colors ${tab === "history" ? "text-app-accent" : "hover:text-slate-300"
                }`}
            >
              History
            </button>
          </div>
        </header>
        <main className="flex-1 min-h-0">
          {tab === "map" ? <MapScreen /> : <HistoryScreen />}
        </main>
      </div>
      <OnboardingOverlay />
    </>
  );
}


