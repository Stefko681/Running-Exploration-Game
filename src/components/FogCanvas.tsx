import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import { haversineMeters } from "../utils/geo";
import type { LatLngPoint } from "../types";

type FogCanvasProps = {
  revealed: LatLngPoint[];
  /** thickness of the cleared path, in px */
  radiusPx?: number;
  /** thickness of the cleared path, in meters (overrides radiusPx) */
  radiusMeters?: number;
  fogOpacity?: number;
};

const HEX_SIZE = 15;


function createHexPattern(ctx: CanvasRenderingContext2D, opacity: number) {
  // We want to recreate pattern if cached one doesn't match current params? 
  // For simplicity, let's just recreate it if needed or rely on the caller to clear cache if needed.
  // Actually, since we use a global variable `hexPattern`, we should invalidate it or key it.
  // But given the scope, let's just recreate it if it's null, but we need to handle updates.
  // A better approach in this component: create it every time or memoize properly inside the component.
  // Since `drawFog` is called frequently on move, we want to cache.
  // Let's attach the opacity to the cached object or just recreate if different?
  // For now, let's just rebuild it simply.

  const patternCanvas = document.createElement('canvas');
  const size = HEX_SIZE;
  const height = size * Math.sqrt(3);
  const width = size * 2;

  // Create a tileable pattern
  // We need a slightly larger canvas to ensure seamless tiling of hexes
  patternCanvas.width = width * 1.5; // 3 * size / 2 * 2
  patternCanvas.height = height;

  const pCtx = patternCanvas.getContext('2d');
  if (!pCtx) return null;

  // Background - Use the passed opacity!
  // The user wants "empty zones" to look like "unlocked/ready for exploration".
  // Unlocked usually implies some visibility. 
  // But strictly, "fog" usually covers things. 
  // The user said: "make it look like they are already unlocked districts... with hexagons".
  // Unlocked districts in DistrictLayer have `fillOpacity: 0`.
  // So the "fog" IS the visual for the empty zones.
  // We'll make the background semi-transparent black and lines distinct.

  pCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  pCtx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);

  // Draw Hexagons
  pCtx.lineWidth = 1.5; // Slightly thicker
  pCtx.strokeStyle = "rgba(34, 211, 238, 0.5)"; // Cyan, slightly higher opacity for visibility

  const drawHex = (x: number, y: number) => {
    pCtx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + size * Math.cos(angle);
      const hy = y + size * Math.sin(angle);
      if (i === 0) pCtx.moveTo(hx, hy);
      else pCtx.lineTo(hx, hy);
    }
    pCtx.closePath();
    pCtx.stroke();
  };

  // Draw a grid that tiles
  // 0,0
  drawHex(0, 0);
  drawHex(0, height);
  drawHex(width * 1.5, 0);
  drawHex(width * 1.5, height);

  // Offset by width * 0.75, height * 0.5
  drawHex(width * 0.75, height * 0.5);
  drawHex(width * 0.75, -height * 0.5);
  drawHex(width * 0.75, height * 1.5);

  // Additional tiling coverage
  drawHex(-width * 0.75, height * 0.5);

  return ctx.createPattern(patternCanvas, 'repeat');
}

function drawFog(
  canvas: HTMLCanvasElement,
  map: ReturnType<typeof useMap>,
  revealed: LatLngPoint[],
  radiusPx: number,
  fogOpacity: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Fill fog with Pattern
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  const pattern = createHexPattern(ctx, fogOpacity);
  if (pattern) {
    ctx.fillStyle = pattern;
  } else {
    ctx.fillStyle = `rgba(0,0,0,${fogOpacity})`;
  }

  // Need to scale pattern if transform is applied, but simpler to just fill
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for pattern fill to be screen-space
  ctx.fillRect(0, 0, w, h);
  ctx.restore();


  if (revealed.length < 1) return;

  // Clear revealed path
  // Use a soft brush (radial gradient) for "soft reveal"
  ctx.globalCompositeOperation = "destination-out";



  // Since gradients don't stroke well, we iterate points. 
  // For performance on long paths, we might need a hybrid approach:
  // Stroke with solid line for core, then dot gradients for edges?
  // Let's try iterating points first. If gap > radius/2, interpolate.

  // To optimize: simple stroke for the "hard" core, then "soft" dots?
  // Actually, standard stroke is faster. The user requested soft edges.
  // We can use shadowBlur for soft edges on the stroke!

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. Core clearing (harder center)
  ctx.lineWidth = radiusPx * 1.2;
  ctx.strokeStyle = "rgba(0,0,0,1)";

  // 2. Soft Edge via Shadow
  ctx.shadowBlur = radiusPx * 0.8;
  ctx.shadowColor = "rgba(0,0,0,1)";

  ctx.beginPath();

  if (revealed.length > 0) {
    const first = revealed[0];
    const pt = map.latLngToContainerPoint([first.lat, first.lng]);
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x, pt.y);
  }

  for (let i = 1; i < revealed.length; i++) {
    const p1 = revealed[i - 1];
    const p2 = revealed[i];

    const dist = haversineMeters(p1, p2);
    const pt = map.latLngToContainerPoint([p2.lat, p2.lng]);

    if (dist > 50) {
      ctx.moveTo(pt.x, pt.y);
      ctx.stroke(); // Stroke previous segment
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  }
  ctx.stroke();

  // Reset shadow for next frame!
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

// ... existing imports ...
import { DomUtil } from "leaflet";
// ... existing imports ...

// ... (keep createHexPattern and drawFog as is, assuming drawFog uses latLngToContainerPoint) ...

export function FogCanvas({ revealed, radiusPx = 18, radiusMeters, fogOpacity = 0.7 }: FogCanvasProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getRadiusInPx = () => {
    if (radiusMeters) {
      const center = map.getCenter();
      const centerPoint = map.latLngToContainerPoint(center);
      const metersPerDegLon = 111320 * Math.cos(center.lat * Math.PI / 180);
      const deltaDeg = radiusMeters / metersPerDegLon;
      const eastPoint = map.latLngToContainerPoint({ lat: center.lat, lng: center.lng + deltaDeg });
      const r = Math.abs(eastPoint.x - centerPoint.x);
      return Math.max(1, r);
    }
    return radiusPx;
  };

  const redrawKey = useMemo(() => {
    const last = revealed[revealed.length - 1];
    return `${revealed.length}:${last?.lat ?? 0}:${last?.lng ?? 0}:${last?.t ?? 0}`;
  }, [revealed]);

  useEffect(() => {
    // 1. Create or get the custom pane
    let pane = map.getPane("fog-pane");
    if (!pane) {
      pane = map.createPane("fog-pane");
      pane.style.zIndex = "390"; // Between tiles (200) and overlays (400)
      pane.style.pointerEvents = "none"; // Let clicks pass through to map
    }

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    // No fixed left/top/zIndex here, handled by Leaflet pane + setPosition
    canvas.style.pointerEvents = "none";
    canvasRef.current = canvas;

    // 2. Add canvas to the pane
    pane.appendChild(canvas);

    const updateSizeAndPosition = () => {
      // Position the canvas at the top-left of the viewport (in layer coords)
      // This ensures that (0,0) on the canvas corresponds to (0,0) on the screen
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      DomUtil.setPosition(canvas, topLeft);

      const size = map.getSize();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(size.x * dpr);
      canvas.height = Math.floor(size.y * dpr);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const redraw = () => {
      if (!canvasRef.current) return;
      updateSizeAndPosition();
      const currentRadius = getRadiusInPx();
      drawFog(canvasRef.current, map, revealed, currentRadius, fogOpacity);
    };

    redraw();

    map.on("resize", redraw);
    map.on("move", redraw);
    map.on("zoomend", redraw);
    map.on("viewreset", redraw);

    return () => {
      map.off("resize", redraw);
      map.off("move", redraw);
      map.off("zoomend", redraw);
      map.off("viewreset", redraw);
      if (pane && canvas.parentNode === pane) {
        pane.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, [map, fogOpacity, radiusPx, radiusMeters, revealed.length]);

  // Secondary effect for prop updates only
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // We don't need to update position here if map didn't move, just redraw content
    // But drawFog needs correct size/context? It uses existing canvas.
    const currentRadius = getRadiusInPx();
    drawFog(canvas, map, revealed, currentRadius, fogOpacity);
  }, [map, redrawKey, radiusPx, radiusMeters, fogOpacity, revealed]);

  return null;
}

