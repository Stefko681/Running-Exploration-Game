// Simulation Utilities

const PREFIXES = [
    "Neon", "Cyber", "Shadow", "Ghost", "Void", "Solar", "Lunar", "Iron",
    "Steel", "Chrome", "Digital", "Laser", "Turbo", "Hyper", "Mega", "Ultra",
    "Night", "Dawn", "Dusk", "Storm", "Frost", "Flame", "Electric", "Techno"
];

const SUFFIXES = [
    "Runner", "Walker", "Stider", "Sprinter", "Hunter", "Stalker", "Drifter",
    "Surfer", "Glider", "Racer", "Dasher", "Chaser", "Seeker", "Scout",
    "Master", "King", "Queen", "Lord", "Ninja", "Samurai", "Viper", "Wolf"
];

const TAGS = [
    "99", "77", "X", "Zero", "One", "Prime", "Elite", "Pro", "Core", "Flux"
];

export function generateName(): string {
    const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const s = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const t = Math.random() > 0.7 ? `_${TAGS[Math.floor(Math.random() * TAGS.length)]}` : "";

    // 10% chance for a "Real" name style
    if (Math.random() > 0.9) {
        const realNames = ["Alex", "Sarah", "Mike", "Kat", "Jinx", "Vi", "David", "Sam"];
        return `${realNames[Math.floor(Math.random() * realNames.length)]}_${s}`;
    }

    return `${p}${s}${t}`;
}
