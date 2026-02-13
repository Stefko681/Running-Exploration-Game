import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import type { LatLngPoint } from "../types";
import { SpatialGrid } from "../utils/spatial";
import { DomUtil } from "leaflet";

type FogCanvasProps = {
  revealed: LatLngPoint[];
  /** thickness of the cleared path, in px */
  radiusPx?: number;
  /** thickness of the cleared path, in meters (overrides radiusPx) */
  radiusMeters?: number;
  fogOpacity?: number;
};

// Fixed ground size for hexagons (side length in meters)
const HEX_SIDE_METERS = 50;

function createHexPattern(ctx: CanvasRenderingContext2D, opacity: number, sizePx: number) {
  const patternCanvas = document.createElement('canvas');
  const size = sizePx;
  const height = size * Math.sqrt(3);
  const width = size * 2; // Point to point width of flat-topped hex is 2 * size? No, pointy topped?
  // Our drawHex logic below uses flat-topped geometry?
  // x + size * cos(angle)... angle 0 is right.
  // 60 deg is bottom-right.
  // This draws a pointy-topped hex if start angle is 0? No, 0 is right.
  // Let's stick to the drawing logic:

  // Create a tileable pattern
  // For standard hex tiling, we usually need a specific rectangular block.
  // Using 1.5 * width?
  patternCanvas.width = width * 1.5;
  patternCanvas.height = height;

  const pCtx = patternCanvas.getContext('2d');
  if (!pCtx) return null;

  pCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  pCtx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);

  // Draw Hexagons
  pCtx.lineWidth = Math.max(1, size / 15); // Scale line width slightly
  pCtx.strokeStyle = "rgba(34, 211, 238, 0.3)"; // Cyan, slightly more transparent

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

  // Tiling offsets for "Pointy Topped" (angle 0 at 3 o'clock)
  // Actually the code below seems to tile correctly for the 1.5 width logic.
  drawHex(0, 0);
  drawHex(0, height);
  drawHex(width * 1.5, 0);
  drawHex(width * 1.5, height);
  drawHex(width * 0.75, height * 0.5);
  drawHex(width * 0.75, -height * 0.5);
  drawHex(width * 0.75, height * 1.5);
  drawHex(-width * 0.75, height * 0.5);
  drawHex(-width * 0.75, -height * 0.5); // Add corners just in case

  return ctx.createPattern(patternCanvas, 'repeat');
}

function drawFog(
  canvas: HTMLCanvasElement,
  map: ReturnType<typeof useMap>,
  grid: SpatialGrid,
  radiusPx: number,
  fogOpacity: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;

  // 1. Calculate Hex Size
  const center = map.getCenter();
  const latRad = center.lat * Math.PI / 180;
  const metersPerPixel = 156543.03 * Math.cos(latRad) / Math.pow(2, map.getZoom());

  const logicalHexSize = HEX_SIDE_METERS / metersPerPixel;

  // 2. Calculate Offset (Anchor to Layer Origin)
  // We position the canvas at 'topLeft' relative to the Layer (MapPane).
  // 'topLeft' is the Viewport Top-Left in Layer Coordinates.
  // To lock the pattern to the Layer (which moves with the map),
  // we need to counteract the canvas position.
  // Drawing at (0,0) in Canvas = Drawing at 'topLeft' in Layer.
  // We want Pattern(0,0) to align with Layer(0,0).
  // So we translate by -topLeft.
  const topLeft = map.containerPointToLayerPoint([0, 0]);
  const offsetX = -topLeft.x;
  const offsetY = -topLeft.y;

  // 3. Fill fog with Pattern
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w / dpr, h / dpr);

  // Note: pattern is created in logical size
  // ctx is scaled by dpr, so we pass logical size to createHexPattern
  // and it will look correct.
  const pattern = createHexPattern(ctx, fogOpacity, logicalHexSize);

  if (pattern) {
    ctx.save();
    // Anchor pattern to Layer Origin
    ctx.translate(offsetX, offsetY);

    ctx.fillStyle = pattern;
    // Fill the visible viewport (which is shifted by -offset in this transformed space)
    ctx.fillRect(-offsetX, -offsetY, w / dpr, h / dpr);

    ctx.restore();
  } else {
    ctx.fillStyle = `rgba(0,0,0,${fogOpacity})`;
    ctx.fillRect(0, 0, w / dpr, h / dpr);
  }

  // 4. Query Visible Points
  const bounds = map.getBounds();
  const visiblePoints = grid.query(bounds);

  if (visiblePoints.length < 1) return;

  // 5. Clear revealed path (Union of Circles)
  ctx.globalCompositeOperation = "destination-out";

  const drawRadius = radiusPx * 0.6;
  const blurRadius = radiusPx * 0.8;

  ctx.shadowBlur = blurRadius;
  ctx.shadowColor = "rgba(0,0,0,1)";
  ctx.fillStyle = "rgba(0,0,0,1)";

  ctx.beginPath();

  const step = visiblePoints.length > 5000 ? Math.ceil(visiblePoints.length / 5000) : 1;

  for (let i = 0; i < visiblePoints.length; i += step) {
    const p = visiblePoints[i];
    const pt = map.latLngToContainerPoint([p.lat, p.lng]);
    const lx = pt.x; // logical pixels
    const ly = pt.y;

    // Bounds check with buffer
    if (lx < -blurRadius || ly < -blurRadius || lx > (w / dpr) + blurRadius || ly > (h / dpr) + blurRadius) {
      continue;
    }

    ctx.moveTo(lx, ly);
    ctx.arc(lx, ly, drawRadius, 0, Math.PI * 2);
  }

  ctx.fill();

  // Reset shadow
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

export function FogCanvas({ revealed, radiusPx = 18, radiusMeters, fogOpacity = 0.7 }: FogCanvasProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const grid = useMemo(() => {
    const g = new SpatialGrid();
    g.load(revealed);
    return g;
  }, [revealed]);

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

  useEffect(() => {
    let pane = map.getPane("fog-pane");
    if (!pane) {
      pane = map.createPane("fog-pane");
      pane.style.zIndex = "390";
      pane.style.pointerEvents = "none";
    }

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvasRef.current = canvas;
    pane.appendChild(canvas);

    return () => {
      if (pane && canvas.parentNode === pane) {
        pane.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // We rely on Leaflet to position the pane?
    // Actually typically dealing with Canvas overlay requires us to position the canvas.
    // L.Canvas layer does this helper.
    // Here we are doing raw canvas.
    // We need to update size/pos on move.

    // NOTE: When using 'zoomend', the scale changes, so we must redraw.
    // During zoom, it might look weird unless wrapped in a custom layer.
    // For now, simple redraw is acceptable for MVP.

    const redraw = () => {
      if (!canvas) return;
      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      DomUtil.setPosition(canvas, topLeft);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = size.x * dpr;
      canvas.height = size.y * dpr;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const currentRadius = getRadiusInPx();
      drawFog(canvas, map, grid, currentRadius, fogOpacity);
    };

    redraw();

    map.on("resize move zoomend viewreset", redraw);
    return () => {
      map.off("resize move zoomend viewreset", redraw);
    };
  }, [map, grid, fogOpacity, radiusPx, radiusMeters]);

  return null;
}
