import { useRunStore } from "../state/useRunStore";
import { getRank } from "../utils/gamification";
import { ACHIEVEMENTS, AchievementCategory } from "../utils/achievements";
import { Share2, ChevronDown, ChevronUp, CheckCircle2, RefreshCw, Flame, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { ShareCard } from "../components/ShareCard";
import { formatKm } from "../utils/geo";
import { useLeaderboardStore } from "../state/useLeaderboardStore";
import { IdentityEditor } from "../components/IdentityEditor";
import { getBadge } from "../utils/badges";
import { ThemeSelector } from "../components/ThemeSelector";

// Categories config with labels and colors
const CATEGORIES: { id: AchievementCategory | "all"; label: string; color: string }[] = [
    { id: "all", label: "Overview", color: "bg-slate-700" },
    { id: "distance", label: "Distance", color: "bg-emerald-600" },
    { id: "exploration", label: "Exploration", color: "bg-indigo-600" },
    { id: "runs", label: "Missions", color: "bg-blue-600" },
    { id: "streak", label: "Streaks", color: "bg-orange-600" },
    { id: "drops", label: "Supply Drops", color: "bg-amber-600" },
    { id: "special", label: "Special", color: "bg-purple-600" },
];

export function ProfileScreen() {
    const { runs, revealed, achievements, currentStreak } = useRunStore();

    const totalDistance = runs.reduce((acc, r) => acc + r.distanceMeters, 0);
    const rank = getRank(totalDistance);
    const [showShare, setShowShare] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<AchievementCategory | "all">("all");
    const [isReverseSort, setIsReverseSort] = useState(false);
    const [showIdentityEditor, setShowIdentityEditor] = useState(false);

    // Derived stats
    const totalRuns = runs.filter(r => r.distanceMeters > 50).length;
    const exploredCount = revealed.length;
    const totalTimeMs = runs.reduce((acc, r) => acc + (r.endedAt - r.startedAt), 0);
    const totalTimeHours = (totalTimeMs / 3600000).toFixed(1);

    // Build achievement stats for progress tracking
    const achievementStats = useMemo(() => ({
        totalDistance: totalDistance,
        totalRuns: totalRuns,
        totalRevealed: exploredCount,
        currentStreak: currentStreak,
        totalSupplyDrops: 0, // Not easily available here, but milestone tracking still works
    }), [totalDistance, totalRuns, exploredCount, currentStreak]);

    // Filter and Sort Achievements
    const filteredAchievements = useMemo(() => {
        let list = ACHIEVEMENTS;

        if (activeTab !== "all") {
            list = list.filter(a => a.category === activeTab);
        }

        // Sort: Unlocked first, then by Difficulty (Value)
        return [...list].sort((a, b) => {
            const aUnlocked = achievements.includes(a.id);
            const bUnlocked = achievements.includes(b.id);

            // If one is unlocked and other isn't, unlocked comes first (or last depending on preference?)
            // Usually people want to see what they have, then what is next.
            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;

            // Sort by difficulty/value
            return isReverseSort ? b.value - a.value : a.value - b.value;
        });
    }, [activeTab, achievements, isReverseSort]);

    // Calculate Progress per Category
    const progress = useMemo(() => {
        const stats: Record<string, { total: number, unlocked: number }> = {};
        CATEGORIES.forEach(c => stats[c.id] = { total: 0, unlocked: 0 });

        ACHIEVEMENTS.forEach(a => {
            stats["all"].total++;
            if (stats[a.category]) stats[a.category].total++;

            if (achievements.includes(a.id)) {
                stats["all"].unlocked++;
                if (stats[a.category]) stats[a.category].unlocked++;
            }
        });
        return stats;
    }, [achievements]);

    return (
        <div className="h-full overflow-y-auto bg-slate-950 pb-24 animate-in fade-in duration-500">

            {/* Header Area */}
            <div className="p-4 pb-0">
                <h1 className="text-3xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    Operator Status
                </h1>
                <div className="flex items-center justify-between mt-1 mb-6">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                        <span>ID: OP-{totalRuns.toString().padStart(4, '0')}</span>
                        <span>•</span>
                        <span>VER: 4.2.0</span>
                    </div>
                    <ThemeSelector />
                </div>

                {/* Rank Card */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md mb-6 shadow-xl">
                    <div className={`absolute -right-4 -top-4 opacity-20 ${rank.current.color}`}>
                        <rank.current.icon size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`relative flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 ${rank.current.color} overflow-hidden ring-4 ring-black/40`}>
                                {/* Avatar Display */}
                                <img
                                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${useLeaderboardStore.getState().avatarSeed || "default"}`}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                />
                                {/* Reroll Button */}
                                <button
                                    onClick={() => {
                                        const newSeed = Math.random().toString(36).substring(7);
                                        useLeaderboardStore.getState().setAvatarSeed(newSeed);
                                        // Trigger sync if registered
                                        const { isGuest, username } = useLeaderboardStore.getState();
                                        if (!isGuest && localStorage.getItem("cityquest_user_id")) {
                                            const id = localStorage.getItem("cityquest_user_id")!;
                                            // Optimistic update handled by store state, next uploadMyScore will persist
                                            useLeaderboardStore.getState().uploadMyScore(id, username, 0, 0); // Trigger sync
                                        }
                                    }}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer active:bg-black/60 transition-colors"
                                >
                                    <RefreshCw size={20} className="text-white/70 drop-shadow-md" />
                                </button>
                            </div>
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Rank</div>
                                <div className="text-2xl font-black uppercase text-white">{rank.current.title}</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                                <span>{Math.round(rank.progress)}% to {rank.next?.title || "Max Rank"}</span>
                                <span>{formatKm(rank.remaining)} km left</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${rank.current.color.replace('text-', 'bg-')}`}
                                    style={{ width: `${rank.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Identity / Combat Style */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Combat Identity</div>
                        <button
                            onClick={() => setShowIdentityEditor(true)}
                            className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20"
                        >
                            Edit Identity
                        </button>
                    </div>
                    <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-slate-400 font-bold mb-1">Style</div>
                            <div className="text-lg font-black text-white">{useLeaderboardStore(s => s.combatStyle || "Balanced")}</div>
                        </div>
                        <div className="flex gap-1.5">
                            {(useLeaderboardStore(s => s.badges) || []).map((bId: string) => {
                                const badge = getBadge(bId);
                                if (!badge) return null;
                                return (
                                    <div key={bId} className={`p-2 rounded-lg ${badge.bg} ${badge.color} border border-white/5`}>
                                        <badge.icon size={16} />
                                    </div>
                                );
                            })}
                            {(!useLeaderboardStore(s => s.badges) || useLeaderboardStore(s => s.badges).length === 0) && (
                                <div className="text-xs text-slate-600 italic py-2">No badges</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Streak */}
                {currentStreak > 0 && (
                    <div className="mb-6 flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-950/20 p-4">
                        <Flame className="h-8 w-8 text-orange-400 fill-orange-500" />
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-orange-400">
                                Active Streak
                            </div>
                            <div className="text-2xl font-black text-white">
                                {currentStreak} <span className="text-sm font-medium text-orange-400/70">days</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-8">
                    <div className="bg-slate-900/40 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Distance</div>
                        <div className="text-lg font-bold text-white">{formatKm(totalDistance)}km</div>
                    </div>
                    <div className="bg-slate-900/40 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Explored</div>
                        <div className="text-lg font-bold text-white">{exploredCount.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/40 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1"><Clock size={10} /> Time</div>
                        <div className="text-lg font-bold text-white">{totalTimeHours}h</div>
                    </div>
                </div>
            </div>

            {/* Achievements Browser */}
            <div className="bg-slate-900/30 min-h-[500px] rounded-t-3xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="p-4 sticky top-0 bg-slate-950/90 backdrop-blur-xl z-20 border-b border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            Achievements <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">{progress["all"].unlocked} / {ACHIEVEMENTS.length}</span>
                        </h2>
                        <button
                            onClick={() => setIsReverseSort(!isReverseSort)}
                            className="bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            {isReverseSort ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    {/* Category Scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                        {CATEGORIES.map(cat => {
                            const isActive = activeTab === cat.id;
                            const catProgress = progress[cat.id];
                            const percent = Math.round((catProgress.unlocked / catProgress.total) * 100);

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`flex flex-col items-start min-w-[100px] p-3 rounded-xl border transition-all ${isActive
                                        ? `bg-slate-800 border-white/20 ring-1 ring-white/10`
                                        : "bg-slate-900/50 border-transparent opacity-60 hover:opacity-100"
                                        }`}
                                >
                                    <div className="text-xs font-bold text-slate-300 mb-1">{cat.label}</div>
                                    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden mb-1">
                                        <div className={`h-full ${cat.color}`} style={{ width: `${percent}%` }} />
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">{catProgress.unlocked}/{catProgress.total}</div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* List */}
                <div className="p-4 space-y-2">
                    {filteredAchievements.slice(0, 50).map((achievement) => { // Render limit for perf if needed, but 500 might be ok
                        const isUnlocked = achievements.includes(achievement.id);
                        return (
                            <div
                                key={achievement.id}
                                className={`group relative overflow-hidden rounded-xl border p-3 transition-all ${isUnlocked
                                    ? "border-cyan-500/30 bg-cyan-950/20"
                                    : "border-white/5 bg-slate-900/20 opacity-50 contrast-75 grayscale-[0.5]"
                                    }`}
                            >
                                <div className={`flex items-start gap-4 ${!isUnlocked && "opacity-60"}`}>
                                    <div className={`mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-lg shadow-inner ${isUnlocked ? "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 ring-1 ring-cyan-500/50" : "bg-slate-800 text-slate-600"
                                        }`}>
                                        <achievement.icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className={`text-sm font-bold ${isUnlocked ? "text-white" : "text-slate-400"}`}>
                                                {achievement.title}
                                            </h3>
                                            {isUnlocked && <CheckCircle2 size={14} className="text-cyan-500" />}
                                        </div>
                                        <p className="text-xs text-slate-500 leading-tight mt-0.5">{achievement.description}</p>

                                        {/* Progress bar for locked achievements with progress */}
                                        {!isUnlocked && achievement.progress && (() => {
                                            const { current, target } = achievement.progress(achievementStats);
                                            const pct = Math.min(100, (current / target) * 100);
                                            return (
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-[9px] font-mono text-slate-600 mb-0.5">
                                                        <span>{Math.floor(current).toLocaleString()} / {target.toLocaleString()}</span>
                                                        <span>{Math.round(pct)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                                        <div
                                                            className="h-full rounded-full bg-cyan-600/50 transition-all duration-700"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Difficulty tag for unlocked */}
                                        {isUnlocked && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-900/50 px-1.5 py-0.5 rounded">
                                                    Level {achievement.difficulty}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredAchievements.length > 50 && (
                        <div className="text-center py-4 text-xs text-slate-500 italic">
                            + {filteredAchievements.length - 50} more items... (Use tabs to filter)
                        </div>
                    )}
                </div>
            </div>

            {/* Share Conquest Button */}
            <div className="px-4 mt-4">
                <button
                    onClick={() => setShowShare(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-slate-700 active:scale-[0.98]"
                >
                    <Share2 size={18} />
                    Share Conquest Card
                </button>
            </div>

            {/* Share Modal */}
            {showShare && (
                <ShareCard
                    mode="total"
                    onClose={() => setShowShare(false)}
                />
            )}

            {/* Identity Editor */}
            {showIdentityEditor && (
                <IdentityEditor onClose={() => setShowIdentityEditor(false)} />
            )}
        </div>
    );
}
