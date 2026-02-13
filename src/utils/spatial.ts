import type { LatLngBounds } from "leaflet";
import type { LatLngPoint } from "../types";

export class SpatialGrid {
    private cellSize: number;
    private cells: Map<string, LatLngPoint[]>;

    /**
     * @param cellSize Size of grid cells in degrees. Default 0.005 (~550m)
     */
    constructor(cellSize = 0.005) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    private getKey(lat: number, lng: number): string {
        const x = Math.floor(lat / this.cellSize);
        const y = Math.floor(lng / this.cellSize);
        return `${x}:${y}`;
    }

    clear() {
        this.cells.clear();
    }

    add(point: LatLngPoint) {
        const key = this.getKey(point.lat, point.lng);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key)!.push(point);
    }

    load(points: LatLngPoint[]) {
        for (const p of points) this.add(p);
    }

    query(bounds: LatLngBounds): LatLngPoint[] {
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();

        const result: LatLngPoint[] = [];

        const minX = Math.floor(south / this.cellSize);
        const maxX = Math.floor(north / this.cellSize);
        const minY = Math.floor(west / this.cellSize);
        const maxY = Math.floor(east / this.cellSize);

        // Add buffer of 1 cell to ensure continuity at edges and prevent artifacts
        for (let x = minX - 1; x <= maxX + 1; x++) {
            for (let y = minY - 1; y <= maxY + 1; y++) {
                const key = `${x}:${y}`;
                const cellPoints = this.cells.get(key);
                if (cellPoints) {
                    // Push all points from cell
                    for (let i = 0; i < cellPoints.length; i++) {
                        result.push(cellPoints[i]);
                    }
                }
            }
        }
        return result;
    }
}
