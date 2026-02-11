
import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap } from "leaflet";
import { DivIcon } from "leaflet";
import { LocateFixed, RotateCcw, Square, Play, Flame, Share2, Radio, Package, Activity, Gauge, Navigation } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Polyline, TileLayer, useMap, Marker, Popup } from "react-leaflet";
import { BottomSheet } from "../components/BottomSheet";
import { FogCanvas } from "../components/FogCanvas";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { RunAreaSelector } from "../components/RunAreaSelector";
import { ThemeSelector } from "../components/ThemeSelector";
import { StatCard } from "../components/StatCard";
import { ShareCard } from "../components/ShareCard";
import { FOG_BRUSH_RADIUS_PX, FOG_OPACITY } from "../config";
import { useGeolocation } from "../hooks/useGeolocation";
import { useRunStore } from "../state/useRunStore";
import { useSettingsStore } from "../state/useSettingsStore";
import type { LatLngPoint } from "../types";
import { cellKey, formatKm, haversineMeters } from "../utils/geo";

const SOFIA: [number, number] = [42.6977, 23.3219];

function RecenterOnUser({ point }: { point: LatLngPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
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
    acceptPoint,
    currentStreak,
    supplyDrops
  } = useRunStore();

  const [follow, setFollow] = useState(true);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [showShare, setShowShare] = useState(false);
  const runZoom = useSettingsStore((s) => s.runZoom);

  // Always track location while on the Map screen
  const { status, reading } = useGeolocation(true, { enableHighAccuracy: true });

  // Update map zoom when user changes the setting
  useEffect(() => {
    if (map) {
      map.setZoom(runZoom);
    }
  }, [map, runZoom]);

  useEffect(() => {
    if (!reading) return;
    acceptPoint({ lat: reading.lat, lng: reading.lng, t: reading.t });
  }, [reading?.lat, reading?.lng, reading?.t]);

  // On first load, try to center the map on the user's current location explicitly.
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

  const handleStartRun = () => {
    start();
    if (map) {
      if (reading) {
        map.setView([reading.lat, reading.lng], runZoom);
        setFollow(true);
      } else {
        map.setZoom(runZoom);
      }
    }
  };

  // Custom Icon for Supply Drops
  const dropIcon = new DivIcon({
    className: 'bg-transparent',
    html: `<div class="relative flex items-center justify-center w-8 h-8">
             <div class="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-75"></div>
             <div class="relative z-10 w-8 h-8 bg-amber-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"/></svg>
             </div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const speedKmh = reading?.speed ? (reading.speed * 3.6).toFixed(1) : "0.0";
  const altitude = reading?.altitude ? Math.round(reading.altitude) : "---";

  // Calculate nearest drop distance and bearing
  const nearestDropInfo = useMemo(() => {
    if (!reading || supplyDrops.length === 0) return null;
    const userPos = { lat: reading.lat, lng: reading.lng, t: reading.t };

    let minDist = Infinity;
    let nearest = null;

    for (const drop of supplyDrops) {
      if (drop.collected) continue;
      const d = haversineMeters(userPos, { lat: drop.lat, lng: drop.lng, t: 0 });
      if (d < minDist) {
        minDist = d;
        nearest = drop;
      }
    }

    if (!nearest) return null;

    // Calculate bearing (initial bearing)
    const y = Math.sin(nearest.lng - userPos.lng) * Math.cos(nearest.lat);
    const x = Math.cos(userPos.lat) * Math.sin(nearest.lat) -
      Math.sin(userPos.lat) * Math.cos(nearest.lat) * Math.cos(nearest.lng - userPos.lng);
    const θ = Math.atan2(y, x);
    const bearing = (θ * 180 / Math.PI + 360) % 360; // 0-360 degrees

    return { distance: minDist, bearing };
  }, [reading, supplyDrops]);

  // User heading (from GPS or device orientation could go here, for now assume 0 or use course if available)
  const userHeading = reading?.heading || 0;
  const relativeBearing = nearestDropInfo ? (nearestDropInfo.bearing - userHeading) : 0;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {showShare && (
        <ShareCard
          mode="total"
          onClose={() => setShowShare(false)}
        />
      )}

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

        {/* Supply Drops */}
        {supplyDrops.map((drop) => {
          if (drop.collected) return null;
          return (
            <Marker key={drop.id} position={[drop.lat, drop.lng]} icon={dropIcon}>
              <Popup className="text-slate-900 font-bold">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-amber-600" />
                  <span>Supply Drop Signal</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
        <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-2">
          <div className="glass-panel px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
              <div className="flex items-center gap-3">
                <span>{runStateLabel}</span>
                {currentStreak > 0 && (
                  <div className="flex items-center gap-1 rounded-full bg-orange-950/30 px-1.5 py-0.5 text-[10px] font-bold text-orange-400 ring-1 ring-orange-500/20 backdrop-blur-sm animate-in fade-in zoom-in">
                    <Flame className="h-3 w-3 fill-orange-500" />
                    <span>{currentStreak} DAY STREAK</span>
                  </div>
                )}
              </div>
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

          {/* Immersive HUD (Sci-Fi Overlay) */}
          <div className="grid grid-cols-3 gap-2 px-2 animate-in slide-in-from-bottom-4 duration-700 delay-150">
            {/* Speed */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-900/60 p-2 backdrop-blur-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1">
                <Gauge size={10} /> SPD
              </div>
              <div className="text-xl font-black text-white lining-nums tabular-nums">
                {speedKmh}<span className="text-[10px] ml-0.5 text-slate-400 font-normal">km/h</span>
              </div>
            </div>

            {/* Signal / Nearest Drop */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-amber-500/20 bg-slate-900/60 p-2 backdrop-blur-md relative overflow-hidden">
              {nearestDropInfo ? (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1 z-10">
                    <Navigation size={10} style={{ transform: `rotate(${relativeBearing}deg)` }} className="transition-transform duration-500" /> TARGET
                  </div>
                  <div className="text-xl font-black text-white lining-nums tabular-nums z-10">
                    {Math.round(nearestDropInfo.distance)}<span className="text-[10px] ml-0.5 text-slate-400 font-normal">m</span>
                  </div>
                  {/* Pulse effect if close */}
                  {nearestDropInfo.distance < 100 && (
                    <div className="absolute inset-0 bg-amber-500/10 animate-pulse z-0" />
                  )}
                </>
              ) : (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <Radio size={10} /> SIG
                  </div>
                  <div className="text-md font-bold text-slate-400">
                    NO SIGNAL
                  </div>
                </>
              )}
            </div>

            {/* Altitude */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/20 bg-slate-900/60 p-2 backdrop-blur-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                <Activity size={10} /> ALT
              </div>
              <div className="text-xl font-black text-white lining-nums tabular-nums">
                {altitude}<span className="text-[10px] ml-0.5 text-slate-400 font-normal">m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <BottomSheet>
        <div className="flex items-center gap-2">
          <IconButton
            active={follow}
            icon={<LocateFixed className="h-4 w-4" />}
            onClick={() => setFollow((v) => !v)}
            title="Toggle follow"
          />
          <IconButton
            onClick={() => setShowShare(true)}
            icon={<Share2 className="h-4 w-4" />}
            title="Share Conquest"
          />
        </div>

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
