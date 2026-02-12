type Point = { lat: number; lon: number };

/**
 * Stitches a collection of ways (each an array of points) into closed polygon loops.
 * This is a simplified approach that assumes ways are connected end-to-end.
 * It handles direction reversal if needed.
 */
export function stitchWaysToPolygons(ways: Point[][]): Point[][] {
    if (ways.length === 0) return [];

    // Deep clone to avoid mutating source
    const pool = ways.map(w => [...w]);
    const loops: Point[][] = [];

    while (pool.length > 0) {
        // Start a new loop with the first available way
        const currentLoop = [...pool.shift()!];

        let loopClosed = false;
        while (!loopClosed && pool.length > 0) {
            const head = currentLoop[0];
            const tail = currentLoop[currentLoop.length - 1];

            // Find a way that connects to head or tail
            // Tolerance for float comparison
            const EPSILON = 0.00001;
            const isSame = (p1: Point, p2: Point) =>
                Math.abs(p1.lat - p2.lat) < EPSILON && Math.abs(p1.lon - p2.lon) < EPSILON;

            let foundIndex = -1;
            let reverseFound = false;
            let attachToTail = true; // true if attaching to tail, false if to head

            for (let i = 0; i < pool.length; i++) {
                const way = pool[i];
                const wHead = way[0];
                const wTail = way[way.length - 1];

                // Case 1: Connects to Tail
                if (isSame(tail, wHead)) {
                    foundIndex = i;
                    attachToTail = true;
                    reverseFound = false;
                    break;
                }
                // Case 2: Connects to Tail (reversed)
                if (isSame(tail, wTail)) {
                    foundIndex = i;
                    attachToTail = true;
                    reverseFound = true;
                    break;
                }
                // Case 3: Connects to Head
                if (isSame(head, wTail)) {
                    foundIndex = i;
                    attachToTail = false;
                    reverseFound = false;
                    break;
                }
                // Case 4: Connects to Head (reversed)
                if (isSame(head, wHead)) {
                    foundIndex = i;
                    attachToTail = false;
                    reverseFound = true;
                    break;
                }
            }

            if (foundIndex !== -1) {
                const foundWay = pool.splice(foundIndex, 1)[0];
                const segment = reverseFound ? foundWay.reverse() : foundWay;

                if (attachToTail) {
                    // Remove duplicate join point
                    currentLoop.push(...segment.slice(1));
                } else {
                    // Attach to head
                    // segment ends at head. So [segment] + [currentLoop]
                    // But remove segment's last point (which is same as currentLoop[0])
                    currentLoop.unshift(...segment.slice(0, segment.length - 1));
                }
            } else {
                // No more connections found for this loop.
                // Even if not strictly closed, we treat it as a polygon.
                loopClosed = true;
            }

            // Check strictly if it closed itself?
            // Leaflet polygon will auto-close visually.
            // But for isPointInPolygon we might need it closed.
            if (currentLoop.length > 2 && isSame(currentLoop[0], currentLoop[currentLoop.length - 1])) {
                loopClosed = true;
            }
        }

        // Only add if it has enough points to be a polygon
        if (currentLoop.length >= 3) {
            loops.push(currentLoop);
        }
    }

    return loops;
}
