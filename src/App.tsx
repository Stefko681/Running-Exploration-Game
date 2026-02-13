import { useEffect, useState, lazy, Suspense } from "react";
import { AlertTriangle, X, Map, Clock, User, Trophy } from "lucide-react";
import { AchievementToast } from "./components/AchievementToast";
import { useRunStore } from "./state/useRunStore";
import { useThemeStore } from "./state/useThemeStore";
import { useLeaderboardStore } from "./state/useLeaderboardStore";

// Lazy-loaded screen components for optimized bundle performance
const HistoryScreen = lazy(() => import("./screens/HistoryScreen").then(m => ({ default: m.HistoryScreen })));
const MapScreen = lazy(() => import("./screens/MapScreen").then(m => ({ default: m.MapScreen })));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen").then(m => ({ default: m.ProfileScreen })));
const LeaderboardScreen = lazy(() => import("./screens/LeaderboardScreen").then(m => ({ default: m.LeaderboardScreen })));

import { LandingPage } from "./pages/LandingPage";

type TabId = "map" | "history" | "profile" | "leaderboard";

const TABS: { id: TabId; label: string; icon: typeof Map }[] = [
  { id: "map", label: "Map", icon: Map },
  { id: "history", label: "History", icon: Clock },
  { id: "profile", label: "Profile", icon: User },
  { id: "leaderboard", label: "Rankings", icon: Trophy },
];

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

  // Initial Store Hydration  
  useEffect(() => {
    useRunStore.getState().init();
    useLeaderboardStore.getState().initializeAuth(); // Start Auth listener

    // @ts-ignore - Expose store for testing
    window.useRunStore = useRunStore;
  }, []);

  if (showLanding) {
    return <LandingPage onStart={() => {
      localStorage.setItem("fogrun:landingSeen", "1");
      setShowLanding(false);
    }} />;
  }

  return (
    <>
      <div className="app-shell">
        <main className="flex-1 min-h-0">
          <Suspense fallback={<div className="h-full w-full bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs uppercase animate-pulse">Initializing Interface...</div>}>
            {tab === "map" && <MapScreen />}
            {tab === "history" && <HistoryScreen />}
            {tab === "profile" && <ProfileScreen />}
            {tab === "leaderboard" && <LeaderboardScreen />}
          </Suspense>
        </main>

        {/* Mobile Bottom Tab Bar — always visible */}
        <nav className="app-tab-bar safe-pb">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`app-tab-item ${isActive ? "app-tab-active" : ""}`}
              >
                <t.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium mt-0.5">{t.label}</span>
              </button>
            );
          })}
        </nav>
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

      <AchievementToast />
    </>
  );
}

