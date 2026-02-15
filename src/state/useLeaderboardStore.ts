import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useRunStore } from "./useRunStore";
import { leaderboardService, LeaderboardRow } from "../services/leaderboardService";
import { supabase } from "../services/supabase";
import { Session, User } from "@supabase/supabase-js";

export type League = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";

/** Auto-calculate league from score */
export function leagueFromScore(score: number): League {
    if (score >= 2000000) return "Master";
    if (score >= 750000) return "Diamond";
    if (score >= 200000) return "Platinum";
    if (score >= 50000) return "Gold";
    if (score >= 10000) return "Silver";
    return "Bronze";
}

type LeaderboardState = {
    currentLeague: League;
    players: LeaderboardRow[];
    isLoading: boolean;
    error: string | null;
    lastSyncedAt: number;

    // Auth State
    isGuest: boolean;
    user: User | null;
    session: Session | null;
    username: string; // from profile
    avatarSeed: string;
    combatStyle: string;
    badges: any[];

    // Actions
    initializeAuth: () => void;
    refreshLeaderboard: () => Promise<void>;
    uploadMyScore: (score: number, distance: number) => Promise<void>;
    recalculateLeague: (score: number) => void;
    updateProfile: (style: string, badges: any[], username?: string) => Promise<void>;
    setAvatarSeed: (seed: string) => void;
    signOut: () => Promise<void>;
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

            isGuest: true,
            user: null,
            session: null,
            username: "Guest",
            avatarSeed: "",
            combatStyle: "Balanced",
            badges: [],

            initializeAuth: () => {
                // Check initial session
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                        set({ session, user: session.user, isGuest: false });
                        // Fetch profile
                        leaderboardService.getProfile(session.user.id).then(profile => {
                            if (profile) {
                                set({
                                    username: profile.username || session.user.email?.split('@')[0] || "Operator",
                                    avatarSeed: profile.avatar_seed || session.user.id,
                                    combatStyle: profile.combat_style || "Balanced",
                                    badges: profile.badges || []
                                });
                            }
                        });
                    }
                });

                // Listen for changes
                supabase.auth.onAuthStateChange(async (_event, session) => {
                    if (session) {
                        set({ session, user: session.user, isGuest: false });

                        // 1. Fetch Profile
                        const profile = await leaderboardService.getProfile(session.user.id);
                        if (profile) {
                            set({
                                username: profile.username || session.user.email?.split('@')[0] || "Operator",
                                avatarSeed: profile.avatar_seed || session.user.id,
                                combatStyle: profile.combat_style || "Balanced",
                                badges: profile.badges || []
                            });
                        }

                        // 2. Sync Local Progress to Cloud immediately
                        try {
                            const { runs, revealed } = useRunStore.getState();
                            const totalDistMeters = runs.reduce((acc, r) => acc + r.distanceMeters, 0);
                            const totalDistKm = totalDistMeters / 1000;

                            if (totalDistKm > 0) {
                                // Calculate score (same formula as useRunStore)
                                const uniqueCells = new Set(revealed.map((p: any) => `${Math.round(p.lat * 200)},${Math.round(p.lng * 200)}`)).size;
                                const score = Math.floor((uniqueCells * 50) + (Math.sqrt(totalDistKm) * 500));

                                // Upload
                                get().uploadMyScore(score, totalDistKm);
                                // Upload
                                get().uploadMyScore(score, totalDistKm);
                            }

                            // 3. Sync Runs from Cloud (Wait for it)
                            useRunStore.getState().syncFromCloud().catch(console.error);

                        } catch (err) {
                            console.error("Auto-sync failed", err);
                        }
                    } else {
                        set({ session: null, user: null, isGuest: true, username: "Guest" });
                    }
                });
            },

            recalculateLeague: (score: number) => {
                const league = leagueFromScore(score);
                if (league !== get().currentLeague) {
                    set({ currentLeague: league });
                }
            },
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

            signOut: async () => {
                await supabase.auth.signOut();
                set({ isGuest: true, user: null, session: null, username: "Guest" });
            },

            uploadMyScore: async (score, distance) => {
                const { isGuest, user, currentLeague, username } = get();
                if (isGuest || !user) return;

                // Auto-recalculate league from score
                get().recalculateLeague(score);

                try {
                    // Ensure profile exists (idempotent)
                    await leaderboardService.ensureProfile(user.id, username || user.email?.split('@')[0] || "Runner");
                    await leaderboardService.uploadScore(user.id, currentLeague, score, distance);
                    await get().refreshLeaderboard();
                } catch (err) {
                    console.error("Failed to sync score", err);
                }
            },

            updateProfile: async (style, badges, newUsername) => {
                set({ combatStyle: style, badges });
                if (newUsername) {
                    set({ username: newUsername });
                }

                const { isGuest, user, username } = get();
                if (!isGuest && user) {
                    try {
                        // Ensure profile exists before updating (for new users who haven't run yet)
                        // Use the (potentially new) username
                        await leaderboardService.ensureProfile(user.id, username || "Operator");

                        await leaderboardService.updateProfile(user.id, {
                            username: username, // Update username in DB as well
                            combat_style: style,
                            badges
                        });
                        get().refreshLeaderboard();
                    } catch (err) {
                        console.error("Failed to sync profile updates", err);
                    }
                }
            }
        }),
        {
            name: "cityquest-auth-store",
            partialize: (state) => ({
                currentLeague: state.currentLeague,
                // Don't persist session/user, let Auth handling re-hydrate it safely
                // Actually persistence of session is handled by Supabase client internally
                // We just persist UI state
                combatStyle: state.combatStyle,
                badges: state.badges
            }),
        }
    )
);
