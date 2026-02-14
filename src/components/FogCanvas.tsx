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
// const HEX_SIDE_METERS = 50; // No longer used

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

  // 1. Fill fog with Solid Color
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w / dpr, h / dpr);

  ctx.fillStyle = `rgba(0,0,0,${fogOpacity})`;
  ctx.fillRect(0, 0, w / dpr, h / dpr);

  // 2. Query Visible Points
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

  // Track zoom state to pause redraws
  const isZooming = useRef(false);

  // Redraw function ref to be accessible in effects
  const redrawRef = useRef<() => void>(() => { });

  useEffect(() => {
    const onZoomStart = () => {
      isZooming.current = true;
    };

    const onZoomEnd = () => {
      isZooming.current = false;
      redrawRef.current(); // Snap to sharp rendering
    };

    map.on("zoomstart", onZoomStart);
    map.on("zoomend", onZoomEnd);

    return () => {
      map.off("zoomstart", onZoomStart);
      map.off("zoomend", onZoomEnd);
    };
  }, [map]);


  useEffect(() => {
    let pane = map.getPane("fog-pane");
    if (!pane) {
      pane = map.createPane("fog-pane");
      pane.style.zIndex = "390";
      pane.style.pointerEvents = "none";
      pane.classList.add("leaflet-zoom-animated");
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

    const redraw = () => {
      if (!canvas || isZooming.current) return;
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
      if (currentRadius <= 0) return; // Guard against negative/zero radius

      drawFog(canvas, map, grid, currentRadius, fogOpacity);
    };

    // Update the ref so the zoom handler can call it
    redrawRef.current = redraw;

    redraw();

    map.on("resize move viewreset", redraw);
    return () => {
      map.off("resize move viewreset", redraw);
    };
  }, [map, grid, fogOpacity, radiusPx, radiusMeters]);

  return null;
}
