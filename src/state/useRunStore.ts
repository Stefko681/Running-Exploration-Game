
import { create } from "zustand";
import { GPS_MAX_SPEED_M_PER_S, GPS_MIN_STEP_METERS } from "../config";
import type { LatLngPoint, RunSummary } from "../types";
import { audio } from "../utils/audio";
import { haversineMeters } from "../utils/geo";
import { checkNewAchievements } from "../utils/achievements";
import { generateDailyDrops, checkDropCollection, type SupplyDrop } from "../utils/supplyDrops";
import { loadPersisted, savePersisted } from "./storage";

type RunState = {
  isRunning: boolean;
  currentRun: LatLngPoint[];
  revealed: LatLngPoint[];
  totalRunMeters: number;
  /** List of completed runs for history/dashboard */
  runs: RunSummary[];
  lastAccepted?: LatLngPoint;
  runStartedAt?: number;
  /** Id of run selected for preview on the map from history */
  previewRunId?: string | null;
  /** Error message if storage quota is exceeded or fails */
  storageError?: string;

  // Gamification
  currentStreak: number;
  lastRunDate: number | null; // Epoch ms of the last completed run
  achievements: string[]; // IDs of unlocked achievements

  // Supply Drops
  supplyDrops: SupplyDrop[];
  lastDropGenerationDate: number | null;
  lastCollectedDrop: SupplyDrop | null; // For toast notification
  lastDropReward?: { title: string; message: string } | null;
  dropDifficulty: number; // 1 = normal, 2 = hard, etc.

  start: () => void;
  stop: () => void;
  resetAll: () => void;
  acceptPoint: (p: LatLngPoint) => { accepted: boolean; reason?: string };
  setPreviewRun: (id: string | null) => void;
  hydrateFromExport: (data: { revealed: LatLngPoint[]; runs: RunSummary[] }) => void;
  getLifetimeStats: () => { totalDistance: number; totalRuns: number };
  dismissStorageError: () => void;
  clearLastCollectedDrop: () => void;
  deleteRun: (id: string) => void;
  refreshDrops: (location: LatLngPoint) => void;
  /** Async hydration from IndexedDB */
  init: () => Promise<void>;
  isHydrated: boolean;
};



// Throttling mechanism for persistence
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DELAY_MS = 5000;

function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    performSave();
  }, SAVE_DELAY_MS);
}

async function performSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  const state = useRunStore.getState();
  if (!state.isHydrated) return; // Don't overwrite if not loaded yet

  const result = await savePersisted({
    revealed: state.revealed,
    runs: state.runs,
    currentStreak: state.currentStreak,
    lastRunDate: state.lastRunDate,
    achievements: state.achievements,
    supplyDrops: state.supplyDrops,
    lastDropGenerationDate: state.lastDropGenerationDate
  });
  if (!result.success && result.error) {
    useRunStore.setState({ storageError: result.error });
  } else if (result.success && state.storageError) {
    useRunStore.setState({ storageError: undefined });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    performSave();
  });
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      performSave();
    }
  });
}

// Helper: Check if two timestamps are on the same local calendar day
function isSameDay(t1: number, t2: number) {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// Helper: Check if t1 is exactly 1 day after t2 (calendar-wise)
function isNextDay(t1: number, t2: number) {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  d2.setDate(d2.getDate() + 1); // Add 1 day to t2
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export const useRunStore = create<RunState>((set, get) => ({
  isRunning: false,
  isHydrated: false,
  currentRun: [],
  revealed: [],
  totalRunMeters: 0,
  runs: [],
  lastAccepted: undefined,
  runStartedAt: undefined,
  previewRunId: null,
  storageError: undefined,
  currentStreak: 0,
  lastRunDate: null,
  achievements: [],
  supplyDrops: [],
  lastDropGenerationDate: null,

  init: async () => {
    if (get().isHydrated) return;
    const data = await loadPersisted();
    set({
      ...data,
      isHydrated: true
    });
  },
  lastCollectedDrop: null,
  dropDifficulty: 1,

  clearLastCollectedDrop: () => set({ lastCollectedDrop: null }),

  start: () => {
    const now = Date.now();

    // Only generate if we have none (e.g. first run)
    // MapScreen.tsx will now call refreshDrops independently
    if (get().supplyDrops.length === 0) {
      const lastKnown = get().runs.at(-1)?.points.at(-1) || { lat: 42.6977, lng: 23.3219, t: now };
      const currentDrops = generateDailyDrops(lastKnown);
      set({ supplyDrops: currentDrops, lastDropGenerationDate: now });
    }

    set((s) => ({
      ...s,
      isRunning: true,
      currentRun: [],
      totalRunMeters: 0,
      lastAccepted: undefined,
      runStartedAt: now,
    }));
    audio.startRun();
  },

  stop: () => {
    set((s) => {
      // If we weren't actually running or have too few points, just stop without recording
      if (!s.isRunning || s.currentRun.length < 2 || !s.runStartedAt) {
        return {
          ...s,
          isRunning: false,
          lastAccepted: undefined,
          runStartedAt: undefined,
          currentRun: [],
          totalRunMeters: 0,
          supplyDrops: [] // Clear drops on invalid stop too
        };
      }

      const endedAt = s.currentRun[s.currentRun.length - 1]!.t;
      const summary: RunSummary = {
        id: `${s.runStartedAt}-${endedAt}`,
        startedAt: s.runStartedAt,
        endedAt,
        distanceMeters: s.totalRunMeters,
        points: s.currentRun
      };

      const runs = [...s.runs, summary];

      // Streak Logic
      let streak = s.currentStreak;
      const now = Date.now();

      if (!s.lastRunDate) {
        // First ever run
        streak = 1;
      } else {
        if (isSameDay(now, s.lastRunDate)) {
          // Already ran today, maintain streak
          // do nothing
        } else if (isNextDay(now, s.lastRunDate)) {
          // Ran yesterday, streak continues!
          streak += 1;
        } else {
          // Missed a day or more, reset execution
          streak = 1;
        }
      }

      // Check for new achievements
      const totalDistance = runs.reduce((acc, r) => acc + r.distanceMeters, 0);
      const totalRevealed = s.revealed.length; // Approximation
      const totalSupplyDrops = s.supplyDrops.filter(d => d.collected).length;

      const newUnlocked = checkNewAchievements(s.achievements, {
        totalDistance,
        totalRuns: runs.length,
        totalRevealed,
        currentStreak: streak,
        totalSupplyDrops,
        lastRun: summary
      });

      if (newUnlocked.length > 0) {
        audio.levelUp();
      }

      return {
        ...s,
        isRunning: false,
        lastAccepted: undefined,
        runStartedAt: undefined,
        currentRun: [],
        totalRunMeters: 0,
        runs,
        currentStreak: streak,
        lastRunDate: now,
        achievements: [...s.achievements, ...newUnlocked],
        // supplyDrops: [] // DROPS PERSIST NOW
      };
    });
    // Force immediate save on stop
    performSave();
    audio.stopRun();
  },

  resetAll: () => {
    const next = {
      isRunning: false,
      currentRun: [],
      revealed: [],
      totalRunMeters: 0,
      runs: [],
      lastAccepted: undefined,
      runStartedAt: undefined,
      previewRunId: null,
      storageError: undefined,
      currentStreak: 0,
      lastRunDate: null,
      achievements: [],
      supplyDrops: [],
      lastDropGenerationDate: null,
      lastCollectedDrop: null,
      dropDifficulty: 1
    };
    set(next);
    // Force immediate save
    performSave();
  },

  acceptPoint: (p) => {
    const { lastAccepted, isRunning } = get();
    if (!isRunning) return { accepted: false, reason: "not_running" };

    // First accepted point
    if (!lastAccepted) {
      set((s) => {
        const revealed = [...s.revealed, p];
        return { ...s, lastAccepted: p, currentRun: [p], revealed };
      });
      scheduleSave();
      return { accepted: true };
    }

    const dtMs = Math.max(1, p.t - lastAccepted.t);
    const dtSec = dtMs / 1000;
    const d = haversineMeters(lastAccepted, p);

    // GPS noise filter: ignore huge jumps
    const speed = d / dtSec;
    if (speed > GPS_MAX_SPEED_M_PER_S) return { accepted: false, reason: "gps_jump" };

    // Ignore micro jitter
    if (d < GPS_MIN_STEP_METERS) return { accepted: false, reason: "too_small" };

    set((s) => {
      const nextRun = [...s.currentRun, p];
      const revealed = [...s.revealed, p];

      // Check supply drops
      let drops = s.supplyDrops;
      let dropCollected = false;
      let collectedDrop: SupplyDrop | null = null;
      let activeDropsCount = 0;

      const updatedDrops = drops.map(d => {
        if (!d.collected) {
          if (checkDropCollection(p, d)) {
            dropCollected = true;
            collectedDrop = d;
            return { ...d, collected: true };
          } else {
            activeDropsCount++;
          }
        }
        return d;
      });

      let finalDrops = updatedDrops;
      let currentDifficulty = s.dropDifficulty;

      // If all active drops were just collected (activeDropsCount went to 0) and we had drops to begin with
      if (drops.length > 0 && activeDropsCount === 0 && dropCollected) {
        // Respawn logic
        currentDifficulty += 1;
        const newRadius = 1500 + (currentDifficulty * 500);
        const newDrops = generateDailyDrops(p, 3, newRadius);
        finalDrops = [...updatedDrops, ...newDrops];
        audio.levelUp(); // Sound for "Wave Clear"
      } else if (dropCollected) {
        audio.unlock(); // Sound for single drop
      }

      return {
        ...s,
        lastAccepted: p,
        currentRun: nextRun,
        revealed,
        totalRunMeters: s.totalRunMeters + d,
        supplyDrops: finalDrops,
        lastCollectedDrop: collectedDrop || s.lastCollectedDrop,
        dropDifficulty: currentDifficulty,
        // Specific Reward feedback
        lastDropReward: dropCollected ? {
          title: "Supply Collected!",
          message: "Bonus +100 Exploration XP added."
        } : s.lastDropReward
      };
    });

    scheduleSave();
    return { accepted: true };
  },

  setPreviewRun: (id) =>
    set((s) => ({
      ...s,
      previewRunId: id
    })),

  hydrateFromExport: (data) => {
    set((s) => ({
      ...s,
      revealed: data.revealed ?? [],
      runs: data.runs ?? []
    }));
    performSave();
  },

  getLifetimeStats: () => {
    const { runs } = get();
    const totalDistance = runs.reduce((acc, r) => acc + r.distanceMeters, 0);
    return { totalDistance, totalRuns: runs.length };
  },

  dismissStorageError: () => set({ storageError: undefined }),

  deleteRun: (id) => {
    set((s) => ({
      ...s,
      runs: s.runs.filter((r) => r.id !== id),
    }));
    performSave();
  },

  refreshDrops: (location) => {
    const { lastDropGenerationDate } = get();
    const now = Date.now();

    // Refresh if no drops or if older than 12 hours
    const shouldRefresh = !lastDropGenerationDate || (now - lastDropGenerationDate > 12 * 3600 * 1000);

    if (shouldRefresh) {
      const newDrops = generateDailyDrops(location);
      set({ supplyDrops: newDrops, lastDropGenerationDate: now });
      performSave();
    }
  },
}));
