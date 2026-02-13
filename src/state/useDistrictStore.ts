import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OSMDistrict } from '../services/DistrictService';
import { stitchWaysToPolygons } from '../utils/districtGeometry';
import { computeVoronoi } from '../utils/voronoi';

type Point = { lat: number; lon: number };
type ParsedDistrict = {
    id: number;
    name: string;
    bounds: { minlat: number; minlon: number; maxlat: number; maxlon: number };
    polygons: Point[][];
};

// Simple Ray-Casting Point-in-Polygon
function isPointInPolygon(point: Point, vs: Point[]) {
    const x = point.lat;
    const y = point.lon;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].lat;
        const yi = vs[i].lon;
        const xj = vs[j].lat;
        const yj = vs[j].lon;
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function normalizeDistricts(data: any): ParsedDistrict[] {
    const nodes = data.filter((e: any) => e.type === "node" && e.lat && e.lon);
    const ways = data.filter((e: any) => e.type === "way" && e.geometry);
    const relations = data.filter((e: any) => e.type === "relation");
    const result: ParsedDistrict[] = [];

    relations.forEach((element: any) => {
        const outerWays: Point[][] = element.members
            ?.filter((m: any) => m.role === "outer" && m.geometry)
            .map((m: any) => m.geometry) || [];
        const stitched = stitchWaysToPolygons(outerWays);
        const polygons = stitched.length > 0 ? stitched : outerWays;
        result.push({
            id: element.id,
            name: element.tags?.name || element.tags?.["name:en"] || "Unknown District",
            bounds: element.bounds,
            polygons
        });
    });

    ways.forEach((element: any) => {
        result.push({
            id: element.id,
            name: element.tags?.name || element.tags?.["name:en"] || "Unknown District",
            bounds: element.bounds || {
                minlat: Math.min(...element.geometry.map((p: any) => p.lat)),
                minlon: Math.min(...element.geometry.map((p: any) => p.lon)),
                maxlat: Math.max(...element.geometry.map((p: any) => p.lat)),
                maxlon: Math.max(...element.geometry.map((p: any) => p.lon))
            },
            polygons: [element.geometry]
        });
    });

    if (nodes.length > 0) {
        const voronoiPoints = nodes.map((node: any) => ({ lat: node.lat, lon: node.lon, id: node.id }));
        const voronoiPolygons = computeVoronoi(voronoiPoints);
        voronoiPolygons.forEach(({ id, polygon }: { id: number; polygon: Point[] }) => {
            const node = nodes.find((n: any) => n.id === id);
            if (node) {
                result.push({
                    id: node.id,
                    name: node.tags?.name || node.tags?.["name:en"] || "Unknown District",
                    bounds: {
                        minlat: Math.min(...polygon.map((p: Point) => p.lat)),
                        minlon: Math.min(...polygon.map((p: Point) => p.lon)),
                        maxlat: Math.max(...polygon.map((p: Point) => p.lat)),
                        maxlon: Math.max(...polygon.map((p: Point) => p.lon))
                    },
                    polygons: [polygon]
                });
            }
        });
    }

    return result;
}

interface DistrictState {
    unlockedDistricts: string[]; // List of relation IDs
    districts: OSMDistrict[]; // Fetched district boundaries
    isLoading: boolean; // True while fetching districts
    error: string | null; // Error message if fetch failed
    lastFetchLocation: { lat: number; lon: number } | null; // Track last fetch location

    unlockDistrict: (id: string) => void;
    isUnlocked: (id: string) => boolean;
    setDistricts: (districts: OSMDistrict[], location: { lat: number; lon: number }) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    resetDistricts: () => void;
    recalculateUnlocks: (revealedPoints: { lat: number; lng: number }[]) => void;
}

export const useDistrictStore = create<DistrictState>()(
    persist(
        (set, get) => ({
            unlockedDistricts: [],
            districts: [],
            isLoading: false,
            error: null,
            lastFetchLocation: null,

            unlockDistrict: (id: string) => {
                const current = get().unlockedDistricts;
                if (!current.includes(id)) {
                    set({ unlockedDistricts: [...current, id] });
                }
            },

            isUnlocked: (id: string) => {
                return get().unlockedDistricts.includes(id);
            },

            setDistricts: (districts: OSMDistrict[], location: { lat: number; lon: number }) => {
                set({
                    districts,
                    lastFetchLocation: location,
                    error: null,
                    isLoading: false
                });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },

            setError: (error: string | null) => {
                set({ error, isLoading: false });
            },

            resetDistricts: () => {
                set({
                    unlockedDistricts: [],
                    districts: [],
                    lastFetchLocation: null,
                    error: null
                });
            },

            recalculateUnlocks: (revealedPoints: { lat: number; lng: number }[]) => {
                const { districts } = get();
                if (districts.length === 0 || revealedPoints.length === 0) return;

                const parsed = normalizeDistricts(districts);
                const current = get().unlockedDistricts;
                const newUnlocks = new Set(current);

                for (const d of parsed) {
                    const idStr = d.id.toString();
                    if (newUnlocks.has(idStr)) continue; // Already unlocked

                    // Check if ANY revealed point falls inside this district
                    for (const rp of revealedPoints) {
                        // Fast bounds check
                        if (
                            rp.lat < d.bounds.minlat ||
                            rp.lat > d.bounds.maxlat ||
                            rp.lng < d.bounds.minlon ||
                            rp.lng > d.bounds.maxlon
                        ) continue;

                        // Precise polygon check
                        let inside = false;
                        for (const poly of d.polygons) {
                            if (isPointInPolygon({ lat: rp.lat, lon: rp.lng }, poly)) {
                                inside = true;
                                break;
                            }
                        }

                        if (inside) {
                            newUnlocks.add(idStr);
                            console.log(`Retroactively unlocked district: ${d.name}`);
                            break; // No need to check more points for this district
                        }
                    }
                }

                if (newUnlocks.size > current.length) {
                    set({ unlockedDistricts: Array.from(newUnlocks) });
                }
            }
        }),
        {
            name: 'district-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
