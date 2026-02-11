
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

  start: () => void;
  stop: () => void;
  resetAll: () => void;
  acceptPoint: (p: LatLngPoint) => { accepted: boolean; reason?: string };
  setPreviewRun: (id: string | null) => void;
  hydrateFromExport: (data: { revealed: LatLngPoint[]; runs: RunSummary[] }) => void;
  getLifetimeStats: () => { totalDistance: number; totalRuns: number };
  dismissStorageError: () => void;
};

const persisted =
  typeof window !== "undefined"
    ? loadPersisted()
    : {
      revealed: [],
      runs: [],
      currentStreak: 0,
      lastRunDate: null,
      achievements: [],
      supplyDrops: [],
      lastDropGenerationDate: null
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

function performSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  const state = useRunStore.getState();
  const result = savePersisted({
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
    // Clear error if save succeeds
    useRunStore.setState({ storageError: undefined });
  }
}

// Ensure we save on close/hide
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", performSave);
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
  currentRun: [],
  revealed: persisted.revealed ?? [],
  totalRunMeters: 0,
  runs: persisted.runs ?? [],
  lastAccepted: undefined,
  runStartedAt: undefined,
  previewRunId: null,
  storageError: undefined,
  currentStreak: persisted.currentStreak ?? 0,
  lastRunDate: persisted.lastRunDate ?? null,
  achievements: persisted.achievements ?? [],
  supplyDrops: persisted.supplyDrops ?? [],
  lastDropGenerationDate: persisted.lastDropGenerationDate ?? null,

  start: () => {
    const now = Date.now();

    // Check if we need to generate new drops (once per day)
    const lastGen = get().lastDropGenerationDate;
    let currentDrops = get().supplyDrops;

    // Simple day check
    const needsNewDrops = !lastGen || new Date(lastGen).getDate() !== new Date(now).getDate();

    if (needsNewDrops) {
      // Try to use last known location or default
      const lastKnown = get().runs.at(-1)?.points.at(-1) || { lat: 42.6977, lng: 23.3219, t: now };
      currentDrops = generateDailyDrops(lastKnown); // Generate 3
    } else {
      // Filter expired
      currentDrops = currentDrops.filter(d => d.expiresAt > now);
    }

    set((s) => ({
      ...s,
      isRunning: true,
      currentRun: [],
      totalRunMeters: 0,
      lastAccepted: undefined,
      runStartedAt: now,
      supplyDrops: currentDrops,
      lastDropGenerationDate: needsNewDrops ? now : s.lastDropGenerationDate
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
          totalRunMeters: 0
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

      const newUnlocked = checkNewAchievements(s.achievements, {
        totalDistance,
        totalRuns: runs.length,
        totalRevealed,
        currentStreak: streak,
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
        achievements: [...s.achievements, ...newUnlocked]
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
      lastDropGenerationDate: null
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

      const updatedDrops = drops.map(d => {
        if (!d.collected && checkDropCollection(p, d)) {
          dropCollected = true;
          return { ...d, collected: true };
        }
        return d;
      });

      if (dropCollected) {
        audio.levelUp(); // Reuse sound for now
        // TODO: Add specific XP event
      }

      return {
        ...s,
        lastAccepted: p,
        currentRun: nextRun,
        revealed,
        totalRunMeters: s.totalRunMeters + d,
        supplyDrops: updatedDrops
      };
    });

    scheduleSave();
    audio.unlock();
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

  dismissStorageError: () => set({ storageError: undefined })
}));
