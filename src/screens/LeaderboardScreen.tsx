import { useMemo } from "react";
import { Trophy, Crown, User, Flame } from "lucide-react";
import { useRunStore } from "../state/useRunStore";
import { cellKey } from "../utils/geo";

type LeaderboardEntry = {
    id: string;
    name: string;
    avatar?: string;
    rank: number;
    score: number;
    distance: number;
    isUser?: boolean;
    change?: "up" | "down" | "same";
};

// Mock Data Generation
const MOCK_PLAYERS: LeaderboardEntry[] = [
    { id: "p1", name: "NeonRunner_99", score: 15420, distance: 452.5, rank: 0, change: "up" },
    { id: "p2", name: "CyberWolf", score: 14200, distance: 389.2, rank: 0, change: "same" },
    { id: "p3", name: "GlitchHunter", score: 13850, distance: 410.1, rank: 0, change: "down" },
    { id: "p4", name: "VaporTrail", score: 12100, distance: 320.5, rank: 0, change: "up" },
    { id: "p5", name: "NightCityWalker", score: 11500, distance: 298.0, rank: 0, change: "same" },
    { id: "p6", name: "RetroFit", score: 9800, distance: 245.8, rank: 0, change: "down" },
    { id: "p7", name: "SynthWave", score: 8750, distance: 210.4, rank: 0, change: "up" },
    { id: "p8", name: "DataDrifter", score: 7200, distance: 180.9, rank: 0, change: "same" },
    { id: "p9", name: "PixelPacer", score: 6500, distance: 155.3, rank: 0, change: "down" },
];

export function LeaderboardScreen() {
    const { revealed, runs, currentStreak } = useRunStore();

    const userStats = useMemo(() => {
        // Calculate user score based on exploration + distance
        // 10 points per explored cell, 10 points per km
        const uniqueCells = new Set(revealed.map(p => cellKey(p, 4))).size;
        const totalDistKm = runs.reduce((acc, r) => acc + r.distanceMeters, 0) / 1000;

        // Simple scoring formula for demo
        const score = Math.floor((uniqueCells * 50) + (totalDistKm * 100));

        const stats: LeaderboardEntry = {
            id: "user",
            name: "You (Operator)",
            score,
            distance: totalDistKm,
            isUser: true,
            rank: 0,
            change: "same"
        };
        return stats;
    }, [revealed, runs]);

    const leaderboardData = useMemo(() => {
        const all = [...MOCK_PLAYERS, userStats];
        return all.sort((a, b) => b.score - a.score).map((entry, idx) => ({
            ...entry,
            rank: idx + 1
        }));
    }, [userStats]);

    const top3 = leaderboardData.slice(0, 3);
    const rest = leaderboardData.slice(3);
    const userRank = leaderboardData.find(p => p.isUser);

    return (
        <div className="flex h-full flex-col bg-slate-950 pb-20 overflow-hidden relative">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_70%)] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 p-6 pb-2">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Trophy className="text-yellow-400 w-5 h-5" />
                    <h1 className="text-xl font-black uppercase tracking-wider text-white">
                        Global Rankings
                    </h1>
                </div>
                <p className="text-center text-xs text-slate-400 uppercase tracking-widest font-medium">
                    Season 4 • Week 2
                </p>
            </div>

            {/* Podium */}
            <div className="relative z-10 px-4 py-6 flex items-end justify-center gap-3 min-h-[220px]">
                {/* 2nd Place */}
                <div className="flex flex-col items-center gap-2 w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xl font-bold text-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.3)]">
                            {top3[1].name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-600">
                            2ND
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <div className="text-xs font-bold text-slate-300 truncate w-full max-w-[80px]">{top3[1].name}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">{top3[1].score.toLocaleString()}</div>
                    </div>
                    <div className="w-full h-24 bg-gradient-to-t from-slate-800/80 to-slate-800/10 rounded-t-lg mx-auto mt-1 border-t border-slate-600/50" />
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center gap-2 w-1/3 z-20 -mb-2 animate-in slide-in-from-bottom-12 duration-700">
                    <div className="relative">
                        <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-400 w-6 h-6 animate-bounce" />
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 border-2 border-yellow-300 flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_25px_rgba(234,179,8,0.6)]">
                            {top3[0].name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-black px-3 py-0.5 rounded-full border border-yellow-300 shadow-sm">
                            1ST
                        </div>
                    </div>
                    <div className="text-center mt-3">
                        <div className="text-sm font-black text-white truncate w-full max-w-[100px]">{top3[0].name}</div>
                        <div className="text-xs text-yellow-400 font-mono font-bold">{top3[0].score.toLocaleString()} PTS</div>
                    </div>
                    <div className="w-full h-32 bg-gradient-to-t from-yellow-500/20 to-yellow-500/5 rounded-t-lg mx-auto mt-1 border-t border-yellow-500/30 backdrop-blur-sm" />
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center gap-2 w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-amber-900/60 border-2 border-amber-700 flex items-center justify-center text-xl font-bold text-amber-500 shadow-[0_0_15px_rgba(180,83,9,0.3)]">
                            {top3[2].name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-800 text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-700">
                            3RD
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <div className="text-xs font-bold text-slate-300 truncate w-full max-w-[80px]">{top3[2].name}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">{top3[2].score.toLocaleString()}</div>
                    </div>
                    <div className="w-full h-16 bg-gradient-to-t from-amber-900/40 to-amber-900/5 rounded-t-lg mx-auto mt-1 border-t border-amber-700/50" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-2 mt-4 relative z-10 scrollbar-hide">
                {rest.map((player) => (
                    <div
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${player.isUser
                                ? "bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                                : "bg-slate-900/40 border-slate-800"
                            }`}
                    >
                        <div className="text-slate-500 font-mono font-bold w-6 text-center">{player.rank}</div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${player.isUser ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400"
                            }`}>
                            {player.isUser ? <User size={14} /> : player.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className={`text-sm font-bold truncate ${player.isUser ? "text-cyan-400" : "text-slate-200"}`}>
                                {player.name}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                <span>{player.distance.toFixed(1)} km</span>
                                {player.isUser && currentStreak > 0 && (
                                    <span className="text-orange-400 flex items-center gap-0.5"><Flame size={10} /> {currentStreak} day streak</span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-black text-white font-mono">{player.score.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-500 font-mono">PTS</div>
                        </div>
                    </div>
                ))}
                {/* Spacer for floating footer */}
                <div className="h-16" />
            </div>

            {/* User Floating Footer (if not in view or just valid) */}
            {userRank && (
                <div className="absolute bottom-[60px] left-4 right-4 z-40 animate-in slide-in-from-bottom-4 bg-slate-900/90 backdrop-blur-md rounded-xl border border-cyan-500/30 p-3 shadow-2xl flex items-center gap-3 ring-1 ring-cyan-400/20">
                    <div className="text-cyan-500 font-mono font-black w-8 text-center text-lg italic">#{userRank.rank}</div>
                    <div className="flex-1">
                        <div className="text-xs uppercase tracking-wider text-cyan-200 font-bold mb-0.5">Your Ranking</div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                            Top {(userRank.rank / (MOCK_PLAYERS.length + 1) * 100).toFixed(0)}% of runners
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-black text-white font-mono">{userRank.score.toLocaleString()}</div>
                        <div className="text-[10px] text-cyan-500 font-bold">POINTS</div>
                    </div>
                </div>
            )}
        </div>
    );
}
