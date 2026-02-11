import { create } from "zustand";
import { GPS_MAX_SPEED_M_PER_S, GPS_MIN_STEP_METERS } from "../config";
import type { LatLngPoint, RunSummary } from "../types";
import { audio } from "../utils/audio";
import { haversineMeters } from "../utils/geo";
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
  start: () => void;
  stop: () => void;
  resetAll: () => void;
  acceptPoint: (p: LatLngPoint) => { accepted: boolean; reason?: string };
  setPreviewRun: (id: string | null) => void;
  hydrateFromExport: (data: { revealed: LatLngPoint[]; runs: RunSummary[] }) => void;
  getLifetimeStats: () => { totalDistance: number; totalRuns: number };
};

const persisted =
  typeof window !== "undefined"
    ? loadPersisted()
    : {
      revealed: [],
      runs: []
    };

export const useRunStore = create<RunState>((set, get) => ({
  isRunning: false,
  currentRun: [],
  revealed: persisted.revealed ?? [],
  totalRunMeters: 0,
  runs: persisted.runs ?? [],
  lastAccepted: undefined,
  runStartedAt: undefined,
  previewRunId: null,
  start: () => {
    set((s) => ({
      ...s,
      isRunning: true,
      currentRun: [],
      totalRunMeters: 0,
      lastAccepted: undefined,
      runStartedAt: Date.now()
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
      savePersisted({ revealed: s.revealed, runs });

      return {
        ...s,
        isRunning: false,
        lastAccepted: undefined,
        runStartedAt: undefined,
        currentRun: [],
        totalRunMeters: 0,
        runs
      };
    });
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
      previewRunId: null
    };
    savePersisted({ revealed: next.revealed, runs: next.runs });
    set(next);
  },
  acceptPoint: (p) => {
    const { lastAccepted, isRunning } = get();
    if (!isRunning) return { accepted: false, reason: "not_running" };

    // First accepted point
    if (!lastAccepted) {
      set((s) => {
        const revealed = [...s.revealed, p];
        const runs = s.runs;
        savePersisted({ revealed, runs });
        return { ...s, lastAccepted: p, currentRun: [p], revealed };
      });
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
      const runs = s.runs;
      savePersisted({ revealed, runs });
      return {
        ...s,
        lastAccepted: p,
        currentRun: nextRun,
        revealed,
        totalRunMeters: s.totalRunMeters + d
      };
    });
    // Play unlock sound occasinally or always? limit to not be annoying?
    // Let's play it every time a chunk is revealed for now (it's satisfying)
    // But maybe debounce it if points come too fast?
    // The GPS interval is usually 1s, so it should be fine.
    audio.unlock();
    return { accepted: true };
  },
  setPreviewRun: (id) =>
    set((s) => ({
      ...s,
      previewRunId: id
    })),
  hydrateFromExport: (data) =>
    set((s) => {
      const revealed = data.revealed ?? [];
      const runs = data.runs ?? [];
      savePersisted({ revealed, runs });
      return {
        ...s,
        revealed,
        runs
      };
    }),
  getLifetimeStats: () => {
    const { runs } = get();
    const totalDistance = runs.reduce((acc, r) => acc + r.distanceMeters, 0);
    return { totalDistance, totalRuns: runs.length };
  }
}));
