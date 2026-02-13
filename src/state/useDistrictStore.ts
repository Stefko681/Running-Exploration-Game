import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OSMDistrict } from '../services/DistrictService';

interface DistrictState {
    unlockedDistricts: string[]; // List of relation IDs
    districts: OSMDistrict[]; // Fetched district boundaries
    isLoading: boolean; // True while fetching districts
    error: string | null; // Error message if fetch failed
    lastFetchLocation: { lat: number; lon: number } | null; // Track last fetch location

    unlockDistrict: (id: string) => void;
    isUnlocked: (id: string) => boolean;
    setDistricts: (districts: OSMDistrict[], location: { lat: number; lon: number }) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    resetDistricts: () => void;
}

export const useDistrictStore = create<DistrictState>()(
    persist(
        (set, get) => ({
            unlockedDistricts: [],
            districts: [],
            isLoading: false,
            error: null,
            lastFetchLocation: null,

            unlockDistrict: (id: string) => {
                const current = get().unlockedDistricts;
                if (!current.includes(id)) {
                    set({ unlockedDistricts: [...current, id] });
                }
            },

            isUnlocked: (id: string) => {
                return get().unlockedDistricts.includes(id);
            },

            setDistricts: (districts: OSMDistrict[], location: { lat: number; lon: number }) => {
                set({
                    districts,
                    lastFetchLocation: location,
                    error: null,
                    isLoading: false
                });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },

            setError: (error: string | null) => {
                set({ error, isLoading: false });
            },

            resetDistricts: () => {
                set({
                    unlockedDistricts: [],
                    districts: [],
                    lastFetchLocation: null,
                    error: null
                });
            }
        }),
        {
            name: 'district-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
