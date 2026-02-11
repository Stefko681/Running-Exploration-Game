import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import { InstallPrompt } from "./components/InstallPrompt";
import { AchievementToast } from "./components/AchievementToast";
import { HistoryScreen } from "./screens/HistoryScreen";
import { MapScreen } from "./screens/MapScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { useRunStore } from "./state/useRunStore";
import { useThemeStore } from "./state/useThemeStore";

import { LandingPage } from "./pages/LandingPage";

type TabId = "map" | "history" | "profile";

export default function App() {
  const [tab, setTab] = useState<TabId>("map");
  const [showLanding, setShowLanding] = useState(() => {
    return !localStorage.getItem("fogrun:landingSeen");
  });

  const theme = useThemeStore((s) => s.theme);
  const storageError = useRunStore((s) => s.storageError);
  const dismissStorageError = useRunStore((s) => s.dismissStorageError);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Prevent flash of wrong theme by setting it early if possible, but useEffect is fine for now

  if (showLanding) {
    return <LandingPage onStart={() => {
      localStorage.setItem("fogrun:landingSeen", "1");
      setShowLanding(false);
    }} />;
  }

  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">CityQuest</div>
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
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setTab("profile")}
              className={`transition-colors ${tab === "profile" ? "text-app-accent" : "hover:text-slate-300"
                }`}
            >
              Profile
            </button>
          </div>
        </header>
        <main className="flex-1 min-h-0">
          {tab === "map" && <MapScreen />}
          {tab === "history" && <HistoryScreen />}
          {tab === "profile" && <ProfileScreen />}
        </main>
      </div>

      {storageError && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex items-start gap-3 rounded-xl border border-rose-500/50 bg-rose-950/90 p-4 text-rose-200 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-rose-400" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-100">Storage Error</h3>
            <p className="mt-1 text-xs leading-relaxed opacity-90">{storageError}</p>
            <p className="mt-1 text-[10px] opacity-75">
              Your progress may not be saved. Try freeing up space on your device.
            </p>
          </div>
          <button
            onClick={dismissStorageError}
            className="-mr-1 -mt-1 rounded-lg p-2 hover:bg-rose-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <OnboardingOverlay />
      <InstallPrompt />
      <AchievementToast />
    </>
  );
}


