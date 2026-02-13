
import { useEffect, useState, useRef } from "react";
import { useRunStore } from "../state/useRunStore";
import { ACHIEVEMENTS } from "../utils/achievements";
import { X, Package } from "lucide-react";

export function AchievementToast() {
    const achievements = useRunStore((s) => s.achievements);
    const lastCollectedDrop = useRunStore((s) => s.lastCollectedDrop);
    const clearLastCollectedDrop = useRunStore((s) => s.clearLastCollectedDrop);
    const isHydrated = useRunStore((s) => s.isHydrated);

    const [queue, setQueue] = useState<any[]>([]);
    const [current, setCurrent] = useState<any | null>(null);
    const prevCount = useRef(achievements.length);
    const wasHydrated = useRef(false);

    // Detect new achievements
    useEffect(() => {
        // If we just hydrated, catch up prevCount without toast
        if (isHydrated && !wasHydrated.current) {
            prevCount.current = achievements.length;
            wasHydrated.current = true;
            return;
        }

        if (isHydrated && achievements.length > prevCount.current) {
            const newIds = achievements.slice(prevCount.current);
            setQueue((q) => [...q, ...newIds.map(id => ({ type: 'achievement', id }))]);
        }
        prevCount.current = achievements.length;
    }, [achievements, isHydrated]);

    // Detect drop collection
    useEffect(() => {
        if (lastCollectedDrop) {
            setQueue((q) => [...q, { type: 'drop', id: lastCollectedDrop.id }]);
            clearLastCollectedDrop();
        }
    }, [lastCollectedDrop, clearLastCollectedDrop]);

    // Process queue
    useEffect(() => {
        if (!current && queue.length > 0) {
            setCurrent(queue[0]);
            setQueue((q) => q.slice(1));
        }
    }, [queue, current]);

    // Auto dismiss
    useEffect(() => {
        if (current) {
            const timer = setTimeout(() => {
                setCurrent(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [current]);

    if (!current) return null;

    let title = "";
    let description = "";
    let Icon = null;

    if (current.type === 'achievement') {
        const achievement = ACHIEVEMENTS.find((a) => a.id === current.id);
        if (!achievement) return null;
        title = achievement.title;
        description = achievement.description;
        Icon = achievement.icon;
    } else if (current.type === 'drop') {
        title = "Supply Drop Secured";
        description = "You've collected a supply drop! Keep running to find more.";
        Icon = Package;
    } else {
        return null; // Unknown type
    }

    // Parse colors from colorClass for specific elements
    // This is a bit hacky, but robust enough for now or we can allow styling in the block
    const isDrop = current.type === 'drop';
    const borderClass = isDrop ? "border-cyan-500/30" : "border-amber-500/30";
    const bgGradient = isDrop ? "from-cyan-400 to-blue-600" : "from-amber-400 to-orange-600";
    const textTitleColor = isDrop ? "text-cyan-500" : "text-amber-500";
    const ringColor = isDrop ? "ring-cyan-500/20" : "ring-amber-500/20";

    return (
        <div className="fixed top-4 left-4 right-4 z-[100] flex justify-center pointer-events-none">
            <div className={`
            flex items-center gap-4 rounded-xl border ${borderClass} bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md 
            animate-in slide-in-from-top-4 fade-in duration-300
            max-w-sm w-full pointer-events-auto
        `}>
                <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br ${bgGradient} text-white shadow-lg ring-2 ${ringColor}`}>
                    {Icon && <Icon size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${textTitleColor}`}>{current.type === 'drop' ? 'Supply Drop' : 'Achievement Unlocked'}</div>
                    <h3 className="text-lg font-bold text-white truncate">{title}</h3>
                    <p className="text-xs text-slate-400 truncate">{description}</p>
                </div>
                <button
                    onClick={() => setCurrent(null)}
                    className="text-slate-500 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
