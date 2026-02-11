import { LucideIcon, Map, Compass, Mountain, Flag, Crown } from "lucide-react";

export type Rank = {
    id: string;
    title: string;
    minMeters: number;
    icon: LucideIcon;
    color: string;
};

export const RANKS: Rank[] = [
    { id: "scout", title: "Scout", minMeters: 0, icon: Compass, color: "text-slate-400" },
    { id: "runner", title: "Runner", minMeters: 10_000, icon: Map, color: "text-emerald-400" },
    { id: "pathfinder", title: "Pathfinder", minMeters: 50_000, icon: Mountain, color: "text-cyan-400" },
    { id: "cartographer", title: "Cartographer", minMeters: 100_000, icon: Flag, color: "text-violet-400" },
    { id: "legend", title: "Legend", minMeters: 500_000, icon: Crown, color: "text-amber-400" }
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
