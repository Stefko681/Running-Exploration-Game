import { stitchWaysToPolygons } from "../utils/districtGeometry";

export type OSMDistrict = {
    id: number;
    name: string;
    bounds: { minlat: number; minlon: number; maxlat: number; maxlon: number };
    polygons: { lat: number; lon: number }[][];
};

const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

// Cache results to avoid spamming API
const CACHE_KEY_PREFIX = "district_cache_";

export class OverpassService {
    /**
     * Fetches district boundaries (admin_level=9 or similar) around a given location.
     * Uses a caching strategy based on rounded coordinates to avoid re-fetching small movements.
     */
    static async fetchDistricts(lat: number, lng: number): Promise<OSMDistrict[]> {
        // 1. Check Cache
        // Round to ~1km precision (0.01 deg) for cache key to group nearby requests
        const cacheLat = Math.round(lat * 100) / 100;
        const cacheLng = Math.round(lng * 100) / 100;
        const cacheKey = `${CACHE_KEY_PREFIX}${cacheLat}_${cacheLng}`;

        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                // Basic expiry (e.g., 24 hours)? For now, just persist.
                // Or maybe check timestamp if we add it. 
                // Let's just return cached for now.
                console.log("Using cached districts");
                return parsed;
            } catch (e) {
                console.warn("Invalid cache", e);
                localStorage.removeItem(cacheKey);
            }
        }

        // 2. Build Query
        // We look for relations that are administrative boundaries level 9 (suburbs)
        // OR place=suburb
        // We query around the point with a radius (e.g. 5km-10km)
        // Adjust radius logic: start with 5km, maybe bigger if density is low?
        const radius = 6000; // 6km radius search

        const query = `
            [out:json][timeout:25];
            (
              relation["admin_level"="9"]["boundary"="administrative"](around:${radius},${lat},${lng});
              relation["place"="suburb"](around:${radius},${lat},${lng});
              relation["place"="quarter"](around:${radius},${lat},${lng});
              relation["place"="neighbourhood"](around:${radius},${lat},${lng});
            );
            out body;
            >;
            out skel qt;
        `;

        // 3. Fetch
        try {
            const response = await fetch(OVERPASS_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "data=" + encodeURIComponent(query),
            });

            if (!response.ok) {
                throw new Error(`Overpass API error: ${response.statusText}`);
            }

            const data = await response.json();
            const districts = this.normalizeDistricts(data);

            // 4. Cache
            if (districts.length > 0) {
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(districts));
                } catch (e) {
                    // Quota exceeded likely
                    console.warn("Cache write failed", e);
                }
            }

            return districts;

        } catch (err) {
            console.error("Failed to fetch districts", err);
            return [];
        }
    }

    private static normalizeDistricts(data: any): OSMDistrict[] {
        if (!data || !data.elements) return [];

        const relations = data.elements.filter((e: any) => e.type === "relation");

        const waysMap = new Map();
        const nodesMap = new Map();

        // Index nodes and ways for fast lookup
        data.elements.forEach((e: any) => {
            if (e.type === "way") waysMap.set(e.id, e);
            if (e.type === "node") nodesMap.set(e.id, e);
        });

        const districts: OSMDistrict[] = [];

        for (const r of relations) {
            try {
                // Extract Name
                const name = r.tags.name || r.tags["name:en"] || "Unknown District";

                // Filter out very large or very small areas if needed? 
                // For now keep all found.

                // Reconstruct Geometry
                // Relations have members. Members trigger "outer" ways.
                const outerMembers = r.members.filter((m: any) => m.role === "outer" && m.type === "way");
                const outerWaysPoints: { lat: number, lon: number }[][] = [];

                for (const m of outerMembers) {
                    const way = waysMap.get(m.ref);
                    if (!way || !way.nodes) continue;

                    const points = way.nodes.map((nId: number) => {
                        const node = nodesMap.get(nId);
                        if (!node) return null;
                        return { lat: node.lat, lon: node.lon };
                    }).filter((p: any) => p !== null);

                    if (points.length > 0) {
                        outerWaysPoints.push(points);
                    }
                }

                // Stitch
                const polygons = stitchWaysToPolygons(outerWaysPoints);

                // Calculate bounds if missing (Overpass "out body" for relations usually includes bounds, but "out skel" for members doesn't)
                // Overpass relation output includes bounds!
                // If not, we can calculate from polygons.
                let bounds = r.bounds;
                if (!bounds && polygons.length > 0) {
                    let minlat = 90, minlon = 180, maxlat = -90, maxlon = -180;
                    polygons.flat().forEach(p => {
                        if (p.lat < minlat) minlat = p.lat;
                        if (p.lon < minlon) minlon = p.lon;
                        if (p.lat > maxlat) maxlat = p.lat;
                        if (p.lon > maxlon) maxlon = p.lon;
                    });
                    bounds = { minlat, minlon, maxlat, maxlon };
                }

                if (polygons.length > 0 && bounds) {
                    districts.push({
                        id: r.id,
                        name,
                        bounds,
                        polygons
                    });
                }
            } catch (e) {
                console.warn(`Failed to parse relation ${r.id}`, e);
            }
        }

        return districts;
    }
}
