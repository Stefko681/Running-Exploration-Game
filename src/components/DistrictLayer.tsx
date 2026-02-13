import { useEffect, useMemo } from "react";
import { Polygon, Popup } from "react-leaflet";
import { useDistrictStore } from "../state/useDistrictStore";
import sofiaDistrictsData from "../data/sofia_districts.json";
import varnaDistrictsData from "../data/varna_districts.json";
import plovdivDistrictsData from "../data/plovdiv_districts.json";
import burgasDistrictsData from "../data/burgas_districts.json";
import ruseDistrictsData from "../data/ruse_districts.json";
import staraZagoraDistrictsData from "../data/stara_zagora_districts.json";
import { Lock, Unlock } from "lucide-react";
import { useGeolocation } from "../hooks/useGeolocation";
import { audio } from "../utils/audio";
import { useRunStore } from "../state/useRunStore";
import { stitchWaysToPolygons } from "../utils/districtGeometry";
import { computeVoronoi } from "../utils/voronoi";
import { fetchDistricts, getDistrictCacheKey } from "../services/DistrictService";

type Point = { lat: number; lon: number };
type District = {
    id: number;
    name: string;
    bounds: { minlat: number; minlon: number; maxlat: number; maxlon: number };
    polygons: Point[][]; // Array of polygons (ways), each is array of points
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

function normalizeDistricts(data: any): District[] {
    // Separate nodes, ways, and relations
    const nodes = data.filter((e: any) => e.type === "node" && e.lat && e.lon);
    const ways = data.filter((e: any) => e.type === "way" && e.geometry);
    const relations = data.filter((e: any) => e.type === "relation");

    const result: District[] = [];

    // Process relations (admin boundaries with members)
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

    // Process ways (closed paths with geometry)
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

    // Process nodes using Voronoi diagram
    if (nodes.length > 0) {
        // Prepare points for Voronoi
        const voronoiPoints = nodes.map((node: any) => ({
            lat: node.lat,
            lon: node.lon,
            id: node.id
        }));

        // Compute Voronoi diagram
        const voronoiPolygons = computeVoronoi(voronoiPoints);

        // Create districts from Voronoi cells
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

// Colors for "Toxic Fog"
// Bulgarian cities with hardcoded data
const BULGARIAN_CITIES = [
    { name: "София", lat: 42.6977, lon: 23.3219, data: sofiaDistrictsData },
    { name: "Пловдив", lat: 42.6977, lon: 24.8714, data: plovdivDistrictsData },
    { name: "Варна", lat: 43.2141, lon: 27.9147, data: varnaDistrictsData },
    { name: "Бургас", lat: 42.5048, lon: 27.4626, data: burgasDistrictsData },
    { name: "Русе", lat: 43.8489, lon: 25.9549, data: ruseDistrictsData },
    { name: "Стара Загора", lat: 42.4297, lon: 25.6236, data: staraZagoraDistrictsData },
    // All top 6 Bulgarian cities now supported!
] as const;

const TOXIC_COLORS = [
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#84cc16", // Lime
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#d946ef", // Fuchsia
];

export function DistrictLayer() {
    const { unlockDistrict, isUnlocked, districts, setDistricts, setLoading, setError, lastFetchLocation } = useDistrictStore();
    const { reading } = useGeolocation(true); // Track location

    // Fetch districts when user location is available and we haven't fetched for this area yet
    useEffect(() => {
        if (!reading) return;

        // Check if we already have districts for this general area
        const cacheKey = getDistrictCacheKey(reading.lat, reading.lng);
        const lastCacheKey = lastFetchLocation
            ? getDistrictCacheKey(lastFetchLocation.lat, lastFetchLocation.lon)
            : null;

        // Skip if we already fetched for this area
        if (districts.length > 0 && cacheKey === lastCacheKey) {
            return;
        }

        // Check if we're in any Bulgarian city with hardcoded data
        const bulgCity = BULGARIAN_CITIES.find(city =>
            Math.abs(reading.lat - city.lat) < 0.2 && Math.abs(reading.lng - city.lon) < 0.2
        );

        // Fetch districts for current location
        const loadDistricts = async () => {
            setLoading(true);
            console.log("Fetching districts for location:", reading.lat, reading.lng);

            // For Bulgarian cities with hardcoded data, use that (more reliable)
            if (bulgCity) {
                console.log(`Using hardcoded ${bulgCity.name} districts`);
                setDistricts(bulgCity.data.elements as any, { lat: reading.lat, lon: reading.lng });
                return;
            }

            // For other cities, try API with fallback
            const data = await fetchDistricts(reading.lat, reading.lng);

            if (data && data.elements.length > 0) {
                setDistricts(data.elements, { lat: reading.lat, lon: reading.lng });
                console.log(`Loaded ${data.elements.length} districts from API`);
            } else {
                setError("No districts found for this location");
                console.warn("No districts found for location");
            }
        };

        loadDistricts();
    }, [reading?.lat, reading?.lng]);

    // Memoize parsing districts from store
    const parsedDistricts = useMemo(() => normalizeDistricts(districts), [districts]);

    const isRunning = useRunStore((s) => s.isRunning);

    useEffect(() => {
        if (!reading || !isRunning || parsedDistricts.length === 0) return;

        // Check if user is in any LOCKED district (only while actively running)
        parsedDistricts.forEach(d => {
            const idStr = d.id.toString();
            if (isUnlocked(idStr)) return;

            // 1. Fast Bound Check
            if (
                reading.lat < d.bounds.minlat ||
                reading.lat > d.bounds.maxlat ||
                reading.lng < d.bounds.minlon ||
                reading.lng > d.bounds.maxlon
            ) {
                return;
            }

            // 2. Precise Polygon Check
            let inside = false;
            for (const poly of d.polygons) {
                if (isPointInPolygon({ lat: reading.lat, lon: reading.lng }, poly)) {
                    inside = true;
                    break;
                }
            }

            if (inside) {
                unlockDistrict(idStr);
                audio.levelUp(); // Play sound on unlock
                console.log(`Unlocked District: ${d.name}`);
            }
        });
    }, [reading, isRunning, parsedDistricts, isUnlocked, unlockDistrict]);

    // Show nothing while loading or if no districts
    if (parsedDistricts.length === 0) {
        return null;
    }

    return (
        <>
            {parsedDistricts.map((d) => {
                const unlocked = isUnlocked(d.id.toString());
                const color = TOXIC_COLORS[d.id % TOXIC_COLORS.length];

                return d.polygons.map((poly, idx) => (
                    <Polygon
                        key={`${d.id}-${idx}`}
                        positions={poly.map(p => [p.lat, p.lon])}
                        pathOptions={{
                            color: unlocked ? "#10b981" : color,
                            fillColor: color,
                            fillOpacity: unlocked ? 0 : 1.0, // Fully opaque if locked (hides map)
                            weight: unlocked ? 2 : 1,
                            dashArray: unlocked ? "5, 10" : undefined,
                            interactive: !unlocked
                        }}
                    >
                        {!unlocked && (
                            <Popup>
                                <div className="text-center">
                                    <div className="font-bold text-slate-900">{d.name}</div>
                                    <div className="text-xs text-red-600 font-bold flex items-center justify-center gap-1">
                                        <Lock size={12} /> RESTRICTED ZONE
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Enter to Decrypt</div>
                                </div>
                            </Popup>
                        )}
                        {unlocked && (
                            <Popup>
                                <div className="text-center">
                                    <div className="font-bold text-slate-900">{d.name}</div>
                                    <div className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1">
                                        <Unlock size={12} /> SECURED
                                    </div>
                                </div>
                            </Popup>
                        )}
                    </Polygon>
                ));
            })}
        </>
    );
}
