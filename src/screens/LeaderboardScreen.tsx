import { useMemo, useEffect, useState } from "react";
import { Trophy, Crown, User, AlertCircle, Loader2, SignalHigh, SignalZero } from "lucide-react";
import { useRunStore } from "../state/useRunStore";
import { useLeaderboardStore, League } from "../state/useLeaderboardStore";
import { cellKey, formatKm } from "../utils/geo";
import { RunnerProfileModal } from "../components/RunnerProfileModal";

const LEAGUE_COLORS: Record<League, string> = {
    "Bronze": "text-orange-700 bg-orange-900/20 border-orange-800",
    "Silver": "text-slate-300 bg-slate-800/50 border-slate-600",
    "Gold": "text-yellow-400 bg-yellow-900/20 border-yellow-700",
    "Platinum": "text-cyan-400 bg-cyan-900/20 border-cyan-700",
    "Diamond": "text-blue-400 bg-blue-900/20 border-blue-700",
    "Master": "text-purple-400 bg-purple-900/20 border-purple-700"
};

export function LeaderboardScreen() {
    const { revealed, runs } = useRunStore();
    const { players, currentLeague, isLoading, error, refreshLeaderboard, uploadMyScore, isGuest, joinLeaderboard } = useLeaderboardStore();

    const [selectedRunner, setSelectedRunner] = useState<string | null>(null);

    // 1. Calculate User Stats (Client Side Authority for now)
    const userStats = useMemo(() => {
        const uniqueCells = new Set(revealed.map(p => cellKey(p, 4))).size;
        const totalDistKm = runs.reduce((acc, r) => acc + r.distanceMeters, 0) / 1000;
        const score = Math.floor((uniqueCells * 50) + (totalDistKm * 100));

        const isGuestMode = useLeaderboardStore.getState().isGuest; // Access fresh state if needed, or rely on hook
        return {
            id: isGuestMode ? "guest_me" : (localStorage.getItem("cityquest_user_id") || "user_me"),
            name: isGuestMode ? "Guest (You)" : useLeaderboardStore.getState().username,
            score,
            distance: totalDistKm,
            isUser: true,
            league: currentLeague,
            avatar_seed: useLeaderboardStore.getState().avatarSeed
        };
    }, [revealed, runs, currentLeague, players]); // depend on players to force re-calc if we join

    // 2. Sync on Mount
    useEffect(() => {
        // We need a stable ID for the user. 
        // In a real app, this comes from useAuth().
        let userId = localStorage.getItem("cityquest_user_id");

        // LEGACY: If we have an ID but store thinks we are guest (first load after update), fix it
        if (userId && useLeaderboardStore.getState().isGuest) {
            const storedName = localStorage.getItem("cityquest_username");
            // Only restore if we have a real name. If it's "Operator" (legacy default) or missing, stay as Guest.
            if (storedName && storedName !== "Operator") {
                useLeaderboardStore.setState({ isGuest: false, username: storedName });
            }
        }

        // FIX: If we think we are registered (isGuest=false) but our name is "Operator" (legacy default) or missing, 
        // we should actually be a Guest so we can choose a name.
        const currentState = useLeaderboardStore.getState();
        if (!currentState.isGuest && (currentState.username === "Operator" || !currentState.username)) {
            useLeaderboardStore.setState({ isGuest: true, username: "Guest" });
        }

        const sync = async () => {
            // Only upload if not guest
            if (!useLeaderboardStore.getState().isGuest && userId) {
                await uploadMyScore(userId, useLeaderboardStore.getState().username, userStats.score, userStats.distance);
            }
            // Always fetch leaderboard
            await refreshLeaderboard();
        };

        sync();

        // Auto refresh every 2 mins
        const interval = setInterval(refreshLeaderboard, 120000);
        return () => clearInterval(interval);
    }, [refreshLeaderboard, uploadMyScore, userStats.score, userStats.distance]);

    // 3. Merge and Sort
    const leaderboardData = useMemo(() => {
        const myId = typeof localStorage !== 'undefined' ? localStorage.getItem("cityquest_user_id") : null;
        const isGuestMode = useLeaderboardStore.getState().isGuest;

        let data = players.map((p) => ({
            id: p.user_id,
            user_id: p.user_id,
            name: p.user_id === myId ? `You (${useLeaderboardStore.getState().username})` : p.username,
            score: p.score,
            distance: p.distance,
            // We'll recount ranks later
            rank: 0,
            isUser: p.user_id === myId,
            league: p.league as League,
            avatar_seed: p.avatar_seed
        }));

        // If Guest, inject ourselves
        if (isGuestMode) {
            data.push({
                ...userStats,
                // Ensure ID doesn't conflict (though unlikely with UUIDs)
                id: "guest_me",
                user_id: "guest_me",
                rank: 0,
                avatar_seed: undefined
            });
        }
        // Also if we are NOT guest but somehow not in the list yet (e.g. sync pending), 
        // we might want to inject ourselves? 
        // For now, let's trust the sync or the "Legacy" fallback to have uploaded. 
        // But if list is empty, we handle that below.

        // Sort by Score (Desc)
        data.sort((a, b) => b.score - a.score);

        // Assign Ranks
        data = data.map((p, idx) => ({
            ...p,
            rank: idx + 1
        }));

        // If list is empty (first load) and we aren't guest (handled above), show at least us
        if (data.length === 0 && !isLoading) {
            // This case is rare now since we inject guest, 
            // but effectively handles the "I am registered but list failed" case
            return [{ ...userStats, id: "temp_me", user_id: "temp_me", rank: 1 }];
        }

        return data;
    }, [players, userStats, isLoading]);

    const top3 = leaderboardData.slice(0, 3);
    const rest = leaderboardData.slice(3);

    // Connection Status Icon
    const ConnectionIcon = isLoading ? Loader2 : error ? SignalZero : SignalHigh;
    const connectionColor = isLoading ? "text-blue-400 animate-spin" : error ? "text-red-500" : "text-emerald-400";

    if (error && players.length === 0) {
        return (
            <div className="flex bg-slate-950 h-full items-center justify-center p-6 text-center">
                <div className="max-w-xs">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Connection Lost</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={() => refreshLeaderboard()}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-slate-950 pb-20 overflow-hidden relative">

            {/* Header */}
            <div className="relative z-10 p-4 pb-2 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${LEAGUE_COLORS[currentLeague]}`}>
                        <Trophy size={14} />
                        {currentLeague} League
                    </div>

                    {isGuest ? (
                        <button
                            onClick={() => {
                                const name = prompt("Enter your Operator Name to join the Global Leaderboard:");
                                if (name && name.trim().length > 0) {
                                    joinLeaderboard(name.trim());
                                }
                            }}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            <User size={14} />
                            Join Leaderboard
                        </button>
                    ) : (
                        <div className={`flex items-center gap-1.5 text-xs font-mono ${connectionColor}`}>
                            <ConnectionIcon size={14} />
                            <span>{isLoading ? "Syncing..." : "Live"}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Podium */}
            {top3.length >= 3 && (
                <div className="relative z-10 px-4 py-6 flex items-end justify-center gap-2 min-h-[200px]">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center gap-1 w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-lg font-bold text-slate-400 overflow-hidden">
                                {top3[1].avatar_seed ? (
                                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${top3[1].avatar_seed}`} alt="avatar" />
                                ) : (
                                    top3[1].name.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-600">
                                2ND
                            </div>
                        </div>
                        <div className="text-center mt-2 w-full">
                            <div className={`text-xs font-bold truncate px-1 ${top3[1].isUser ? "text-cyan-400" : "text-slate-300"}`}>{top3[1].name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{top3[1].score.toLocaleString()}</div>
                        </div>
                        <div className="w-full h-20 bg-gradient-to-t from-slate-800/80 to-slate-800/10 rounded-t-lg mx-auto mt-1 border-t border-slate-600/50" />
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center gap-1 w-1/3 z-20 -mb-2 animate-in slide-in-from-bottom-12 duration-700">
                        <div className="relative">
                            <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-400 w-6 h-6 animate-bounce" />
                            <div className="w-18 h-18 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 border-2 border-yellow-300 flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_25px_rgba(234,179,8,0.6)] overflow-hidden">
                                {top3[0].avatar_seed ? (
                                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${top3[0].avatar_seed}`} alt="avatar" />
                                ) : (
                                    top3[0].name.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-black px-3 py-0.5 rounded-full border border-yellow-300 shadow-sm">
                                1ST
                            </div>
                        </div>
                        <div className="text-center mt-3 w-full">
                            <div className={`text-sm font-black truncate px-1 ${top3[0].isUser ? "text-cyan-200" : "text-white"}`}>{top3[0].name}</div>
                            <div className="text-xs text-yellow-400 font-mono font-bold">{top3[0].score.toLocaleString()} PTS</div>
                        </div>
                        <div className="w-full h-28 bg-gradient-to-t from-yellow-500/20 to-yellow-500/5 rounded-t-lg mx-auto mt-1 border-t border-yellow-500/30 backdrop-blur-sm" />
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center gap-1 w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-200">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-amber-900/60 border-2 border-amber-700 flex items-center justify-center text-lg font-bold text-amber-500 overflow-hidden">
                                {top3[2].avatar_seed ? (
                                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${top3[2].avatar_seed}`} alt="avatar" />
                                ) : (
                                    top3[2].name.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-800 text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-700">
                                3RD
                            </div>
                        </div>
                        <div className="text-center mt-2 w-full">
                            <div className={`text-xs font-bold truncate px-1 ${top3[2].isUser ? "text-cyan-400" : "text-slate-300"}`}>{top3[2].name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{top3[2].score.toLocaleString()}</div>
                        </div>
                        <div className="w-full h-14 bg-gradient-to-t from-amber-900/40 to-amber-900/5 rounded-t-lg mx-auto mt-1 border-t border-amber-700/50" />
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-2 mt-2 relative z-10 scrollbar-hide">
                {(top3.length >= 3 ? rest : leaderboardData).map((player) => (
                    <div key={player.user_id} onClick={() => setSelectedRunner(player.user_id)}>
                        <div className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer active:scale-[0.98] ${player.isUser
                            ? "bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)] sticky top-0 z-20 backdrop-blur-lg"
                            : "bg-slate-900/40 border-slate-800 hover:bg-slate-800"
                            }`}>

                            <div className="text-slate-500 font-mono font-bold w-6 text-center">{player.rank}</div>

                            <div className={`w-9 h-9 flex-none rounded-full flex items-center justify-center text-xs font-bold relative overflow-hidden ${player.isUser ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400"
                                }`}>
                                {player.avatar_seed ? (
                                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.avatar_seed}`} alt="avatar" />
                                ) : (
                                    player.isUser ? <User size={16} /> : player.name.substring(0, 2).toUpperCase()
                                )}
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <div className={`text-sm font-bold truncate ${player.isUser ? "text-cyan-400" : "text-slate-200"}`}>
                                        {player.name}
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                    <span>{formatKm(player.distance)}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm font-black text-white font-mono">{player.score.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500 font-mono uppercase">Pts</div>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="h-20" />
            </div>

            {/* Profile Inspection Modal */}
            {selectedRunner && (
                <RunnerProfileModal
                    runnerData={leaderboardData.find(p => p.user_id === selectedRunner) as any}
                    onClose={() => setSelectedRunner(null)}
                />
            )}
        </div>
    );
}
