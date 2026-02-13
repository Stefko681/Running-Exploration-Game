import { LucideIcon, Footprints, Moon, Flame, Map, Medal, Package, Zap, Calendar, Mountain, Skull, Sunrise, Coffee, Utensils, Briefcase, Activity, Clock, MapPin, Globe } from "lucide-react";
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
    /** Current progress extractor for progress bar display */
    progress?: (stats: AchievementStats) => { current: number; target: number };
};

export type AchievementStats = {
    totalDistance: number;
    totalRuns: number;
    totalRevealed: number;
    currentStreak: number;
    totalSupplyDrops: number;
    unlockedDistricts: number;
    totalDistricts: number;
    lastRun?: RunSummary;
};

// --- Helper Functions ---

const isBetweenHours = (date: number, start: number, end: number) => {
    const h = new Date(date).getHours();
    if (start <= end) return h >= start && h < end;
    return h >= start || h < end; // Wrap around midnight
};

// --- 1. Logarithmic Milestones (The "Grind") ---


const milestones: Achievement[] = [];

// Distance Milestones (1, 5, 10, 21, 42, 50, 100... 10000)
const distNames = [
    "First Steps", "Warmed Up", "Double Digits", "Half Marathoner", "Marathoner",
    "Fifty Down", "Century Runner", "Road Warrior", "Ultrarunner", "Thousand Club",
    "Ironclad", "Legendary Distance", "Transcendent"
];
const distPoints = [1, 5, 10, 21, 42, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
distPoints.forEach((km, i) => {
    milestones.push({
        id: `dist_${km}`,
        category: "distance",
        title: distNames[i] || `Distance ${km}km`,
        description: `Accumulate ${km.toLocaleString()} km total distance.`,
        icon: Activity,
        difficulty: Math.min(100, i * 8 + 1),
        value: km,
        condition: s => s.totalDistance >= km * 1000,
        progress: s => ({ current: Math.min(s.totalDistance / 1000, km), target: km }),
    });
});

// Run Count Milestones
const runNames = [
    "Lacing Up", "Regulars Club", "Dedicated", "Committed", "Half Century",
    "Centurion", "Obsessed", "Year-Round", "Five Hundred Strong", "The Thousand"
];
const runPoints = [1, 5, 10, 25, 50, 100, 200, 365, 500, 1000];
runPoints.forEach((count, i) => {
    milestones.push({
        id: `runs_${count}`,
        category: "runs",
        title: runNames[i] || `${count} Runs`,
        description: `Complete ${count} total runs.`,
        icon: Footprints,
        difficulty: Math.min(100, i * 10 + 1),
        value: count,
        condition: s => s.totalRuns >= count,
        progress: s => ({ current: Math.min(s.totalRuns, count), target: count }),
    });
});

// Exploration Milestones
const expNames = [
    "Peeling the Map", "Neighbourhood Watch", "Quarter Explorer", "District Scanner",
    "City Cartographer", "Metropolitan", "Grand Surveyor", "The Unveiler"
];
const expPoints = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000];
expPoints.forEach((pts, i) => {
    milestones.push({
        id: `exp_${pts}`,
        category: "exploration",
        title: expNames[i] || `Explorer ${pts}`,
        description: `Reveal ${pts.toLocaleString()} fog points.`,
        icon: Map,
        difficulty: Math.min(100, i * 12 + 2),
        value: pts,
        condition: s => s.totalRevealed >= pts,
        progress: s => ({ current: Math.min(s.totalRevealed, pts), target: pts }),
    });
});

// Drop Milestones
const dropNames = [
    "First Loot", "Scavenger", "Supply Runner", "Quartermaster",
    "Stockpiler", "Resource Baron", "Hoarder Supreme", "Drop Lord"
];
const dropPoints = [1, 5, 10, 25, 50, 100, 250, 500];
dropPoints.forEach((count, i) => {
    milestones.push({
        id: `drops_${count}`,
        category: "drops",
        title: dropNames[i] || `${count} Drops`,
        description: `Collect ${count} supply drops.`,
        icon: Package,
        difficulty: Math.min(100, i * 12 + 5),
        value: count,
        condition: s => s.totalSupplyDrops >= count,
        progress: s => ({ current: Math.min(s.totalSupplyDrops, count), target: count }),
    });
});

// --- 2. Unique / Flavored Challenges (The "Fun" Stuff) ---

const unique: Achievement[] = [
    // --- Single Run Distance ---
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
        id: "fiver",
        title: "High Five",
        description: "Run 5km in a single session.",
        icon: Zap,
        category: "distance",
        difficulty: 25,
        value: 5,
        condition: s => (s.lastRun?.distanceMeters ?? 0) >= 5000
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
    {
        id: "half_marathon_single",
        title: "Half Marathon Hero",
        description: "Run 21.1km in a single session.",
        icon: Medal,
        category: "distance",
        difficulty: 70,
        value: 21,
        condition: s => (s.lastRun?.distanceMeters ?? 0) >= 21097
    },
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

    // --- Speed / Pace ---
    {
        id: "speed_demon",
        title: "Speed Demon",
        description: "Average above 12 km/h in a run of at least 2km.",
        icon: Zap,
        category: "special",
        difficulty: 35,
        value: 12,
        condition: s => {
            if (!s.lastRun || s.lastRun.distanceMeters < 2000) return false;
            const hours = (s.lastRun.endedAt - s.lastRun.startedAt) / 3600000;
            const kmh = (s.lastRun.distanceMeters / 1000) / hours;
            return kmh >= 12;
        }
    },
    {
        id: "turbo_mode",
        title: "Turbo Mode",
        description: "Average above 15 km/h in a run of at least 1km.",
        icon: Zap,
        category: "special",
        difficulty: 60,
        value: 15,
        condition: s => {
            if (!s.lastRun || s.lastRun.distanceMeters < 1000) return false;
            const hours = (s.lastRun.endedAt - s.lastRun.startedAt) / 3600000;
            const kmh = (s.lastRun.distanceMeters / 1000) / hours;
            return kmh >= 15;
        }
    },
    {
        id: "scenic_route",
        title: "Scenic Route",
        description: "Complete a leisurely run of 3km+ at under 7 km/h — enjoy the view!",
        icon: Sunrise,
        category: "special",
        difficulty: 10,
        value: 3,
        condition: s => {
            if (!s.lastRun || s.lastRun.distanceMeters < 3000) return false;
            const hours = (s.lastRun.endedAt - s.lastRun.startedAt) / 3600000;
            const kmh = (s.lastRun.distanceMeters / 1000) / hours;
            return kmh < 7;
        }
    },

    // --- Duration ---
    {
        id: "thirty_minutes",
        title: "Half Hour Hustle",
        description: "Run for at least 30 minutes without stopping.",
        icon: Clock,
        category: "special",
        difficulty: 15,
        value: 30,
        condition: s => {
            if (!s.lastRun) return false;
            return (s.lastRun.endedAt - s.lastRun.startedAt) >= 30 * 60 * 1000;
        }
    },
    {
        id: "sixty_minutes",
        title: "The Full Hour",
        description: "Run for at least 60 minutes without stopping.",
        icon: Clock,
        category: "special",
        difficulty: 30,
        value: 60,
        condition: s => {
            if (!s.lastRun) return false;
            return (s.lastRun.endedAt - s.lastRun.startedAt) >= 60 * 60 * 1000;
        }
    },
    {
        id: "two_hours",
        title: "Ultra Endurance",
        description: "Run for over 2 hours in a single session.",
        icon: Clock,
        category: "special",
        difficulty: 55,
        value: 120,
        condition: s => {
            if (!s.lastRun) return false;
            return (s.lastRun.endedAt - s.lastRun.startedAt) >= 120 * 60 * 1000;
        }
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
    {
        id: "dawn_patrol",
        title: "Dawn Patrol",
        description: "Start a run before 6 AM.",
        icon: Sunrise,
        category: "special",
        difficulty: 20,
        value: 4,
        condition: s => {
            if (!s.lastRun) return false;
            return new Date(s.lastRun.startedAt).getHours() < 6;
        }
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

    // --- Streak Achievements ---
    {
        id: "streak_3",
        title: "Warming Up",
        description: "Reach a 3-day running streak.",
        icon: Flame,
        category: "streak",
        difficulty: 10,
        value: 3,
        condition: s => s.currentStreak >= 3,
        progress: s => ({ current: Math.min(s.currentStreak, 3), target: 3 }),
    },
    {
        id: "streak_7",
        title: "One Full Week",
        description: "Reach a 7-day running streak.",
        icon: Flame,
        category: "streak",
        difficulty: 20,
        value: 7,
        condition: s => s.currentStreak >= 7,
        progress: s => ({ current: Math.min(s.currentStreak, 7), target: 7 }),
    },
    {
        id: "streak_14",
        title: "Two Week Terror",
        description: "Reach a 14-day running streak.",
        icon: Flame,
        category: "streak",
        difficulty: 35,
        value: 14,
        condition: s => s.currentStreak >= 14,
        progress: s => ({ current: Math.min(s.currentStreak, 14), target: 14 }),
    },
    {
        id: "iron_will",
        title: "Iron Will",
        description: "Reach a 30-day running streak.",
        icon: Flame,
        category: "streak",
        difficulty: 60,
        value: 30,
        condition: s => s.currentStreak >= 30,
        progress: s => ({ current: Math.min(s.currentStreak, 30), target: 30 }),
    },
    {
        id: "streak_90",
        title: "Quarter Year Beast",
        description: "Maintain a 90-day running streak.",
        icon: Skull,
        category: "streak",
        difficulty: 80,
        value: 90,
        condition: s => s.currentStreak >= 90,
        progress: s => ({ current: Math.min(s.currentStreak, 90), target: 90 }),
    },
    {
        id: "year_of_running",
        title: "Unstoppable",
        description: "Reach a 365-day running streak.",
        icon: Skull,
        category: "streak",
        difficulty: 99,
        value: 365,
        condition: s => s.currentStreak >= 365,
        progress: s => ({ current: Math.min(s.currentStreak, 365), target: 365 }),
    },

    // --- GPS Points / Exploration ---
    {
        id: "data_hog",
        title: "Data Collector",
        description: "Accumulate 1,000 GPS points in a single run.",
        icon: Activity,
        category: "exploration",
        difficulty: 20,
        value: 1000,
        condition: s => (s.lastRun?.points.length ?? 0) >= 1000
    },
    {
        id: "precision_mapper",
        title: "Precision Mapper",
        description: "Record 5,000 GPS points in a single run.",
        icon: Activity,
        category: "exploration",
        difficulty: 45,
        value: 5000,
        condition: s => (s.lastRun?.points.length ?? 0) >= 5000
    },
];

// --- 3. District & City Exploration Achievements ---

const districtMilestones = [1, 5, 10, 15, 20];
const districtAchievements: Achievement[] = districtMilestones.map(count => ({
    id: `districts_${count}`,
    title: count === 1 ? "First Contact" : count === 5 ? "District Hopper" : count === 10 ? "Urban Explorer" : count === 15 ? "City Veteran" : "District Master",
    description: count === 1 ? "Unlock your first district." : `Unlock ${count} districts.`,
    icon: MapPin,
    category: "exploration" as AchievementCategory,
    difficulty: count * 4,
    value: count,
    condition: (s: AchievementStats) => s.unlockedDistricts >= count,
    progress: (s: AchievementStats) => ({ current: Math.min(s.unlockedDistricts, count), target: count }),
}));

const cityPercentages = [
    { pct: 10, title: "Trailblazer", desc: "Explore 10% of the city." },
    { pct: 25, title: "Quarter Conqueror", desc: "Explore 25% of the city." },
    { pct: 50, title: "Half the Map", desc: "Explore 50% of the city." },
    { pct: 75, title: "Almost There", desc: "Explore 75% of the city." },
    { pct: 100, title: "City Dominator", desc: "Explore 100% of the city — every district unlocked!" },
];
const cityAchievements: Achievement[] = cityPercentages.map(({ pct, title, desc }) => ({
    id: `city_pct_${pct}`,
    title,
    description: desc,
    icon: Globe,
    category: "exploration" as AchievementCategory,
    difficulty: pct,
    value: pct,
    condition: (s: AchievementStats) => s.totalDistricts > 0 && (s.unlockedDistricts / s.totalDistricts) * 100 >= pct,
    progress: (s: AchievementStats) => {
        const currentPct = s.totalDistricts > 0 ? Math.round((s.unlockedDistricts / s.totalDistricts) * 100) : 0;
        return { current: Math.min(currentPct, pct), target: pct };
    },
}));

export const ACHIEVEMENTS: Achievement[] = [
    ...milestones,
    ...unique,
    ...districtAchievements,
    ...cityAchievements,
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
