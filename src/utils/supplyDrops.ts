
import type { LatLngPoint } from "../types";
import { haversineMeters } from "./geo";

export type SupplyDrop = {
    id: string;
    lat: number;
    lng: number;
    collected: boolean;
    expiresAt: number; // Unix timestamp
};

// Generate a random point within radiusMeters of center
export function generateRandomPoint(center: LatLngPoint, radiusMeters: number): { lat: number; lng: number } {
    const r = radiusMeters / 111300; // Convert meters to roughly degrees
    const u = Math.random();
    const v = Math.random();
    const w = r * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    // Adjust for longitude shrinking at higher latitudes
    const newLat = x + center.lat;
    const newLng = y / Math.cos(center.lat * (Math.PI / 180)) + center.lng;

    return { lat: newLat, lng: newLng };
}

export function generateDailyDrops(center: LatLngPoint, count: number = 3, radiusMeters: number = 1500): SupplyDrop[] {
    const drops: SupplyDrop[] = [];
    const now = Date.now();
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0); // Expires at next midnight

    for (let i = 0; i < count; i++) {
        const point = generateRandomPoint(center, radiusMeters);
        drops.push({
            id: `drop-${now}-${i}`,
            lat: point.lat,
            lng: point.lng,
            collected: false,
            expiresAt: tomorrow.getTime()
        });
    }

    return drops;
}

export function checkDropCollection(userLoc: LatLngPoint, drop: SupplyDrop): boolean {
    if (drop.collected) return false;
    const dist = haversineMeters(userLoc, { lat: drop.lat, lng: drop.lng, t: 0 });
    return dist <= 50; // 50m collection radius
}
