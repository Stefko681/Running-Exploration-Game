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

  // Fill fog
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = `rgba(0,0,0,${fogOpacity})`;
  ctx.fillRect(0, 0, w, h);

  if (revealed.length < 1) return;

  // Clear revealed path
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = radiusPx * 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,1)";

  ctx.beginPath();

  // We need to handle the first point
  if (revealed.length > 0) {
    const first = revealed[0];
    const pt = map.latLngToContainerPoint([first.lat, first.lng]);
    ctx.moveTo(pt.x, pt.y);
    // Draw a dot for the single point case
    ctx.lineTo(pt.x, pt.y);
  }

  for (let i = 1; i < revealed.length; i++) {
    const p1 = revealed[i - 1];
    const p2 = revealed[i];

    const dist = haversineMeters(p1, p2);
    const pt = map.latLngToContainerPoint([p2.lat, p2.lng]);

    // If points are far apart (e.g. > 50m), start a new path segment
    // This handles both GPS jumps and separate runs being drawn together
    if (dist > 50) {
      ctx.moveTo(pt.x, pt.y);
      // Force a dot for the start of the new segment so isolated points are visible
      ctx.lineTo(pt.x, pt.y);
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  }
  ctx.stroke();
}

export function FogCanvas({ revealed, radiusPx = 18, radiusMeters, fogOpacity = 0.7 }: FogCanvasProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getRadiusInPx = () => {
    if (radiusMeters) {
      // Calculate pixels for radiusMeters at current zoom
      const center = map.getCenter();
      const centerPoint = map.latLngToContainerPoint(center);
      // Approximation: 1 degree latitude is constant ~111km.
      // 1 degree longitude depends on latitude. 
      // Let's use a simple projection of a point [lat, lng] and [lat, lng + Delta] where Delta corresponds to meters.
      // But map.project/unproject or latLngToContainerPoint handles the projection.
      // Let's use a point due East.
      // At lat L, 1 degree lon = 111320 * cos(L) meters.
      // So X meters = X / (111320 * cos(L)) degrees.

      const metersPerDegLon = 111320 * Math.cos(center.lat * Math.PI / 180);
      const deltaDeg = radiusMeters / metersPerDegLon;

      const eastPoint = map.latLngToContainerPoint({ lat: center.lat, lng: center.lng + deltaDeg });
      const r = Math.abs(eastPoint.x - centerPoint.x);
      return Math.max(1, r); // Ensures at least 1px
    }
    return radiusPx;
  };

  const redrawKey = useMemo(() => {
    // Changes when revealed points change (cheap-ish)
    const last = revealed[revealed.length - 1];
    return `${revealed.length}:${last?.lat ?? 0}:${last?.lng ?? 0}:${last?.t ?? 0}`;
  }, [revealed]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "400"; // above tiles, below controls
    canvasRef.current = canvas;

    // Attach the fog canvas directly to the map container so it always
    // matches the visible viewport, regardless of how the internal panes move.
    const container = map.getContainer();
    container.appendChild(canvas);

    const updateSize = () => {
      const container = map.getContainer();
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const redraw = () => {
      if (!canvasRef.current) return;
      updateSize();
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
      container.removeChild(canvas);
      canvasRef.current = null;
    };
  }, [map, fogOpacity, radiusPx, radiusMeters, revealed.length]); // Dependencies

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentRadius = getRadiusInPx();
    drawFog(canvas, map, revealed, currentRadius, fogOpacity);
  }, [map, redrawKey, radiusPx, radiusMeters, fogOpacity, revealed]);

  return null;
}

