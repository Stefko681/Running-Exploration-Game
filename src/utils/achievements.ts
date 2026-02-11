import { LucideIcon, Footprints, Moon, Flame, Map, Medal, Package, Zap, Calendar, Mountain, Skull, Sunrise, Coffee, Utensils, Briefcase, Activity } from "lucide-react";
import type { RunSummary } from "../types";

export type AchievementCategory = "distance" | "runs" | "exploration" | "streak" | "drops" | "special";

export type Achievement = {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    condition: (stats: AchievementStats) => boolean;
    category: AchievementCategory;
    difficulty: number; // 1-100
    value: number; // For sorting
};

export type AchievementStats = {
    totalDistance: number;
    totalRuns: number;
    totalRevealed: number;
    currentStreak: number;
    totalSupplyDrops: number;
    lastRun?: RunSummary;
};

// --- Helper Functions ---

const isBetweenHours = (date: number, start: number, end: number) => {
    const h = new Date(date).getHours();
    if (start <= end) return h >= start && h < end;
    return h >= start || h < end; // Wrap around midnight
};

// --- 1. Logarithmic Milestones (The "Grind") ---

const createMilestone = (
    id: string,
    cat: AchievementCategory,
    title: string,
    desc: string,
    icon: LucideIcon,
    diff: number,
    val: number,
    cond: (s: AchievementStats) => boolean
): Achievement => ({
    id, title, description: desc, icon, category: cat, difficulty: diff, value: val, condition: cond
});

const milestones: Achievement[] = [];

// Distance Milestones (1, 5, 10, 25, 50, 100... 10000)
const distPoints = [1, 5, 10, 21, 42, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
distPoints.forEach((km, i) => {
    milestones.push(createMilestone(
        `dist_${km}`,
        "distance",
        km === 42 ? "Marathoner" : km === 21 ? "Half Marathoner" : `Distance Tier ${i + 1}`,
        `Accumulate ${km.toLocaleString()} km total distance.`,
        Activity,
        Math.min(100, i * 8 + 1),
        km,
        s => s.totalDistance >= km * 1000
    ));
});

// Run Count Milestones
const runPoints = [1, 5, 10, 25, 50, 100, 200, 365, 500, 1000];
runPoints.forEach((count, i) => {
    milestones.push(createMilestone(
        `runs_${count}`,
        "runs",
        `Runner Rank ${i + 1}`,
        `Complete ${count} total runs.`,
        Footprints,
        Math.min(100, i * 10 + 1),
        count,
        s => s.totalRuns >= count
    ));
});

// Exploration Milestones
const expPoints = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000];
expPoints.forEach((pts, i) => {
    milestones.push(createMilestone(
        `exp_${pts}`,
        "exploration",
        `Explorer Rank ${i + 1}`,
        `Reveal ${pts.toLocaleString()} fog points.`,
        Map,
        Math.min(100, i * 12 + 2),
        pts,
        s => s.totalRevealed >= pts
    ));
});

// Drop Milestones
const dropPoints = [1, 5, 10, 25, 50, 100, 250, 500];
dropPoints.forEach((count, i) => {
    milestones.push(createMilestone(
        `drops_${count}`,
        "drops",
        `Scavenger Rank ${i + 1}`,
        `Collect ${count} supply drops.`,
        Package,
        Math.min(100, i * 12 + 5),
        count,
        s => s.totalSupplyDrops >= count
    ));
});

// --- 2. Unique / Flavored Challenges (The "Fun" Stuff) ---

const unique: Achievement[] = [
    // --- Tempo / Speed ---
    {
        id: "sprint_1k",
        title: "The Sprinter",
        description: "Complete a run of at least 1km.",
        icon: Zap,
        category: "special",
        difficulty: 10,
        value: 1,
        condition: s => (s.lastRun?.distanceMeters ?? 0) >= 1000
    },
    {
        id: "long_haul_10k",
        title: "Endurance Test",
        description: "Run 10km in a single session.",
        icon: Mountain,
        category: "distance",
        difficulty: 40,
        value: 10,
        condition: s => (s.lastRun?.distanceMeters ?? 0) >= 10000
    },

    // --- Time of Day ---
    {
        id: "early_bird",
        title: "Early Bird",
        description: "Finish a run between 5 AM and 8 AM.",
        icon: Sunrise,
        category: "special",
        difficulty: 15,
        value: 5,
        condition: s => s.lastRun ? isBetweenHours(s.lastRun.endedAt, 5, 8) : false
    },
    {
        id: "lunch_break",
        title: "Lunch Rush",
        description: "Run between 11 AM and 1 PM.",
        icon: Utensils,
        category: "special",
        difficulty: 5,
        value: 12,
        condition: s => s.lastRun ? isBetweenHours(s.lastRun.endedAt, 11, 13) : false
    },
    {
        id: "night_owl",
        title: "Night Stalker",
        description: "Run between 11 PM and 4 AM.",
        icon: Moon,
        category: "special",
        difficulty: 25,
        value: 23,
        condition: s => s.lastRun ? isBetweenHours(s.lastRun.endedAt, 23, 4) : false
    },
    {
        id: "after_work",
        title: "Decompress",
        description: "Run between 5 PM and 7 PM.",
        icon: Briefcase,
        category: "special",
        difficulty: 5,
        value: 17,
        condition: s => s.lastRun ? isBetweenHours(s.lastRun.endedAt, 17, 19) : false
    },

    // --- Calendar ---
    {
        id: "weekend_warrior",
        title: "Weekend Warrior",
        description: "Run on a Saturday or Sunday.",
        icon: Calendar,
        category: "special",
        difficulty: 10,
        value: 6,
        condition: s => {
            if (!s.lastRun) return false;
            const d = new Date(s.lastRun.startedAt).getDay();
            return d === 0 || d === 6;
        }
    },
    {
        id: "monday_motivation",
        title: "Monday Motivation",
        description: "Start the week strong with a run on Monday.",
        icon: Coffee,
        category: "special",
        difficulty: 20,
        value: 1,
        condition: s => {
            if (!s.lastRun) return false;
            return new Date(s.lastRun.startedAt).getDay() === 1;
        }
    },

    // --- Hardcore ---
    {
        id: "marathon_single",
        title: "The Full Marathon",
        description: "Run 42.2km in a single session.",
        icon: Medal,
        category: "distance",
        difficulty: 90,
        value: 42,
        condition: s => (s.lastRun?.distanceMeters ?? 0) >= 42195
    },
    {
        id: "iron_will",
        title: "Iron Will",
        description: "Reach a 30-day running streak.",
        icon: Flame,
        category: "streak",
        difficulty: 60,
        value: 30,
        condition: s => s.currentStreak >= 30
    },
    {
        id: "year_of_running",
        title: "Unstoppable",
        description: "Reach a 365-day running streak.",
        icon: Skull,
        category: "streak",
        difficulty: 99,
        value: 365,
        condition: s => s.currentStreak >= 365
    }
];

export const ACHIEVEMENTS: Achievement[] = [
    ...milestones,
    ...unique
];

export function checkNewAchievements(
    currentUnlocked: string[],
    stats: AchievementStats
): string[] {
    const newUnlocked: string[] = [];
    const unlockedSet = new Set(currentUnlocked);

    for (const achievement of ACHIEVEMENTS) {
        if (unlockedSet.has(achievement.id)) continue;

        if (achievement.condition(stats)) {
            newUnlocked.push(achievement.id);
        }
    }

    return newUnlocked;
}
