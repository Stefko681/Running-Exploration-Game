import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap } from "leaflet";
import { LocateFixed, RotateCcw, Square, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import { BottomSheet } from "../components/BottomSheet";
import { FogCanvas } from "../components/FogCanvas";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { RunAreaSelector } from "../components/RunAreaSelector";
import { ThemeSelector } from "../components/ThemeSelector";
import { StatCard } from "../components/StatCard";
import { FOG_BRUSH_RADIUS_PX, FOG_OPACITY } from "../config";
import { useGeolocation } from "../hooks/useGeolocation";
import { useRunStore } from "../state/useRunStore";
import { useSettingsStore } from "../state/useSettingsStore";
import type { LatLngPoint } from "../types";
import { cellKey, formatKm } from "../utils/geo";

const SOFIA: [number, number] = [42.6977, 23.3219];

function RecenterOnUser({ point }: { point: LatLngPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    // Keep it gentle; don't fight the user's manual panning
    map.panTo([point.lat, point.lng], { animate: true });
  }, [map, point?.lat, point?.lng]);
  return null;
}

export function MapScreen() {
  const {
    isRunning,
    start,
    stop,
    resetAll,
    currentRun,
    revealed,
    totalRunMeters,
    acceptPoint
  } = useRunStore();

  const [follow, setFollow] = useState(true);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const runZoom = useSettingsStore((s) => s.runZoom);
  // Always track location while on the Map screen so we can center on user
  const { status, reading } = useGeolocation(true, { enableHighAccuracy: true });

  // Update map zoom when user changes the setting
  useEffect(() => {
    if (map) {
      map.setZoom(runZoom);
      // If we have a user location, center on it when changing zoom presets
      // This feels more natural ("Show me my run area")
      if (reading) {
        map.setView([reading.lat, reading.lng], runZoom);
        setFollow(true); // Re-enable follow mode if user was looking around
      }
    }
  }, [map, runZoom]); // Intentional: only run when runZoom changes, use latest reading from closure

  useEffect(() => {
    if (!reading) return;
    acceptPoint({ lat: reading.lat, lng: reading.lng, t: reading.t });
  }, [reading?.lat, reading?.lng, reading?.t]);

  const explorationScore = useMemo(() => {
    const s = new Set<string>();
    for (const p of revealed) s.add(cellKey(p, 4));
    return s.size;
  }, [revealed]);

  const currentRunPolyline = useMemo(
    () => currentRun.map((p) => [p.lat, p.lng] as [number, number]),
    [currentRun]
  );

  const statusText =
    status.kind === "error"
      ? `GPS error: ${status.message}`
      : status.kind === "watching"
        ? "GPS tracking…"
        : "GPS idle";

  const runStateLabel = isRunning ? "Running" : currentRun.length ? "Paused" : "Not tracking";
  const accuracyLabel =
    reading && typeof reading.accuracy === "number"
      ? `${Math.round(reading.accuracy)} m`
      : "n/a";
  const isError = status.kind === "error";

  // On first load, try to center the map on the user's current location.
  useEffect(() => {
    if (!map) return;
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], runZoom);
      },
      () => {
        // ignore errors and keep default center (Sofia)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000
      }
    );
  }, [map]);

  const handleStartRun = () => {
    start();
    if (map) {
      if (reading) {
        map.setView([reading.lat, reading.lng], runZoom);
      } else {
        map.setZoom(runZoom);
      }
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        center={SOFIA}
        zoom={runZoom}
        zoomControl={false}
        className="h-full w-full z-0"
        preferCanvas
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FogCanvas revealed={revealed} radiusPx={FOG_BRUSH_RADIUS_PX} fogOpacity={FOG_OPACITY} />

        {currentRunPolyline.length >= 2 ? (
          <Polyline
            positions={currentRunPolyline}
            pathOptions={{
              color: "#22d3ee",
              weight: 6,
              opacity: 0.95
            }}
          />
        ) : null}

        {follow ? <RecenterOnUser point={reading ? { lat: reading.lat, lng: reading.lng, t: reading.t } : null} /> : null}
      </MapContainer>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
        <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-2">
          <div className="glass-panel px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
              <span>{runStateLabel}</span>
              <span className="text-slate-600">GPS • {accuracyLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <StatCard label="Distance" value={`${formatKm(totalRunMeters)} km`} />
              <StatCard
                label="Exploration"
                value={explorationScore}
                align="right"
                accent
              />
            </div>
            <div
              className={`mt-2 text-xs ${isError ? "text-rose-300" : "text-slate-400"
                }`}
            >
              {statusText}
              {isError ? (
                <>
                  {" "}
                  • Check that location permissions are allowed for this site and that
                  GPS is enabled on your device.
                </>
              ) : null}
            </div>
            <RunAreaSelector />
            <ThemeSelector />
          </div>
        </div>
      </div>

      {/* Controls */}
      <BottomSheet>
        <IconButton
          active={follow}
          icon={<LocateFixed className="h-4 w-4" />}
          onClick={() => setFollow((v) => !v)}
          title="Toggle follow"
        />

        <div className="flex flex-1 items-center justify-end gap-2">
          {isRunning ? (
            <PrimaryButton
              variant="danger"
              onClick={stop}
              leftIcon={<Square className="h-4 w-4" />}
            >
              Stop
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={handleStartRun}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Start run
            </PrimaryButton>
          )}

          <PrimaryButton
            onClick={resetAll}
            leftIcon={<RotateCcw className="h-4 w-4" />}
            className="!bg-slate-900 !text-slate-300 !ring-slate-700 hover:!bg-slate-800"
            title="Reset fog"
          >
            Reset
          </PrimaryButton>
        </div>
      </BottomSheet>
    </div>
  );
}
