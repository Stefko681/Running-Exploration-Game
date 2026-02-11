import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import type { LatLngPoint } from "../types";

type FogCanvasProps = {
  revealed: LatLngPoint[];
  /** thickness of the cleared path, in px */
  radiusPx?: number;
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

  if (revealed.length < 2) return;

  // Clear revealed path
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = radiusPx * 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,1)";

  ctx.beginPath();
  for (let i = 0; i < revealed.length; i++) {
    const p = revealed[i]!;
    const pt = map.latLngToContainerPoint([p.lat, p.lng]);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
}

export function FogCanvas({ revealed, radiusPx = 18, fogOpacity = 0.7 }: FogCanvasProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      drawFog(canvasRef.current, map, revealed, radiusPx, fogOpacity);
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
  }, [map, fogOpacity, radiusPx, revealed.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawFog(canvas, map, revealed, radiusPx, fogOpacity);
  }, [map, redrawKey, radiusPx, fogOpacity, revealed]);

  return null;
}

