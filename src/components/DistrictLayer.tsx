import { useEffect } from "react";
import { Polygon, Popup } from "react-leaflet";
import { useDistrictStore } from "../state/useDistrictStore";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { useGeolocation } from "../hooks/useGeolocation";
import { audio } from "../utils/audio";
// import districtsData from "../data/sofia_districts.json"; // REMOVED

type Point = { lat: number; lon: number };

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

// Colors for "Toxic Fog"
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
    const { unlockDistrict, isUnlocked, districts, fetchDistrictsIfNeeded, isLoading } = useDistrictStore();
    const { reading } = useGeolocation(true); // Track location

    // Automated Fetching
    useEffect(() => {
        if (!reading) return;
        // Trigger fetch if needed
        fetchDistrictsIfNeeded(reading.lat, reading.lng);
    }, [reading, fetchDistrictsIfNeeded]);

    useEffect(() => {
        if (!reading) return;

        // Check if user is in any LOCKED district
        districts.forEach(d => {
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
    }, [reading, districts, isUnlocked, unlockDistrict]);

    return (
        <>
            {isLoading && districts.length === 0 && (
                // Simple loading indicator on map center? Or handled by UI.
                // Since this is a map layer, maybe a popup or just nothing.
                // Let's leave it invisible on map, assuming UI has a spinner if needed.
                null
            )}

            {districts.map((d) => {
                const unlocked = isUnlocked(d.id.toString());
                const color = TOXIC_COLORS[d.id % TOXIC_COLORS.length];

                return (
                    <g key={d.id}>
                        {d.polygons.map((poly, idx) => (
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
                        ))}
                    </g>
                );
            })}
        </>
    );
}
