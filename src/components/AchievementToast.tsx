
import { useEffect, useState, useRef } from "react";
import { useRunStore } from "../state/useRunStore";
import { ACHIEVEMENTS } from "../utils/achievements";
import { X } from "lucide-react";

export function AchievementToast() {
    const achievements = useRunStore((s) => s.achievements);
    const [queue, setQueue] = useState<string[]>([]);
    const [current, setCurrent] = useState<string | null>(null);
    const prevCount = useRef(achievements.length);

    // Detect new achievements
    useEffect(() => {
        if (achievements.length > prevCount.current) {
            const newIds = achievements.slice(prevCount.current);
            setQueue((q) => [...q, ...newIds]);
        }
        prevCount.current = achievements.length;
    }, [achievements]);

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

    const achievement = ACHIEVEMENTS.find((a) => a.id === current);
    if (!achievement) return null; // Should not happen

    return (
        <div className="fixed top-4 left-4 right-4 z-[100] flex justify-center pointer-events-none">
            <div className="
            flex items-center gap-4 rounded-xl border border-amber-500/30 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md 
            animate-in slide-in-from-top-4 fade-in duration-300
            max-w-sm w-full pointer-events-auto
        ">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg ring-2 ring-amber-500/20">
                    <achievement.icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Achievement Unlocked</div>
                    <h3 className="text-lg font-bold text-white truncate">{achievement.title}</h3>
                    <p className="text-xs text-slate-400 truncate">{achievement.description}</p>
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
