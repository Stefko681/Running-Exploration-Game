import { get, set } from 'idb-keyval';
import type { LatLngPoint, RunSummary } from "../types";
import type { SupplyDrop } from "../utils/supplyDrops";

const KEY = "cityquest:v1";
const LEGACY_KEY = "fogrun:v2";

export type PersistedState = {
  revealed: LatLngPoint[];
  runs: RunSummary[];
  currentStreak?: number;
  bestStreak?: number;
  lastRunDate?: number | null;
  achievements?: string[];
  supplyDrops?: SupplyDrop[];
  lastDropGenerationDate?: number | null;
  bonusXP?: number;
  hasStreakShield?: boolean;
  fogBoostRemaining?: number;
};

const EMPTY_STATE: PersistedState = {
  revealed: [],
  runs: [],
  currentStreak: 0,
  bestStreak: 0,
  lastRunDate: null,
  achievements: [],
  supplyDrops: [],
  lastDropGenerationDate: null,
  bonusXP: 0,
  hasStreakShield: false,
  fogBoostRemaining: 0,
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
      await set(KEY, sanitized);
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
    bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
    lastRunDate: typeof parsed.lastRunDate === 'number' ? parsed.lastRunDate : null,
    achievements: Array.isArray(parsed.achievements) ? (parsed.achievements as string[]) : [],
    supplyDrops: Array.isArray(parsed.supplyDrops) ? (parsed.supplyDrops as SupplyDrop[]) : [],
    lastDropGenerationDate: typeof parsed.lastDropGenerationDate === 'number' ? parsed.lastDropGenerationDate : null,
    bonusXP: typeof parsed.bonusXP === 'number' ? parsed.bonusXP : 0,
    hasStreakShield: typeof parsed.hasStreakShield === 'boolean' ? parsed.hasStreakShield : false,
    fogBoostRemaining: typeof parsed.fogBoostRemaining === 'number' ? parsed.fogBoostRemaining : 0,
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
