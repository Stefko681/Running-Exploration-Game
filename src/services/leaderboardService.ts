import { supabase } from "./supabase";

export type LeaderboardRow = {
    user_id: string;
    username: string;
    league: string;
    score: number;
    distance: number;
    updated_at: string;
    avatar_seed?: string;
    combat_style?: string;
    badges?: any[];
};

export type ProfileRow = {
    username: string;
    avatar_seed?: string;
    combat_style?: string;
    badges?: any[];
};

export const leaderboardService = {
    /**
     * Get a user's profile by ID
     */
    async getProfile(userId: string): Promise<ProfileRow | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_seed, combat_style, badges')
            .eq('id', userId)
            .single();

        if (error) {
            // It's okay if profile doesn't exist yet
            return null;
        }
        return data;
    },

    /**
     * Fetch the top 50 players for a specific league
     */
    async fetchLeaderboard(league: string): Promise<LeaderboardRow[]> {
        const { data, error } = await supabase
            .from('leaderboard')
            .select(`
                user_id,
                league,
                score,
                distance,
                updated_at,
                profiles (
                    username,
                    avatar_seed,
                    combat_style,
                    badges
                )
            `)
            .eq('league', league)
            .order('score', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Error fetching leaderboard:", error);
            throw error;
        }

        // Flatten the structure
        return data.map((row: any) => ({
            user_id: row.user_id,
            league: row.league,
            score: row.score,
            distance: row.distance,
            updated_at: row.updated_at,
            username: row.profiles?.username || "Unknown Operator",
            avatar_seed: row.profiles?.avatar_seed,
            combat_style: row.profiles?.combat_style || "Balanced",
            badges: row.profiles?.badges || []
        })).filter(p => p.username !== 'Operator');
    },

    /**
     * Ensure the user has a profile in the profiles table
     */
    async ensureProfile(userId: string, username: string, avatarSeed?: string) {
        // Upsert profile to handle race conditions or existing users
        const updates: any = {
            id: userId,
            username,
        };

        if (avatarSeed) {
            updates.avatar_seed = avatarSeed;
        }

        const { error } = await supabase.from('profiles').upsert(updates, { onConflict: 'id' });

        if (error) {
            console.error("Error ensureProfile:", error);
            // Don't throw if it's just a duplicate which upsert should handle, but if it fails for other reasons we might want to know
        }
    },

    /**
     * Upload the user's latest score
     */
    async uploadScore(userId: string, league: string, score: number, distance: number) {
        const { error } = await supabase
            .from('leaderboard')
            .upsert({
                user_id: userId,
                league,
                score,
                distance,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Error uploading score:", error);
            throw error;
        }
    },

    /**
     * Update the user's decorative profile info
     */
    async updateProfile(userId: string, updates: { username?: string, combat_style?: string, badges?: any[] }) {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error("Error updating profile:", error);
            throw error; // Let the caller handl it
        }
    }
};
