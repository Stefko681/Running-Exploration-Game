
import { useRunStore } from "../state/useRunStore";
import { getRank } from "../utils/gamification";
import { ACHIEVEMENTS } from "../utils/achievements";
import { Share2, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { ShareCard } from "../components/ShareCard";
import { formatKm } from "../utils/geo";

export function ProfileScreen() {
    const { runs, revealed, currentStreak, achievements } = useRunStore();

    const totalDistance = runs.reduce((acc, r) => acc + r.distanceMeters, 0);
    const rank = getRank(totalDistance);
    const [showShare, setShowShare] = useState(false);

    // Derived stats
    const totalRuns = runs.length;
    const exploredCount = (() => {
        const s = new Set<string>();
        // Simple approximation for now, or use the store's revealed length if unique cells aren't tracked yet
        return revealed.length;
    })();

    return (
        <div className="h-full overflow-y-auto bg-slate-950 p-4 pb-24 animate-in fade-in duration-500">

            {/* Header */}
            <h1 className="text-3xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6">
                Operator Status
            </h1>

            {/* Rank Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md">
                <div className={`absolute -right-4 -top-4 opacity-20 ${rank.current.color}`}>
                    <rank.current.icon size={120} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 ${rank.current.color}`}>
                            <rank.current.icon size={24} />
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

            {/* Main Stats Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Distance</div>
                    <div className="mt-1 text-2xl font-bold text-white">{formatKm(totalDistance)}<span className="text-sm text-slate-500">km</span></div>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Explored Area</div>
                    <div className="mt-1 text-2xl font-bold text-white">{exploredCount} <span className="text-sm text-slate-500">pts</span></div>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Missions</div>
                    <div className="mt-1 text-2xl font-bold text-white">{totalRuns}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Streak</div>
                    <div className="mt-1 text-2xl font-bold text-orange-400">{currentStreak} <span className="text-sm text-slate-500">days</span></div>
                </div>
            </div>

            {/* Achievements Section */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">Achievements</h2>
                    <span className="text-xs font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-md">
                        {achievements.length} / {ACHIEVEMENTS.length}
                    </span>
                </div>

                <div className="space-y-3">
                    {ACHIEVEMENTS.map((achievement) => {
                        const isUnlocked = achievements.includes(achievement.id);
                        return (
                            <div
                                key={achievement.id}
                                className={`group relative overflow-hidden rounded-xl border p-4 transition-all ${isUnlocked
                                        ? "border-cyan-500/30 bg-cyan-950/20"
                                        : "border-white/5 bg-slate-900/20 opacity-60"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-full ${isUnlocked ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-600"
                                        }`}>
                                        <achievement.icon size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold ${isUnlocked ? "text-white" : "text-slate-400"}`}>
                                                {achievement.title}
                                            </h3>
                                            {isUnlocked && <Unlock size={14} className="text-cyan-500" />}
                                            {!isUnlocked && <Lock size={14} className="text-slate-600" />}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{achievement.description}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Share Conquest Button */}
            <button
                onClick={() => setShowShare(true)}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-slate-700 active:scale-[0.98]"
            >
                <Share2 size={18} />
                Share Conquest Card
            </button>

            {/* Share Modal */}
            {showShare && (
                <ShareCard
                    mode="total"
                    onClose={() => setShowShare(false)}
                />
            )}
        </div>
    );
}
