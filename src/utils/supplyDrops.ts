import type { LatLngPoint } from "../types";

export type DropRewardType = "xp" | "streak_shield" | "fog_boost";

export type DropReward = {
    type: DropRewardType;
    amount: number;
    label: string;
    icon: string;
};

export type SupplyDrop = {
    id: string;
    lat: number;
    lng: number;
    collected: boolean;
    reward: DropReward;
};

const REWARD_TABLE: DropReward[] = [
    { type: "xp", amount: 100, label: "+100 XP Bonus", icon: "⚡" },
    { type: "xp", amount: 250, label: "+250 XP Bonus", icon: "⚡" },
    { type: "xp", amount: 500, label: "+500 XP Jackpot!", icon: "💎" },
    { type: "streak_shield", amount: 1, label: "Streak Shield 🛡️", icon: "🛡️" },
    { type: "fog_boost", amount: 100, label: "Fog Boost x2", icon: "🌊" },
];

function randomReward(): DropReward {
    // Weighted: XP common, shields/boosts rare
    const roll = Math.random();
    if (roll < 0.45) return REWARD_TABLE[0];      // 100 XP — 45%
    if (roll < 0.75) return REWARD_TABLE[1];      // 250 XP — 30%
    if (roll < 0.85) return REWARD_TABLE[2];      // 500 XP — 10%
    if (roll < 0.95) return REWARD_TABLE[3];      // Streak Shield — 10%
    return REWARD_TABLE[4];                        // Fog Boost — 5%
}

/**
 * Generate supply drops around a center point.
 * Drops are placed within a radius, biased toward walkable distances.
 */
export function generateDailyDrops(
    center: LatLngPoint,
    count: number = 5,
    radiusMeters: number = 1500
): SupplyDrop[] {
    const drops: SupplyDrop[] = [];

    for (let i = 0; i < count; i++) {
        // Use polar coordinates for uniform distribution within circle
        const angle = Math.random() * 2 * Math.PI;
        // Bias toward 300-1200m range (more walkable/runnable)
        const minR = 300;
        const dist = minR + Math.random() * (radiusMeters - minR);
        const dLat = (dist * Math.cos(angle)) / 111_320;
        const dLng = (dist * Math.sin(angle)) / (111_320 * Math.cos((center.lat * Math.PI) / 180));

        drops.push({
            id: `drop-${Date.now()}-${i}`,
            lat: center.lat + dLat,
            lng: center.lng + dLng,
            collected: false,
            reward: randomReward(),
        });
    }

    return drops;
}

/** Check if user is close enough to collect a drop (within ~30m). */
export function isNearDrop(userPos: LatLngPoint, drop: SupplyDrop, thresholdMeters = 30): boolean {
    const dLat = (userPos.lat - drop.lat) * 111_320;
    const dLng = (userPos.lng - drop.lng) * 111_320 * Math.cos((userPos.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) < thresholdMeters;
}
