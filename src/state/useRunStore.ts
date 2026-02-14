
import { create } from "zustand";
import { GPS_MAX_SPEED_M_PER_S, GPS_MIN_STEP_METERS } from "../config";
import type { LatLngPoint, RunSummary } from "../types";
import { audio } from "../utils/audio";
import { haversineMeters } from "../utils/geo";
import { checkNewAchievements } from "../utils/achievements";
import { generateDailyDrops, isNearDrop, type SupplyDrop } from "../utils/supplyDrops";
import { loadPersisted, savePersisted } from "./storage";
import { useDistrictStore } from "./useDistrictStore";

type RunState = {
  isRunning: boolean;
  currentRun: LatLngPoint[];
  revealed: LatLngPoint[];
  totalRunMeters: number;
  runs: RunSummary[];
  lastAccepted?: LatLngPoint;
  runStartedAt?: number;
  previewRunId?: string | null;
  storageError?: string;

  // Pause/Resume
  isPaused: boolean;
  pausedAt?: number;
  pausedDuration: number; // total ms spent paused during current run

  // Gamification
  currentStreak: number;
  bestStreak: number;
  lastRunDate: number | null;
  achievements: string[];
  bonusXP: number; // accumulated from supply drop rewards

  // Supply Drops
  supplyDrops: SupplyDrop[];
  lastDropGenerationDate: number | null;
  lastCollectedDrop: SupplyDrop | null;
  lastDropReward?: { title: string; message: string; icon: string } | null;
  dropDifficulty: number;

  // Streak Shield & Fog Boost from drops
  hasStreakShield: boolean;
  fogBoostRemaining: number; // points remaining with 2x brush

  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  resetAll: () => void;
  acceptPoint: (p: LatLngPoint) => { accepted: boolean; reason?: string };
  setPreviewRun: (id: string | null) => void;
  hydrateFromExport: (data: { revealed: LatLngPoint[]; runs: RunSummary[] }) => void;
  getLifetimeStats: () => { totalDistance: number; totalRuns: number };
  dismissStorageError: () => void;
  clearLastCollectedDrop: () => void;
  deleteRun: (id: string) => void;
  refreshDrops: (location: LatLngPoint) => void;
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
  if (!state.isHydrated) return;

  const result = await savePersisted({
    revealed: state.revealed,
    runs: state.runs,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    lastRunDate: state.lastRunDate,
    achievements: state.achievements,
    supplyDrops: state.supplyDrops,
    lastDropGenerationDate: state.lastDropGenerationDate,
    bonusXP: state.bonusXP,
    hasStreakShield: state.hasStreakShield,
    fogBoostRemaining: state.fogBoostRemaining,
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
  d2.setDate(d2.getDate() + 1);
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

  // Pause
  isPaused: false,
  pausedAt: undefined,
  pausedDuration: 0,

  // Gamification
  currentStreak: 0,
  bestStreak: 0,
  lastRunDate: null,
  achievements: [],
  bonusXP: 0,

  // Supply Drops
  supplyDrops: [],
  lastDropGenerationDate: null,
  lastCollectedDrop: null,
  dropDifficulty: 1,

  // Drop rewards
  hasStreakShield: false,
  fogBoostRemaining: 0,

  init: async () => {
    if (get().isHydrated) return;
    const data = await loadPersisted();
    set({
      ...data,
      bonusXP: data.bonusXP ?? 0,
      bestStreak: data.bestStreak ?? 0,
      hasStreakShield: data.hasStreakShield ?? false,
      fogBoostRemaining: data.fogBoostRemaining ?? 0,
      isHydrated: true
    });

    // Generate supply drops on load if none were persisted
    if (!data.supplyDrops || data.supplyDrops.length === 0) {
      const lastKnown = data.runs?.at(-1)?.points.at(-1) || { lat: 42.6977, lng: 23.3219, t: Date.now() };
      const drops = generateDailyDrops(lastKnown);
      set({ supplyDrops: drops, lastDropGenerationDate: Date.now() });
    }

    // Check streak expiration on init
    const state = get();
    if (state.lastRunDate) {
      const now = Date.now();
      if (!isSameDay(now, state.lastRunDate) && !isNextDay(now, state.lastRunDate)) {
        // Streak has expired since last session
        if (state.hasStreakShield && state.currentStreak > 0) {
          // Use streak shield to preserve streak
          set({ hasStreakShield: false });
        } else {
          set({ currentStreak: 0 });
        }
      }
    }

    // Check cumulative achievements on hydration (Fix #7)
    const hydratedState = get();
    if (hydratedState.runs.length > 0) {
      const totalDistance = hydratedState.runs.reduce((acc, r) => acc + r.distanceMeters, 0);
      let unlockedDistricts = 0;
      let totalDistricts = 0;
      try {
        const ds = useDistrictStore.getState();
        unlockedDistricts = ds.unlockedDistricts?.length ?? 0;
        totalDistricts = ds.districts?.length ?? 0;
      } catch { /* ignore */ }

      const newUnlocked = checkNewAchievements(hydratedState.achievements, {
        totalDistance,
        totalRuns: hydratedState.runs.length,
        totalRevealed: hydratedState.revealed.length,
        currentStreak: hydratedState.currentStreak,
        totalSupplyDrops: hydratedState.supplyDrops.filter(d => d.collected).length,
        unlockedDistricts,
        totalDistricts,
        lastRun: null as any // No lastRun for hydration check — only cumulative achievements
      });

      if (newUnlocked.length > 0) {
        set({ achievements: [...hydratedState.achievements, ...newUnlocked] });
        performSave();
      }
    }
  },

  clearLastCollectedDrop: () => set({ lastCollectedDrop: null }),

  start: () => {
    const now = Date.now();

    if (get().supplyDrops.length === 0) {
      const lastKnown = get().runs.at(-1)?.points.at(-1) || { lat: 42.6977, lng: 23.3219, t: now };
      const currentDrops = generateDailyDrops(lastKnown);
      set({ supplyDrops: currentDrops, lastDropGenerationDate: now });
    }

    set((s) => ({
      ...s,
      isRunning: true,
      isPaused: false,
      pausedAt: undefined,
      pausedDuration: 0,
      currentRun: [],
      totalRunMeters: 0,
      lastAccepted: undefined,
      runStartedAt: now,
    }));
    audio.startRun();
    audio.startBackgroundLoop();
  },

  pause: () => {
    const { isRunning, isPaused } = get();
    if (!isRunning || isPaused) return;
    set({ isPaused: true, pausedAt: Date.now() });
  },

  resume: () => {
    const { isRunning, isPaused, pausedAt } = get();
    if (!isRunning || !isPaused) return;
    const additionalPause = pausedAt ? Date.now() - pausedAt : 0;
    set((s) => ({
      ...s,
      isPaused: false,
      pausedAt: undefined,
      pausedDuration: s.pausedDuration + additionalPause,
    }));
  },

  stop: () => {
    set((s) => {
      if (!s.isRunning || s.currentRun.length < 2 || !s.runStartedAt) {
        return {
          ...s,
          isRunning: false,
          isPaused: false,
          pausedAt: undefined,
          pausedDuration: 0,
          lastAccepted: undefined,
          runStartedAt: undefined,
          currentRun: [],
          totalRunMeters: 0,
          supplyDrops: []
        };
      }

      const endedAt = s.currentRun[s.currentRun.length - 1]!.t;

      // Calculate actual duration excluding paused time
      let totalPaused = s.pausedDuration;
      if (s.isPaused && s.pausedAt) {
        totalPaused += Date.now() - s.pausedAt;
      }

      const summary: RunSummary = {
        id: `${s.runStartedAt}-${endedAt}`,
        startedAt: s.runStartedAt,
        endedAt,
        distanceMeters: s.totalRunMeters,
        points: s.currentRun,
        pausedDuration: totalPaused,
      };

      const runs = [...s.runs, summary];

      // Streak Logic
      let streak = s.currentStreak;
      let bestStreak = s.bestStreak;
      const now = Date.now();

      if (!s.lastRunDate) {
        streak = 1;
      } else {
        if (isSameDay(now, s.lastRunDate)) {
          // Already ran today, maintain streak (but make sure it's at least 1)
          if (streak < 1) streak = 1;
        } else if (isNextDay(now, s.lastRunDate)) {
          streak += 1;
        } else {
          // Missed a day — check for streak shield
          if (s.hasStreakShield && streak > 0) {
            // Shield consumed — streak continues
            streak += 1;
          } else {
            streak = 1;
          }
        }
      }
      bestStreak = Math.max(bestStreak, streak);

      // Check for new achievements
      const totalDistance = runs.reduce((acc, r) => acc + r.distanceMeters, 0);
      const totalRevealed = s.revealed.length;
      const totalSupplyDrops = s.supplyDrops.filter(d => d.collected).length;

      let unlockedDistricts = 0;
      let totalDistricts = 0;
      try {
        const ds = useDistrictStore.getState();
        unlockedDistricts = ds.unlockedDistricts?.length ?? 0;
        totalDistricts = ds.districts?.length ?? 0;
      } catch { /* ignore */ }

      const newUnlocked = checkNewAchievements(s.achievements, {
        totalDistance,
        totalRuns: runs.length,
        totalRevealed,
        currentStreak: streak,
        totalSupplyDrops,
        unlockedDistricts,
        totalDistricts,
        lastRun: summary
      });

      if (newUnlocked.length > 0) {
        audio.levelUp();
      }

      // Consume streak shield if it was used
      const shieldUsed = !s.lastRunDate ? false :
        !isSameDay(now, s.lastRunDate) && !isNextDay(now, s.lastRunDate) && s.hasStreakShield;

      return {
        ...s,
        isRunning: false,
        isPaused: false,
        pausedAt: undefined,
        pausedDuration: 0,
        lastAccepted: undefined,
        runStartedAt: undefined,
        currentRun: [],
        totalRunMeters: 0,
        runs,
        currentStreak: streak,
        bestStreak,
        lastRunDate: now,
        achievements: [...s.achievements, ...newUnlocked],
        hasStreakShield: shieldUsed ? false : s.hasStreakShield,
      };
    });
    performSave();
    audio.stopRun();
    audio.stopBackgroundLoop();

    // Auto-sync leaderboard with improved score formula
    import("./useLeaderboardStore").then(({ useLeaderboardStore }) => {
      // Import cellKey dynamically or ensure it's imported at top
      // But imports inside function are messy. Let's use the imported helper if available or reimplement string key
      const cellKey = (p: LatLngPoint) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;

      const lb = useLeaderboardStore.getState();
      if (!lb.isGuest) {
        const state = get();
        const totalDistKm = state.runs.reduce((acc, r) => acc + r.distanceMeters, 0) / 1000;
        const uniqueCells = new Set(state.revealed.map(p => cellKey(p))).size;
        // Diminishing returns on distance, linear on exploration
        const score = Math.floor((uniqueCells * 50) + (Math.sqrt(totalDistKm) * 500));
        lb.uploadMyScore(score, totalDistKm);
      }
    }).catch(() => { });
  },

  resetAll: () => {
    const next = {
      isRunning: false,
      isPaused: false,
      pausedAt: undefined,
      pausedDuration: 0,
      currentRun: [],
      revealed: [],
      totalRunMeters: 0,
      runs: [],
      lastAccepted: undefined,
      runStartedAt: undefined,
      previewRunId: null,
      storageError: undefined,
      currentStreak: 0,
      bestStreak: 0,
      lastRunDate: null,
      achievements: [],
      supplyDrops: [],
      lastDropGenerationDate: null,
      lastCollectedDrop: null,
      dropDifficulty: 1,
      bonusXP: 0,
      hasStreakShield: false,
      fogBoostRemaining: 0,
    };
    set(next);
    performSave();
  },

  acceptPoint: (p) => {
    const { lastAccepted, isRunning, isPaused } = get();
    if (!isRunning) return { accepted: false, reason: "not_running" };
    if (isPaused) return { accepted: false, reason: "paused" };

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

    // GPS noise filter
    const speed = d / dtSec;
    if (speed > GPS_MAX_SPEED_M_PER_S) return { accepted: false, reason: "gps_jump" };
    if (d < GPS_MIN_STEP_METERS) return { accepted: false, reason: "too_small" };

    set((s) => {
      const nextRun = [...s.currentRun, p];
      const revealed = [...s.revealed, p];

      // Check supply drops
      let drops = s.supplyDrops;
      let dropCollected = false;
      let collectedDrop: SupplyDrop | null = null;
      let activeDropsCount = 0;

      const updatedDrops = drops.map(drop => {
        if (!drop.collected) {
          if (isNearDrop(p, drop)) {
            dropCollected = true;
            collectedDrop = drop;
            return { ...drop, collected: true };
          } else {
            activeDropsCount++;
          }
        }
        return drop;
      });

      let finalDrops = updatedDrops;
      let currentDifficulty = s.dropDifficulty;
      let bonusXP = s.bonusXP;
      let hasStreakShield = s.hasStreakShield;
      let fogBoostRemaining = s.fogBoostRemaining;
      let rewardMsg: { title: string; message: string; icon: string } | null = null;

      // Apply drop reward
      if (dropCollected && collectedDrop) {
        const theReward = (collectedDrop as SupplyDrop).reward;
        switch (theReward.type) {
          case "xp":
            bonusXP += theReward.amount;
            rewardMsg = { title: "Supply Collected!", message: theReward.label, icon: theReward.icon };
            break;
          case "streak_shield":
            hasStreakShield = true;
            rewardMsg = { title: "Shield Acquired!", message: "Your streak is protected for one missed day", icon: "🛡️" };
            break;
          case "fog_boost":
            fogBoostRemaining += theReward.amount;
            rewardMsg = { title: "Fog Boost!", message: `x2 fog clearing for ${theReward.amount} points`, icon: "🌊" };
            break;
        }
      }

      // Decrement fog boost counter
      if (fogBoostRemaining > 0) {
        fogBoostRemaining = Math.max(0, fogBoostRemaining - 1);
      }

      // Respawn drops if all collected
      if (drops.length > 0 && activeDropsCount === 0 && dropCollected) {
        currentDifficulty += 1;
        const newRadius = 1500 + (currentDifficulty * 500);
        const newDrops = generateDailyDrops(p, 3, newRadius);
        finalDrops = [...updatedDrops, ...newDrops];
        audio.levelUp();
      } else if (dropCollected) {
        audio.unlock();
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
        bonusXP,
        hasStreakShield,
        fogBoostRemaining,
        lastDropReward: rewardMsg || s.lastDropReward,
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
    const { lastDropGenerationDate, supplyDrops } = get();
    const now = Date.now();

    const hasNoDrops = !supplyDrops || supplyDrops.length === 0;
    const isStale = !lastDropGenerationDate || (now - lastDropGenerationDate > 12 * 3600 * 1000);

    if (hasNoDrops || isStale) {
      const newDrops = generateDailyDrops(location);
      set({ supplyDrops: newDrops, lastDropGenerationDate: now });
      performSave();
    }
  },
}));
