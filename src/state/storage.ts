import { get, set } from 'idb-keyval';
import type { LatLngPoint, RunSummary } from "../types";
import type { SupplyDrop } from "../utils/supplyDrops";

const KEY = "cityquest:v1";
const LEGACY_KEY = "fogrun:v2";

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

/**
 * Migration & Loading logic.
 * Checks IndexedDB first, falls back to localStorage migration.
 */
export async function loadPersisted(): Promise<PersistedState> {
  try {
    // 1. Try IndexedDB
    const data = await get(KEY);
    if (data) {
      return sanitize(data);
    }

    // 2. Fallback: Migrate from LocalStorage
    const rawLegacy = localStorage.getItem(LEGACY_KEY);
    if (rawLegacy) {
      console.log("Migrating data from LocalStorage to IndexedDB...");
      const parsed = JSON.parse(rawLegacy);
      const sanitized = sanitize(parsed);

      // Save to IndexedDB immediately
      await set(KEY, sanitized);

      // Optional: don't clear legacy yet, just in case? 
      // User said "Migrate to IndexedDB", usually implied swap.
      // localStorage.removeItem(LEGACY_KEY); 

      return sanitized;
    }

    return EMPTY_STATE;
  } catch (err) {
    console.error("Failed to load persisted state:", err);
    return EMPTY_STATE;
  }
}

function sanitize(parsed: any): PersistedState {
  return {
    revealed: Array.isArray(parsed.revealed) ? (parsed.revealed as LatLngPoint[]) : [],
    runs: Array.isArray(parsed.runs) ? (parsed.runs as RunSummary[]) : [],
    currentStreak: typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
    lastRunDate: typeof parsed.lastRunDate === 'number' ? parsed.lastRunDate : null,
    achievements: Array.isArray(parsed.achievements) ? (parsed.achievements as string[]) : [],
    supplyDrops: Array.isArray(parsed.supplyDrops) ? (parsed.supplyDrops as SupplyDrop[]) : [],
    lastDropGenerationDate: typeof parsed.lastDropGenerationDate === 'number' ? parsed.lastDropGenerationDate : null
  };
}

export async function savePersisted(state: PersistedState): Promise<{ success: boolean; error?: string }> {
  try {
    await set(KEY, state);
    return { success: true };
  } catch (err: unknown) {
    console.error("Save failed:", err);
    return { success: false, error: 'Failed to save to IndexedDB' };
  }
}
