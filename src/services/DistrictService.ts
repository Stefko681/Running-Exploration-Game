// Service for fetching district/neighborhood boundaries from OpenStreetMap
// Uses Overpass API to dynamically load data based on user location

const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";
const REQUEST_TIMEOUT = 30000; // 30 seconds

export type OSMDistrict = {
    type: "node" | "way" | "relation";
    id: number;
    lat?: number; // For nodes
    lon?: number; // For nodes
    bounds?: {
        minlat: number;
        minlon: number;
        maxlat: number;
        maxlon: number;
    };
    nodes?: number[]; // For ways
    geometry?: { lat: number; lon: number }[]; // For ways
    members?: Array<{ // For relations
        type: string;
        ref: number;
        role: string;
        lat?: number;
        lon?: number;
        geometry?: { lat: number; lon: number }[];
    }>;
    tags: {
        name?: string;
        "name:en"?: string;
        admin_level?: string;
        boundary?: string;
        place?: string;
        [key: string]: any;
    };
};

export type OSMResponse = {
    version: number;
    generator: string;
    elements: OSMDistrict[];
};

/**
 * Fetches district boundaries for the area around the given coordinates.
 * Strategy:
 * 1. Find the city/municipality containing the point (admin_level=8)
 * 2. Get all sub-districts within that city (admin_level=9 or 10)
 */
export async function fetchDistricts(
    lat: number,
    lon: number
): Promise<OSMResponse | null> {
    try {
        // Create a bounding box around the point (~20km radius)
        // This is approximately 0.18 degrees at mid-latitudes
        const offset = 0.18;
        const south = lat - offset;
        const west = lon - offset;
        const north = lat + offset;
        const east = lon + offset;

        // Comprehensive query that searches for districts in multiple ways:
        // 1. Administrative boundaries (admin_level 9/10)
        // 2. Places marked as suburbs/neighbourhoods  
        // Note: We skip landuse=residential as it causes timeouts
        const query = `
      [out:json][timeout:15];
      (
        // Method 1: Administrative boundaries (works in Sofia, Berlin, etc.)
        rel(${south},${west},${north},${east})["boundary"="administrative"]["admin_level"~"^(9|10)$"];
        
        // Method 2: Places tagged as suburbs/neighbourhoods (works in UK, some other countries)
        way(${south},${west},${north},${east})["place"~"^(suburb|neighbourhood)$"]["name"];
        rel(${south},${west},${north},${east})["place"~"^(suburb|neighbourhood)$"]["name"];
      );
      out geom;
    `.trim();

        const response = await fetch(OVERPASS_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const data: OSMResponse = await response.json();

        // Filter and normalize results
        const validDistricts = data.elements.filter((element) => {
            // Must have a name
            const hasName = element.tags?.name || element.tags?.["name:en"];
            if (!hasName) return false;

            // For relations, must have geometry
            if (element.type === "relation") {
                const hasGeometry = element.members?.some((m) => m.geometry && m.geometry.length > 0);
                return hasGeometry;
            }

            // For ways, must have geometry (nodes)
            if (element.type === "way") {
                return element.members && element.members.length > 0;
            }

            // Nodes are ok (we can use them as points, though they won't show polygons)
            return true;
        });

        if (validDistricts.length === 0) {
            console.warn("No valid districts found for location", { lat, lon });
            return null;
        }

        console.log(`Found ${validDistricts.length} districts in the area`);

        return {
            ...data,
            elements: validDistricts,
        };
    } catch (error) {
        console.error("Failed to fetch districts:", error);
        return null;
    }
}

/**
 * Gets a cached key for district data based on approximate location.
 * This allows us to avoid re-fetching when the user is in the same general area.
 */
export function getDistrictCacheKey(lat: number, lon: number): string {
    // Round to 2 decimal places (~1km precision)
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;
    return `districts_${roundedLat}_${roundedLon}`;
}
