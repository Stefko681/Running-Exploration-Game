import { createClient } from '@supabase/supabase-js';

// These will be loaded from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing! Multiplayer features will be disabled.");
}

export const supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder"
);

// Database Types Helper
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    username: string;
                    avatar_seed: string | null;
                    created_at: string;
                };
                Insert: {
                    id: string; // matches auth.users.id usually, but for us we might just use random UUID if no auth
                    username: string;
                    avatar_seed?: string | null;
                    created_at?: string;
                };
                Update: {
                    username?: string;
                    avatar_seed?: string | null;
                };
            };
            leaderboard: {
                Row: {
                    user_id: string;
                    league: string;
                    score: number;
                    distance: number;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    league?: string;
                    score: number;
                    distance: number;
                    updated_at?: string;
                };
                Update: {
                    league?: string;
                    score?: number;
                    distance?: number;
                    updated_at?: string;
                };
            };
        };
    };
};
