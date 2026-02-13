import { Delaunay } from 'd3-delaunay';

export interface VoronoiPoint {
    lat: number;
    lon: number;
    id: number;
}

export interface VoronoiPolygon {
    id: number;
    polygon: { lat: number; lon: number }[];
}

type Pt = { lat: number; lon: number };

/**
 * Compute Voronoi diagram from array of points.
 * Clips ALL cells to an expanded convex hull so the overall shape
 * follows the natural outline of the points instead of a rectangle.
 */
export function computeVoronoi(points: VoronoiPoint[]): VoronoiPolygon[] {
    if (points.length < 2) return [];

    // Build Delaunay / Voronoi with a generous rectangle first
    const lats = points.map(p => p.lat);
    const lons = points.map(p => p.lon);
    const pad = 0.1;
    const bbox: [number, number, number, number] = [
        Math.min(...lons) - pad,
        Math.min(...lats) - pad,
        Math.max(...lons) + pad,
        Math.max(...lats) + pad,
    ];

    const delaunay = Delaunay.from(points, p => p.lon, p => p.lat);
    const voronoi = delaunay.voronoi(bbox);

    // Build convex hull as clipping polygon
    const hullIdx: number[] = Array.from(delaunay.hull);
    const hullPts: Pt[] = hullIdx.map(i => points[i]);

    // Expand hull outward by ~1.3 km so edge districts still have area
    let clipPoly = expandHull(hullPts, 0.012);

    // Ensure clip polygon is counter-clockwise (required by our S-H implementation)
    if (polygonArea(clipPoly) < 0) {
        clipPoly = clipPoly.slice().reverse();
    }

    // Extract & clip cells
    const result: VoronoiPolygon[] = [];

    for (let i = 0; i < points.length; i++) {
        const raw = voronoi.cellPolygon(i);
        if (!raw) continue;

        const cell: Pt[] = raw.map(([lon, lat]: [number, number]) => ({ lat, lon }));

        // Clip against the expanded convex hull
        const clipped = sutherlandHodgman(cell, clipPoly);

        // Use clipped if valid, otherwise fall back to original cell
        const final = clipped.length >= 3 ? clipped : cell;

        result.push({ id: points[i].id, polygon: final });
    }

    return result;
}

// ──────────────────────────────────────────────
//  Geometry helpers
// ──────────────────────────────────────────────

/** Signed area of a polygon – positive = CCW, negative = CW */
function polygonArea(poly: Pt[]): number {
    let area = 0;
    for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        area += poly[i].lon * poly[j].lat;
        area -= poly[j].lon * poly[i].lat;
    }
    return area / 2;
}

/** Expand a convex polygon outward from its centroid */
function expandHull(hull: Pt[], amount: number): Pt[] {
    let cx = 0, cy = 0;
    for (const p of hull) { cx += p.lon; cy += p.lat; }
    cx /= hull.length;
    cy /= hull.length;

    return hull.map(p => {
        const dx = p.lon - cx;
        const dy = p.lat - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return {
            lat: p.lat + (dy / len) * amount,
            lon: p.lon + (dx / len) * amount,
        };
    });
}

/** Sutherland-Hodgman polygon clipping (clip polygon must be CCW) */
function sutherlandHodgman(subject: Pt[], clip: Pt[]): Pt[] {
    let output = [...subject];

    for (let i = 0; i < clip.length; i++) {
        if (output.length === 0) return [];
        const a = clip[i];
        const b = clip[(i + 1) % clip.length];
        const input = output;
        output = [];

        for (let j = 0; j < input.length; j++) {
            const curr = input[j];
            const prev = input[(j + input.length - 1) % input.length];

            const currIn = cross(a, b, curr) >= 0;
            const prevIn = cross(a, b, prev) >= 0;

            if (currIn) {
                if (!prevIn) {
                    const ix = lineIntersect(prev, curr, a, b);
                    if (ix) output.push(ix);
                }
                output.push(curr);
            } else if (prevIn) {
                const ix = lineIntersect(prev, curr, a, b);
                if (ix) output.push(ix);
            }
        }
    }

    return output;
}

/** 2D cross product – positive when p is to the LEFT of a→b */
function cross(a: Pt, b: Pt, p: Pt): number {
    return (b.lon - a.lon) * (p.lat - a.lat)
        - (b.lat - a.lat) * (p.lon - a.lon);
}

/** Line–line intersection (parametric) */
function lineIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt | null {
    const d1x = p2.lon - p1.lon, d1y = p2.lat - p1.lat;
    const d2x = p4.lon - p3.lon, d2y = p4.lat - p3.lat;
    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-12) return null;
    const t = ((p3.lon - p1.lon) * d2y - (p3.lat - p1.lat) * d2x) / denom;
    return { lon: p1.lon + t * d1x, lat: p1.lat + t * d1y };
}
