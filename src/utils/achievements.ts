
import { LucideIcon, Footprints, Moon, Sun, Flame, Map, Medal } from "lucide-react";
import type { RunSummary, LatLngPoint } from "../types";

export type Achievement = {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    condition: (stats: AchievementStats) => boolean;
};

export type AchievementStats = {
    totalDistance: number;
    totalRuns: number;
    totalRevealed: number;
    currentStreak: number;
    lastRun?: RunSummary;
};

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: "first_steps",
        title: "First Steps",
        description: "Complete your first run.",
        icon: Footprints,
        condition: (s) => s.totalRuns >= 1
    },
    {
        id: "night_owl",
        title: "Night Owl",
        description: "Complete a run between 10 PM and 4 AM.",
        icon: Moon,
        condition: (s) => {
            if (!s.lastRun) return false;
            const hour = new Date(s.lastRun.startedAt).getHours();
            return hour >= 22 || hour < 4;
        }
    },
    {
        id: "early_bird",
        title: "Early Bird",
        description: "Complete a run between 5 AM and 8 AM.",
        icon: Sun,
        condition: (s) => {
            if (!s.lastRun) return false;
            const hour = new Date(s.lastRun.startedAt).getHours();
            return hour >= 5 && hour < 8;
        }
    },
    {
        id: "on_fire",
        title: "On Fire",
        description: "Reach a 3-day running streak.",
        icon: Flame,
        condition: (s) => s.currentStreak >= 3
    },
    {
        id: "explorer",
        title: "Explorer",
        description: "Reveal 1,000 fog points.",
        icon: Map,
        condition: (s) => s.totalRevealed >= 1000
    },
    {
        id: "marathoner",
        title: "Marathoner",
        description: "Accumulate 42km of total distance.",
        icon: Medal,
        condition: (s) => s.totalDistance >= 42000
    }
];

export function checkNewAchievements(
    currentUnlocked: string[],
    stats: AchievementStats
): string[] {
    const newUnlocked: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
        if (currentUnlocked.includes(achievement.id)) continue;

        if (achievement.condition(stats)) {
            newUnlocked.push(achievement.id);
        }
    }

    return newUnlocked;
}
