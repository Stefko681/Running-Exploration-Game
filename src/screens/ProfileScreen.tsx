import { useRunStore } from "../state/useRunStore";
import { getRank, RANKS } from "../utils/gamification";
import { ACHIEVEMENTS, AchievementCategory } from "../utils/achievements";
import { Share2, ChevronDown, ChevronUp, CheckCircle2, RefreshCw, Flame, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { ShareCard } from "../components/ShareCard";
import { formatKm } from "../utils/geo";
import { useLeaderboardStore } from "../state/useLeaderboardStore";
import { IdentityEditor } from "../components/IdentityEditor";
import { getBadge } from "../utils/badges";
import { ThemeSelector } from "../components/ThemeSelector";
import { useDistrictStore } from "../state/useDistrictStore";
import { useSettingsStore } from "../state/useSettingsStore";
import { AuthScreen } from "./AuthScreen";
import { LogOut, User as UserIcon } from "lucide-react";

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
    const { runs, revealed, achievements, currentStreak, bestStreak, supplyDrops, hasStreakShield } = useRunStore();
    const { username, isGuest, user } = useLeaderboardStore();
    const { unlockedDistricts, districts } = useDistrictStore();
    const { weightKg, setWeightKg } = useSettingsStore();

    const totalDistance = runs.reduce((acc, r) => acc + r.distanceMeters, 0);
    const rank = getRank(totalDistance);
    const [showShare, setShowShare] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<AchievementCategory | "all">("all");
    const [isReverseSort, setIsReverseSort] = useState(false);
    const [showIdentityEditor, setShowIdentityEditor] = useState(false);
    const [showRankDetails, setShowRankDetails] = useState(false);
    const [showAuth, setShowAuth] = useState(false);

    const handleLogout = async () => {
        await useLeaderboardStore.getState().signOut();
    };

    // Derived stats
    const totalRuns = runs.filter(r => r.distanceMeters > 50).length;
    const exploredCount = revealed.length;
    const totalTimeMs = runs.reduce((acc, r) => {
        const duration = r.endedAt - r.startedAt;
        const paused = r.pausedDuration || 0;
        return acc + Math.max(0, duration - paused);
    }, 0);
    const totalTimeHours = (totalTimeMs / 3600000).toFixed(1);

    // Build achievement stats for progress tracking
    const achievementStats = useMemo(() => ({
        totalDistance: totalDistance,
        totalRuns: totalRuns,
        totalRevealed: exploredCount,
        currentStreak: currentStreak,
        totalSupplyDrops: supplyDrops.filter(d => d.collected).length,
        unlockedDistricts: unlockedDistricts.length,
        totalDistricts: districts.length,
    }), [totalDistance, totalRuns, exploredCount, currentStreak, supplyDrops, unlockedDistricts, districts]);

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
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            {isGuest ? "Operator Profile" : `Operator: ${username}`}
                        </h1>
                        <div className="flex items-center gap-2 mt-1 mb-4">
                            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                                <span>ID: {isGuest ? "GUEST" : "OP-" + (user?.id.substring(0, 4).toUpperCase())}</span>
                                <span>•</span>
                                <span>VER: 4.2.0</span>
                            </div>
                        </div>

                        {/* Auth Actions */}
                        <div className="mb-6">
                            {isGuest ? (
                                <button
                                    onClick={() => setShowAuth(true)}
                                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
                                >
                                    <UserIcon size={16} />
                                    Login / Sync Progress
                                </button>
                            ) : (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-700 hover:border-red-500/30"
                                >
                                    <LogOut size={14} />
                                    Logout
                                </button>
                            )}
                        </div>
                    </div>
                    <ThemeSelector />
                </div>



                {/* Rank Card — clickable to expand */}
                <div
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md mb-6 shadow-xl cursor-pointer transition-all active:scale-[0.99]"
                    onClick={() => setShowRankDetails(v => !v)}
                >
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newSeed = Math.random().toString(36).substring(7);
                                        useLeaderboardStore.getState().setAvatarSeed(newSeed);
                                        const { isGuest } = useLeaderboardStore.getState();
                                        if (!isGuest) {
                                            // Optimistic update handled by store state, next uploadMyScore will persist
                                            useLeaderboardStore.getState().uploadMyScore(0, 0); // Trigger sync
                                        }
                                    }}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer active:bg-black/60 transition-colors"
                                >
                                    <RefreshCw size={20} className="text-white/70 drop-shadow-md" />
                                </button>
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Rank</div>
                                <div className="text-2xl font-black uppercase text-white">{rank.current.title}</div>
                            </div>
                            <ChevronDown size={18} className={`text-slate-500 transition-transform duration-300 ${showRankDetails ? 'rotate-180' : ''}`} />
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

                {/* Rank Progression Details */}
                {showRankDetails && (
                    <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className="px-4 pt-4 pb-2">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Rank Progression</div>
                            <div className="text-xs text-slate-400">Total: <span className="text-white font-bold">{formatKm(totalDistance)} km</span></div>
                        </div>
                        <div className="px-3 pb-3 space-y-1">
                            {RANKS.map((r, i) => {
                                const isUnlocked = totalDistance >= r.minMeters;
                                const isCurrent = rank.current.id === r.id;
                                const nextR = RANKS[i + 1];
                                const rangeEnd = nextR ? nextR.minMeters : r.minMeters;
                                const rangeStart = r.minMeters;
                                const progressInRange = isUnlocked
                                    ? (nextR
                                        ? Math.min(100, ((totalDistance - rangeStart) / (rangeEnd - rangeStart)) * 100)
                                        : 100)
                                    : 0;

                                return (
                                    <div
                                        key={r.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent
                                            ? 'bg-slate-800/80 border border-white/10 shadow-lg'
                                            : isUnlocked
                                                ? 'bg-slate-800/30'
                                                : 'bg-slate-900/30 opacity-50'
                                            }`}
                                    >
                                        <div className={`flex-none w-10 h-10 rounded-lg flex items-center justify-center ${isUnlocked
                                            ? `${r.color.replace('text-', 'bg-').replace('400', '950')} ${r.color}`
                                            : 'bg-slate-800 text-slate-600'
                                            }`}>
                                            <r.icon size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className={`text-sm font-black uppercase ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                                    {r.title}
                                                    {isCurrent && <span className="ml-2 text-[10px] font-bold text-cyan-400 normal-case">← You</span>}
                                                </div>
                                                <div className={`text-xs font-mono ${isUnlocked ? r.color : 'text-slate-600'}`}>
                                                    {r.minMeters === 0 ? '0 km' : `${formatKm(r.minMeters)} km`}
                                                </div>
                                            </div>
                                            {/* Progress bar within this rank */}
                                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${isUnlocked
                                                        ? r.color.replace('text-', 'bg-')
                                                        : 'bg-slate-700'
                                                        }`}
                                                    style={{ width: `${progressInRange}%` }}
                                                />
                                            </div>
                                            {isCurrent && nextR && (
                                                <div className="mt-1 text-[10px] text-slate-500">
                                                    {formatKm(nextR.minMeters - totalDistance)} km to <span className={nextR.color}>{nextR.title}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-950/20 p-4">
                    <Flame className="h-8 w-8 text-orange-400 fill-orange-500" />
                    <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-orange-400">
                            Active Streak
                        </div>
                        <div className="text-2xl font-black text-white">
                            {currentStreak} <span className="text-sm font-medium text-orange-400/70">days</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Best</div>
                        <div className="text-lg font-bold text-white">{bestStreak || currentStreak}d</div>
                        {hasStreakShield && (
                            <div className="text-[10px] text-cyan-400 font-bold">🛡️ Protected</div>
                        )}
                    </div>
                </div>

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

                {/* Weight Setting */}
                <div className="mb-8 bg-slate-900/40 rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Body Weight (for calorie accuracy)</div>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={40}
                            max={150}
                            value={weightKg}
                            onChange={(e) => setWeightKg(Number(e.target.value))}
                            className="flex-1 accent-cyan-500"
                        />
                        <div className="text-lg font-bold text-white w-16 text-right">{weightKg} kg</div>
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
                    {filteredAchievements.slice(0, 50).map((achievement) => {
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

            <div className="px-4 mt-4">
                <button
                    onClick={() => setShowShare(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-slate-700 active:scale-[0.98]"
                >
                    <Share2 size={18} />
                    Share Conquest Card
                </button>
            </div>

            {/* Footer */}
            <div className="pt-8 pb-4 text-center">
                <div className="text-[10px] text-slate-600 font-mono">
                    ID: {isGuest ? 'GUEST' : (user?.id.substring(0, 8) + '...')}
                </div>
                <div className="mt-2 flex justify-center gap-4">
                    <a
                        href="/privacy.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-500 hover:text-cyan-400 underline"
                    >
                        Privacy Policy
                    </a>
                    <span className="text-[10px] text-slate-700">•</span>
                    <span className="text-[10px] text-slate-700">v1.0.0 Alpha</span>
                </div>
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

            {/* Auth Modal */}
            {showAuth && (
                <AuthScreen onClose={() => setShowAuth(false)} />
            )}

            {/* Auth Modal */}
            {showAuth && (
                <AuthScreen onClose={() => setShowAuth(false)} />
            )}
        </div>
    );
}
