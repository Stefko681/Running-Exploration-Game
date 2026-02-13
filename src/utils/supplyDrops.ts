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

export function generateDailyDrops(
    startPoint: LatLngPoint,
    count: number = 3,
    minDistMeters: number = 3000,
    maxDistMeters: number = 4000
): SupplyDrop[] {
    const drops: SupplyDrop[] = [];
    let currentCenter: { lat: number; lng: number } = startPoint;

    for (let i = 0; i < count; i++) {
        // Use polar coordinates for random direction
        const angle = Math.random() * 2 * Math.PI;

        // Distance is relative to the PREVIOUS drop (or start point for the first one)
        // User requested 3-4km intervals to make it a real exploration challenge
        const dist = minDistMeters + Math.random() * (maxDistMeters - minDistMeters);

        const dLat = (dist * Math.cos(angle)) / 111_320;
        const dLng = (dist * Math.sin(angle)) / (111_320 * Math.cos((currentCenter.lat * Math.PI) / 180));

        const newDrop: SupplyDrop = {
            id: `drop-${Date.now()}-${i}`,
            lat: currentCenter.lat + dLat,
            lng: currentCenter.lng + dLng,
            collected: false,
            reward: randomReward(),
        };

        drops.push(newDrop);

        // Update center so the next drop is generated relative to this one (chaining)
        currentCenter = newDrop;
    }

    return drops;
}

/** Check if user is close enough to collect a drop (within ~30m). */
export function isNearDrop(userPos: LatLngPoint, drop: SupplyDrop, thresholdMeters = 30): boolean {
    const dLat = (userPos.lat - drop.lat) * 111_320;
    const dLng = (userPos.lng - drop.lng) * 111_320 * Math.cos((userPos.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) < thresholdMeters;
}
