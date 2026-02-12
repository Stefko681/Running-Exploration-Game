import { LucideIcon, Zap, Mountain, Flame, Shield, Footprints, Star, Crown, Heart, Target, Compass } from "lucide-react";

export type BadgeDef = {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    bg: string;
};

export const BADGE_DEFINITIONS: BadgeDef[] = [
    { id: "fast", label: "Fast", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/20" },
    { id: "climber", label: "Climber", icon: Mountain, color: "text-purple-400", bg: "bg-purple-400/20" },
    { id: "hot_streak", label: "Hot Streak", icon: Flame, color: "text-orange-400", bg: "bg-orange-400/20" },
    { id: "veteran", label: "Veteran", icon: Shield, color: "text-blue-400", bg: "bg-blue-400/20" },
    { id: "traveler", label: "Traveler", icon: Footprints, color: "text-emerald-400", bg: "bg-emerald-400/20" },
    { id: "star", label: "Rising Star", icon: Star, color: "text-pink-400", bg: "bg-pink-400/20" },
    { id: "king", label: "Royalty", icon: Crown, color: "text-amber-400", bg: "bg-amber-400/20" },
    { id: "dedicated", label: "Dedicated", icon: Heart, color: "text-red-400", bg: "bg-red-400/20" },
    { id: "focus", label: "Focused", icon: Target, color: "text-cyan-400", bg: "bg-cyan-400/20" },
    { id: "scout", label: "Scout", icon: Compass, color: "text-indigo-400", bg: "bg-indigo-400/20" },
];

export const getBadge = (id: string) => BADGE_DEFINITIONS.find(b => b.id === id);

export const COMBAT_STYLES = [
    "Balanced",
    "Sprinter",
    "Marathoner",
    "Explorer",
    "Completionist",
    "Scavenger",
    "Night Owl",
    "Early Bird",
    "Weekend Warrior",
    "Strategist"
];
