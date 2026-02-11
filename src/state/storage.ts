import type { LatLngPoint, RunSummary } from "../types";
import type { SupplyDrop } from "../utils/supplyDrops";

const KEY = "fogrun:v2";

export type PersistedState = {
  revealed: LatLngPoint[];
  runs: RunSummary[];
  currentStreak?: number;
  lastRunDate?: number | null;
  achievements?: string[];
  supplyDrops?: SupplyDrop[];
  lastDropGenerationDate?: number | null;
};

const EMPTY_STATE: PersistedState = {
  revealed: [],
  runs: [],
  currentStreak: 0,
  lastRunDate: null,
  achievements: [],
  supplyDrops: [],
  lastDropGenerationDate: null
};

export function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    return {
      revealed: Array.isArray(parsed.revealed) ? (parsed.revealed as LatLngPoint[]) : [],
      runs: Array.isArray(parsed.runs) ? (parsed.runs as RunSummary[]) : [],
      currentStreak: typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
      lastRunDate: typeof parsed.lastRunDate === 'number' ? parsed.lastRunDate : null,
      achievements: Array.isArray(parsed.achievements) ? (parsed.achievements as string[]) : [],
      supplyDrops: Array.isArray(parsed.supplyDrops) ? (parsed.supplyDrops as SupplyDrop[]) : [],
      lastDropGenerationDate: typeof parsed.lastDropGenerationDate === 'number' ? parsed.lastDropGenerationDate : null
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function savePersisted(state: PersistedState): { success: boolean; error?: string } {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(KEY, serialized);
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        return { success: false, error: 'Storage quota exceeded' };
      }
    }
    return { success: false, error: 'Failed to save' };
  }
}
