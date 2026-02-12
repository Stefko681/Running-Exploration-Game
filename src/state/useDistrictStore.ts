import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { OSMDistrict, OverpassService } from '../services/OverpassService';

interface DistrictState {
    unlockedDistricts: string[]; // List of relation IDs (as strings)

    // Dynamic Data
    districts: OSMDistrict[];
    isLoading: boolean;
    lastFetchCoords: { lat: number; lng: number } | null;

    unlockDistrict: (id: string) => void;
    isUnlocked: (id: string) => boolean;
    resetDistricts: () => void;

    // Actions
    setDistricts: (districts: OSMDistrict[]) => void;
    fetchDistrictsIfNeeded: (lat: number, lng: number) => Promise<void>;
}

export const useDistrictStore = create<DistrictState>()(
    persist(
        (set, get) => ({
            unlockedDistricts: [],
            districts: [],
            isLoading: false,
            lastFetchCoords: null,

            unlockDistrict: (id: string) => {
                const current = get().unlockedDistricts;
                if (!current.includes(id)) {
                    set({ unlockedDistricts: [...current, id] });
                }
            },

            isUnlocked: (id: string) => {
                return get().unlockedDistricts.includes(id);
            },

            resetDistricts: () => {
                set({ unlockedDistricts: [] });
            },

            setDistricts: (districts) => set({ districts }),

            fetchDistrictsIfNeeded: async (lat, lng) => {
                const state = get();

                // Check if we need to fetch
                // 1. If we have no districts
                // 2. If we moved significantly from last fetch (e.g. > 5km)
                // Simple distance check
                const last = state.lastFetchCoords;
                let shouldFetch = false;

                if (state.districts.length === 0 || !last) {
                    shouldFetch = true;
                } else {
                    const dist = Math.sqrt(Math.pow(lat - last.lat, 2) + Math.pow(lng - last.lng, 2));
                    // 1 degree approx 111km. 5km is approx 0.045 deg
                    if (dist > 0.045) {
                        shouldFetch = true;
                    }
                }

                if (!shouldFetch) return;

                // Prevent duplicate fetches if already loading?
                // Actually isLoading acts as a UI spinner, but we might want a 'isFetching' flag for debounce logic
                // For now simple:

                set({ isLoading: true });
                try {
                    const newDistricts = await OverpassService.fetchDistricts(lat, lng);
                    if (newDistricts.length > 0) {
                        // Merge or Replace? 
                        // Replacing is safer to avoid memory bloat, but might lose "unlocked" visuals if you go back.
                        // However, unlocked IDs are persisted separately.
                        // Let's replace for now to keep it scoped to current area.
                        set({ districts: newDistricts, lastFetchCoords: { lat, lng } });
                    }
                } finally {
                    set({ isLoading: false });
                }
            }
        }),
        {
            name: 'district-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                unlockedDistricts: state.unlockedDistricts,
                // We persist districts too so they load offline/restore quickly
                districts: state.districts,
                lastFetchCoords: state.lastFetchCoords
            }),
        }
    )
);
