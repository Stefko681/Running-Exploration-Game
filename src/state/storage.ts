import type { LatLngPoint, RunSummary } from "../types";

const KEY = "fogrun:v2";

export type PersistedState = {
  revealed: LatLngPoint[];
  runs: RunSummary[];
};

const EMPTY_STATE: PersistedState = {
  revealed: [],
  runs: []
};

export function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    return {
      revealed: Array.isArray(parsed.revealed) ? (parsed.revealed as LatLngPoint[]) : [],
      runs: Array.isArray(parsed.runs) ? (parsed.runs as RunSummary[]) : []
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode errors
  }
}

