import { toPng } from "html-to-image";
import { useCallback, useRef, useState, useEffect } from "react";
import { useRunStore } from "../state/useRunStore";
import type { RunSummary } from "../types";
import { formatKm, cellKey } from "../utils/geo";
import { getRank } from "../utils/gamification";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { X, Share2 } from "lucide-react";
import { FogCanvas } from "./FogCanvas";
import { FOG_BRUSH_RADIUS_PX, FOG_OPACITY } from "../config";

// Fix for default Leaflet icons in PWA/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

type ShareCardProps = {
    run?: RunSummary;
    mode: 'single' | 'total';
    onClose: () => void;
};

function MapFitter({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap();
    useEffect(() => {
        if (!bounds) return;
        map.fitBounds(bounds, { padding: [50, 50] });
    }, [map, bounds]);
    return null;
}

export function ShareCard({ run, mode, onClose }: ShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);

    // Get store data for 'total' mode
    const revealed = useRunStore(s => s.revealed);
    const allRuns = useRunStore(s => s.runs);

    // Derived stats
    const totalDistance = mode === 'total'
        ? allRuns.reduce((acc, r) => acc + r.distanceMeters, 0)
        : (run?.distanceMeters || 0);

    const currentRank = getRank(totalDistance);

    // Calculate Map Bounds & Points
    let positions: [number, number][] = [];
    let bounds: L.LatLngBounds | null = null;
    let center: L.LatLngExpression = [42.6977, 23.3219]; // Default Sofia

    if (mode === 'single' && run) {
        positions = run.points.map(p => [p.lat, p.lng]);
        if (positions.length > 0) {
            bounds = L.latLngBounds(positions);
            center = bounds.getCenter();
        }
    } else if (mode === 'total' && revealed.length > 0) {
        // For total mode, fit to all revealed points (sampled for performance if needed)
        // Taking every 10th point for bounds calculation to be fast
        const sample = revealed.filter((_, i) => i % 10 === 0).map(p => [p.lat, p.lng] as [number, number]);
        if (sample.length > 0) {
            bounds = L.latLngBounds(sample);
            center = bounds.getCenter();
        }
    }

    const explorationScore = mode === 'total' ? (() => {
        const s = new Set<string>();
        for (const p of revealed) s.add(cellKey(p, 4));
        return s.size;
    })() : 0;

    const handleShare = useCallback(async () => {
        if (!cardRef.current) return;
        setGenerating(true);

        try {
            // Small delay to ensure render
            await new Promise(r => setTimeout(r, 500)); // Increased delay for map tiles

            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 2, // High quality
                style: {
                    transform: 'scale(1)', // Ensure no scaling issues
                }
            });

            const blob = await (await fetch(dataUrl)).blob();
            const filename = mode === 'total' ? "city-quest-conquest.png" : "city-quest-run.png";
            const file = new File([blob], filename, { type: "image/png" });
            const title = mode === 'total' ? "My City Conquest — CityQuest" : "My Run — CityQuest";
            const appUrl = window.location.origin;
            const text = mode === 'total'
                ? `🏙️ I've explored ${formatKm(totalDistance)}km of the city in CityQuest! ${appUrl}`
                : `🏃 I ran ${formatKm(totalDistance)}km! Track your own runs on CityQuest: ${appUrl}`;

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title,
                    text,
                    url: appUrl,
                });
            } else {
                // Fallback download
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = filename;
                a.click();
            }
        } catch (err) {
            console.error("Share failed", err);
            // eslint-disable-next-line no-alert
            alert("Failed to generate image. Try again.");
        } finally {
            setGenerating(false);
        }
    }, [totalDistance, mode]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-950 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70"
                >
                    <X size={20} />
                </button>

                {/* Capture Area */}
                <div ref={cardRef} className="relative aspect-[9/16] w-full bg-slate-900 text-white overflow-hidden flex flex-col">
                    {/* Map Background */}
                    <div className="absolute inset-0 z-0">
                        <MapContainer
                            center={center}
                            zoom={13}
                            zoomControl={false}
                            className="h-full w-full grayscale-[0.5] contrast-125 brightness-75"
                            attributionControl={false}
                            key={mode === 'single' ? run?.id : 'total'}
                        >
                            {bounds && <MapFitter bounds={bounds} />}
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Render Fog if Total Mode */}
                            {mode === 'total' && (
                                <FogCanvas revealed={revealed} radiusPx={FOG_BRUSH_RADIUS_PX} fogOpacity={FOG_OPACITY} />
                            )}

                            {/* Render Path if Single Mode */}
                            {mode === 'single' && positions.length > 0 && (
                                <>
                                    <Polyline
                                        positions={positions}
                                        pathOptions={{
                                            color: 'var(--app-accent)',
                                            weight: 6,
                                            opacity: 0.9,
                                            lineCap: 'round',
                                            lineJoin: 'round'
                                        }}
                                    />
                                    <Marker position={positions[0]} />
                                    <Marker position={positions[positions.length - 1]} />
                                </>
                            )}
                        </MapContainer>

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none" />
                    </div>

                    {/* Content Overlay */}
                    <div className="relative z-10 mt-auto flex flex-col p-6 gap-4">
                        {/* Logo/Branding */}
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-lg font-outline-2">
                                {mode === 'total' ? 'City Conquest' : 'CityQuest'}
                            </h2>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-slate-900/80 p-4 backdrop-blur-md border border-white/10">
                                <div className="text-xs uppercase tracking-wider text-slate-400">
                                    {mode === 'total' ? 'Total Distance' : 'Distance'}
                                </div>
                                <div className="text-2xl font-bold">{formatKm(totalDistance)} <span className="text-sm font-normal text-slate-400">km</span></div>
                            </div>
                            <div className="rounded-xl bg-slate-900/80 p-4 backdrop-blur-md border border-white/10">
                                <div className="text-xs uppercase tracking-wider text-slate-400">
                                    {mode === 'total' ? 'Explored Area' : 'Points'}
                                </div>
                                <div className="text-2xl font-bold">
                                    {mode === 'total' ? explorationScore : (run?.points.length || 0)}
                                </div>
                            </div>
                        </div>

                        {/* Rank Badge */}
                        <div className={`flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-md ${currentRank.current.color}`}>
                            <currentRank.current.icon className="h-8 w-8" />
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Operator Rank</div>
                                <div className="text-xl font-bold">{currentRank.current.title}</div>
                            </div>
                        </div>

                        {/* Date / Id */}
                        <div className="text-center text-[10px] text-slate-500 font-mono">
                            {mode === 'single' && run ? (
                                <>
                                    {new Date(run.startedAt).toLocaleDateString()} • {run.id.slice(-6)}
                                </>
                            ) : (
                                <>
                                    ALL TIME STATS
                                </>
                            )}
                        </div>

                        {/* Bottom padding for aesthetic */}
                        <div className="h-2"></div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="p-4 bg-slate-950 border-t border-slate-800">
                    <button
                        onClick={handleShare}
                        disabled={generating}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-6 py-3.5 font-bold text-slate-950 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {generating ? (
                            <span className="animate-pulse">Generating...</span>
                        ) : (
                            <>
                                <Share2 size={20} />
                                {mode === 'total' ? 'Share Conquest' : 'Share Snapshot'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
