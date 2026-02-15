import { LucideIcon, Map, Compass, Mountain, Flag, Crown, Footprints, Shield, Swords, Award, Star } from "lucide-react";

export type Rank = {
    id: string;
    title: string;
    minMeters: number;
    icon: LucideIcon;
    color: string;
};

export const RANKS: Rank[] = [
    { id: "scout", title: "Scout", minMeters: 0, icon: Compass, color: "text-slate-400" },
    { id: "runner", title: "Runner", minMeters: 10_000, icon: Footprints, color: "text-emerald-400" },
    { id: "pathfinder", title: "Pathfinder", minMeters: 50_000, icon: Mountain, color: "text-cyan-400" },
    { id: "cartographer", title: "Cartographer", minMeters: 100_000, icon: Map, color: "text-violet-400" },
    { id: "trailblazer", title: "Trailblazer", minMeters: 250_000, icon: Flag, color: "text-orange-400" },
    { id: "veteran", title: "Veteran", minMeters: 500_000, icon: Shield, color: "text-rose-400" },
    { id: "elite", title: "Elite", minMeters: 1_000_000, icon: Swords, color: "text-red-400" },
    { id: "master", title: "Master", minMeters: 2_500_000, icon: Award, color: "text-yellow-400" },
    { id: "champion", title: "Champion", minMeters: 5_000_000, icon: Star, color: "text-cyan-300" },
    { id: "legend", title: "Legend", minMeters: 10_000_000, icon: Crown, color: "text-amber-400" }
];

export function getRank(totalMeters: number) {
    // Find the highest rank achieved
    let currentRank = RANKS[0];
    let nextRank = RANKS[1];

    for (let i = 0; i < RANKS.length; i++) {
        if (totalMeters >= RANKS[i].minMeters) {
            currentRank = RANKS[i];
            nextRank = RANKS[i + 1] || null; // Null if max rank
        } else {
            break;
        }
    }

    const progressMeters = totalMeters - currentRank.minMeters;
    const neededMeters = nextRank ? nextRank.minMeters - currentRank.minMeters : 0;
    const percent = nextRank ? Math.min(100, (progressMeters / neededMeters) * 100) : 100;

    return {
        current: currentRank,
        next: nextRank,
        progress: percent,
        remaining: nextRank ? nextRank.minMeters - totalMeters : 0
    };
}

/**
 * Calculate the Game Score (XP) for a run or total progress.
 * Formula: (Unique Cells * 50) + (DistanceKm * 500)
 */
export function calculateScore(points: { lat: number, lng: number }[], distanceMeters: number): number {
    if (distanceMeters <= 0 || !points || points.length === 0) return 0;

    // Cell key with 4 decimals precision (approx 11m grid)
    const cellKey = (p: { lat: number, lng: number }) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;

    const uniqueCells = new Set(points.map(p => cellKey(p))).size;
    const distanceKm = distanceMeters / 1000;

    // Old inflated formula: Math.floor((uniqueCells * 50) + (Math.sqrt(distanceKm) * 500));
    // New balanced formula: 1 point per cell (approx 100m2) + 100 points per km
    // This results in ~1000-1500 points for a nice 5km run.
    return Math.floor((uniqueCells * 1) + (distanceKm * 100));
}
