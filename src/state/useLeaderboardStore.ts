import { create } from "zustand";
import { persist } from "zustand/middleware";
import { leaderboardService, LeaderboardRow } from "../services/leaderboardService";

export type League = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";

type LeaderboardState = {
    currentLeague: League;
    players: LeaderboardRow[];
    isLoading: boolean;
    error: string | null;
    lastSyncedAt: number;

    // Guest Mode
    isGuest: boolean;
    username: string; // stored username
    avatarSeed: string;

    // Actions
    refreshLeaderboard: () => Promise<void>;
    uploadMyScore: (userId: string, username: string, score: number, distance: number) => Promise<void>;
    setLeague: (league: League) => void;
    joinLeaderboard: (username: string) => Promise<void>;
    setAvatarSeed: (seed: string) => void;
};

const SYNC_COOLDOWN_MS = 60 * 1000; // 1 minute

export const useLeaderboardStore = create<LeaderboardState>()(
    persist(
        (set, get) => ({
            currentLeague: "Bronze",
            players: [],
            isLoading: false,
            error: null,
            lastSyncedAt: 0,

            // Default to guest if no ID found in storage (handled by persist middleware actually, but let's be explicit)
            // We'll trust the persisted state or default to true
            isGuest: true,
            username: "Guest",
            avatarSeed: "",

            setLeague: (league) => set({ currentLeague: league }),
            setAvatarSeed: (seed) => set({ avatarSeed: seed }),

            refreshLeaderboard: async () => {
                const { currentLeague, lastSyncedAt, isLoading } = get();
                const now = Date.now();

                // Throttle (unless empty or error)
                if (now - lastSyncedAt < SYNC_COOLDOWN_MS && get().players.length > 0 && !get().error) {
                    return;
                }

                if (isLoading) return;

                set({ isLoading: true, error: null });

                try {
                    const data = await leaderboardService.fetchLeaderboard(currentLeague);
                    set({ players: data, lastSyncedAt: now, isLoading: false });
                } catch (err: any) {
                    console.error(err);
                    set({ error: "Failed to load leaderboard. Check connection.", isLoading: false });
                }
            },

            // New action to register/join
            joinLeaderboard: async (username: string) => {
                // generate ID
                const userId = crypto.randomUUID();
                set({ isGuest: false, username });

                // Save to local storage for persistence across sessions if store is cleared
                localStorage.setItem("cityquest_user_id", userId);
                localStorage.setItem("cityquest_username", username);
            },

            uploadMyScore: async (userId, username, score, distance) => {
                // Optimization: Don't upload if guest
                if (get().isGuest) return;

                try {
                    // Ensure profile first
                    await leaderboardService.ensureProfile(userId, username);

                    await leaderboardService.uploadScore(userId, get().currentLeague, score, distance);

                    // Refresh to see ourselves
                    await get().refreshLeaderboard();
                } catch (err) {
                    console.error("Failed to sync score", err);
                }
            }
        }),
        {
            name: "cityquest-real-leaderboard",
            partialize: (state) => ({
                currentLeague: state.currentLeague,
                isGuest: state.isGuest,
                username: state.username,
                avatarSeed: state.avatarSeed
            }),
        }
    )
);
