
import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap } from "leaflet";
import { DivIcon } from "leaflet";
import { LocateFixed, Square, Play, Flame, Share2, Radio, Package, Activity, Gauge, Navigation, Compass, HelpCircle, Map as MapIcon, Lock, Timer, Footprints, Zap, Pause } from "lucide-react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { MapContainer, Polyline, TileLayer, useMap, Marker, Popup } from "react-leaflet";
import { BottomSheet } from "../components/BottomSheet";
import { FogCanvas } from "../components/FogCanvas";
import { IconButton } from "../components/IconButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { RunAreaSelector } from "../components/RunAreaSelector";
import { ThemeSelector } from "../components/ThemeSelector";
import { StatCard } from "../components/StatCard";
import { ShareCard } from "../components/ShareCard";
import { FieldManualModal } from "../components/FieldManualModal";
import { DistrictLayer } from "../components/DistrictLayer";
import { FOG_BRUSH_RADIUS_METERS, FOG_OPACITY } from "../config";
import { useGeolocation } from "../hooks/useGeolocation";
import { useDeviceOrientation } from "../hooks/useDeviceOrientation";
import { useRunStore } from "../state/useRunStore";
import { useSettingsStore } from "../state/useSettingsStore";
import { useDistrictStore } from "../state/useDistrictStore";
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

// Helper: format seconds into MM:SS or HH:MM:SS
function formatTimer(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Helper: format pace as M:SS /km
function formatPace(metersPerSec: number): string {
  if (metersPerSec <= 0.1) return '--:--';
  const secPerKm = 1000 / metersPerSec;
  if (secPerKm > 30 * 60) return '--:--'; // > 30 min/km = walking
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Estimate calories: ~1 kcal per kg per km (rough)
function estimateCalories(distanceMeters: number, weightKg: number = 70): number {
  return Math.round((distanceMeters / 1000) * weightKg * 1.036);
}

export function MapScreen() {
  const {
    isRunning,
    start,
    stop,
    currentRun,
    revealed,
    totalRunMeters,
    acceptPoint,
    currentStreak,
    supplyDrops,
    runStartedAt,
    refreshDrops,
    lastDropReward
  } = useRunStore();

  // Live timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isRunning || !runStartedAt) {
      setElapsed(0);
      return;
    }
    // Initialize with already-elapsed time
    setElapsed(Math.floor((Date.now() - runStartedAt) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - runStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, runStartedAt]);

  // Auto-pause detection
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkAutoPause = useCallback((speedKmh: number) => {
    if (!isRunning) return;
    if (speedKmh < 0.5) {
      // If speed is very low for 10 seconds, show auto-pause indicator
      if (!pauseTimer.current) {
        pauseTimer.current = setTimeout(() => setIsAutoPaused(true), 10000);
      }
    } else {
      if (pauseTimer.current) {
        clearTimeout(pauseTimer.current);
        pauseTimer.current = null;
      }
      setIsAutoPaused(false);
    }
  }, [isRunning]);

  const { unlockedDistricts } = useDistrictStore();
  const [follow, setFollow] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showFieldManual, setShowFieldManual] = useState(false);
  const [showDistrictList, setShowDistrictList] = useState(false);
  const districts = useDistrictStore((s) => s.districts);
  const runZoom = useSettingsStore((s) => s.runZoom);

  // Parse district names from raw data
  const districtNames = useMemo(() => {
    if (!districts || districts.length === 0) return [];
    const names: { id: string; name: string; unlocked: boolean }[] = [];
    for (const el of districts as any[]) {
      const id = el.id?.toString();
      const name = el.tags?.name || el.tags?.["name:en"] || "Unknown District";
      if (id && name) {
        names.push({ id, name, unlocked: unlockedDistricts.includes(id) });
      }
    }
    names.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return names;
  }, [districts, unlockedDistricts]);

  // Always track location while on the Map screen
  const { status, reading } = useGeolocation(true, { enableHighAccuracy: true });
  const { heading: deviceHeading, requestAccess: requestOrientationAccess, permissionGranted: orientationPermissionGranted } = useDeviceOrientation();

  // Update map zoom when user changes the setting
  useEffect(() => {
    if (map) {
      map.setZoom(runZoom);
    }
  }, [map, runZoom]);

  useEffect(() => {
    if (!reading) return;
    const p = { lat: reading.lat, lng: reading.lng, t: reading.t };
    acceptPoint(p);

    // Periodically check if we need to refresh drops (idle or running)
    refreshDrops(p);
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

  const runStateLabel = isRunning
    ? (isAutoPaused ? "Paused" : "Running")
    : currentRun.length ? "Stopped" : "Ready";
  const accuracyValue = reading && typeof reading.accuracy === "number" ? Math.round(reading.accuracy) : null;
  const accuracyLabel = accuracyValue !== null ? `${accuracyValue} m` : "n/a";
  const accuracyColor = accuracyValue === null
    ? "text-slate-500"
    : accuracyValue <= 10 ? "text-emerald-400"
      : accuracyValue <= 25 ? "text-cyan-400"
        : accuracyValue <= 50 ? "text-amber-400"
          : "text-rose-400";
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

  const speedMs = reading?.speed ?? 0;
  const speedKmh = (speedMs * 3.6).toFixed(1);
  const altitude = reading?.altitude ? Math.round(reading.altitude) : "---";
  const pace = formatPace(speedMs);
  const calories = estimateCalories(totalRunMeters);

  // Auto-pause check
  useEffect(() => {
    checkAutoPause(speedMs * 3.6);
  }, [speedMs, checkAutoPause]);

  // Exploration percentage (Sofia ~490 km²)
  // Each cell at zoom 4 ≈ 0.005 km² → total ~98000 cells for Sofia
  const explorationPercent = useMemo(() => {
    const totalCityCells = 98000; // approximate for Sofia
    return Math.min(100, (explorationScore / totalCityCells) * 100).toFixed(2);
  }, [explorationScore]);

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
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLng = toRad(nearest.lng - userPos.lng);
    const lat1 = toRad(userPos.lat);
    const lat2 = toRad(nearest.lat);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const θ = Math.atan2(y, x);
    const bearing = (θ * 180 / Math.PI + 360) % 360; // 0-360 degrees

    return { distance: minDist, bearing };
  }, [reading, supplyDrops]);

  // User heading (prioritize compass, fall back to GPS heading, then 0)
  const userHeading = deviceHeading ?? reading?.heading ?? 0;
  const relativeBearing = nearestDropInfo ? (nearestDropInfo.bearing - userHeading) : 0;

  const handleNavigateToDrop = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(url, '_blank');
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {showShare && (
        <ShareCard
          mode="total"
          onClose={() => setShowShare(false)}
        />
      )}

      {showFieldManual && (
        <FieldManualModal onClose={() => setShowFieldManual(false)} />
      )}

      {/* Reward Toast */}
      {lastDropReward && (
        <div className="fixed top-20 left-4 right-4 z-[100] animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="mx-auto max-w-sm bg-slate-900/90 border border-amber-500/50 rounded-2xl p-4 backdrop-blur-md shadow-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/30">
              <Package size={24} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">{lastDropReward.title}</div>
              <div className="text-xs text-slate-400">{lastDropReward.message}</div>
            </div>
            <button
              onClick={() => useRunStore.setState({ lastDropReward: null })}
              className="text-slate-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
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

        <DistrictLayer />
        <FogCanvas revealed={revealed} radiusMeters={FOG_BRUSH_RADIUS_METERS} fogOpacity={FOG_OPACITY} />

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
                <button
                  onClick={() => handleNavigateToDrop(drop.lat, drop.lng)}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                >
                  <Navigation size={12} />
                  Navigate
                </button>
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
                <span className={isAutoPaused ? 'text-amber-400' : ''}>{runStateLabel}</span>
                {currentStreak > 0 && (
                  <div className="flex items-center gap-1 rounded-full bg-orange-950/30 px-1.5 py-0.5 text-[10px] font-bold text-orange-400 ring-1 ring-orange-500/20 backdrop-blur-sm animate-in fade-in zoom-in">
                    <Flame className="h-3 w-3 fill-orange-500" />
                    <span>{currentStreak}d</span>
                  </div>
                )}
              </div>
              <span className={accuracyColor}>GPS • {accuracyLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <StatCard label="Distance" value={`${formatKm(totalRunMeters)} km`} />
              <StatCard
                label="Explored"
                value={`${explorationPercent}%`}
                align="right"
                accent
              />
            </div>
            {/* District Stats */}
            <div
              className="mt-2 flex items-center justify-between border-t border-slate-800/50 pt-2 cursor-pointer hover:bg-slate-800/30 -mx-4 px-4 py-1 rounded-lg transition-colors"
              onClick={() => setShowDistrictList((v) => !v)}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <MapIcon size={12} />
                <span>Districts</span>
              </div>
              <div className="text-xs font-bold text-slate-300">
                <span className="text-cyan-400">{unlockedDistricts.length}</span> / {districtNames.length || 24}
              </div>
            </div>
            {showDistrictList && districtNames.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-950/80 backdrop-blur-md">
                {districtNames.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2 px-3 py-2 border-b border-slate-800/30 last:border-0 text-xs ${d.unlocked ? 'text-slate-200' : 'text-slate-500'}`}
                  >
                    {d.unlocked ? (
                      <span className="text-emerald-400 text-sm">✓</span>
                    ) : (
                      <Lock size={12} className="text-rose-400/70" />
                    )}
                    <span className={d.unlocked ? 'font-medium' : 'font-normal'}>{d.name}</span>
                  </div>
                ))}
              </div>
            )}
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
            {!isRunning && (
              <>
                <RunAreaSelector />
                <ThemeSelector />
              </>
            )}
          </div>

          {/* Immersive HUD — context-sensitive */}
          <div className="grid grid-cols-3 gap-2 px-2 animate-in slide-in-from-bottom-4 duration-700 delay-150">
            {isRunning ? (
              <>
                {/* PACE */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-900/60 p-2 backdrop-blur-md">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1">
                    <Footprints size={10} /> PACE
                  </div>
                  <div className="text-xl font-black text-white lining-nums tabular-nums">
                    {pace}<span className="text-[10px] ml-0.5 text-slate-400 font-normal">/km</span>
                  </div>
                </div>

                {/* TIMER */}
                <div className={`flex flex-col items-center justify-center rounded-xl border bg-slate-900/60 p-2 backdrop-blur-md relative overflow-hidden ${isAutoPaused ? 'border-amber-500/30' : 'border-emerald-500/20'
                  }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 z-10 ${isAutoPaused ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                    {isAutoPaused ? <Pause size={10} /> : <Timer size={10} />}
                    {isAutoPaused ? 'PAUSED' : 'TIME'}
                  </div>
                  <div className="text-xl font-black text-white lining-nums tabular-nums z-10">
                    {formatTimer(elapsed)}
                  </div>
                  {isAutoPaused && (
                    <div className="absolute inset-0 bg-amber-500/5 animate-pulse z-0" />
                  )}
                </div>

                {/* CALORIES */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-slate-900/60 p-2 backdrop-blur-md">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                    <Zap size={10} /> CAL
                  </div>
                  <div className="text-xl font-black text-white lining-nums tabular-nums">
                    {calories}<span className="text-[10px] ml-0.5 text-slate-400 font-normal">kcal</span>
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <BottomSheet>
        <div className="flex items-center gap-2">
          {!orientationPermissionGranted && (
            <IconButton
              onClick={requestOrientationAccess}
              icon={<Compass className="h-4 w-4" />}
              title="Enable Compass"
            />
          )}
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
          <IconButton
            onClick={() => setShowFieldManual(true)}
            icon={<HelpCircle className="h-4 w-4" />}
            title="Field Manual (Help)"
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
        </div>
      </BottomSheet>
    </div>
  );
}
