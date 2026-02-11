import { useState } from "react";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import { HistoryScreen } from "./screens/HistoryScreen";
import { MapScreen } from "./screens/MapScreen";

type TabId = "map" | "history";

export default function App() {
  const [tab, setTab] = useState<TabId>("map");

  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">City Fog of War</div>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <button
              type="button"
              onClick={() => setTab("map")}
              className={`transition-colors ${
                tab === "map" ? "text-cyan-300" : "hover:text-slate-300"
              }`}
            >
              Map
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`transition-colors ${
                tab === "history" ? "text-cyan-300" : "hover:text-slate-300"
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


