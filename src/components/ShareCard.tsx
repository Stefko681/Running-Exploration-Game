import { toPng } from "html-to-image";
import { useCallback, useRef, useState } from "react";
import { useRunStore } from "../state/useRunStore";
import type { RunSummary } from "../types";
import { formatKm } from "../utils/geo";
import { getRank } from "../utils/gamification";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import { X, Share2 } from "lucide-react";

// Fix for default Leaflet icons in PWA/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

type ShareCardProps = {
    run: RunSummary;
    onClose: () => void;
};

export function ShareCard({ run, onClose }: ShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);

    // Calculate Map Bounds
    const positions: [number, number][] = run.points.map(p => [p.lat, p.lng]);
    const bounds = L.latLngBounds(positions);
    const center = bounds.getCenter();

    // Rank Info
    // Use a stable selector to avoid infinite loops
    const totalDistance = useRunStore(s => s.runs.reduce((acc, r) => acc + r.distanceMeters, 0));
    const currentRank = getRank(totalDistance);

    const handleShare = useCallback(async () => {
        if (!cardRef.current) return;
        setGenerating(true);

        try {
            // Small delay to ensure render
            await new Promise(r => setTimeout(r, 100));

            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 2, // High quality
                style: {
                    transform: 'scale(1)', // Ensure no scaling issues
                }
            });

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "city-fog-run.png", { type: "image/png" });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: "My Run in City Fog of War",
                    text: `I ran ${formatKm(run.distanceMeters)}km!`
                });
            } else {
                // Fallback download
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = "city-fog-run.png";
                a.click();
            }
        } catch (err) {
            console.error("Share failed", err);
            alert("Failed to generate image. Try again.");
        } finally {
            setGenerating(false);
        }
    }, [run.distanceMeters]);

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
                            zoom={14} // Auto-fit bounds logic would be better but requires effect
                            zoomControl={false}
                            className="h-full w-full grayscale-[0.5] contrast-125 brightness-75"
                            attributionControl={false}
                            key={run.id} // Force re-render on new run
                            whenReady={(e) => {
                                e.target.fitBounds(bounds, { padding: [50, 50] });
                            }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
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
                        </MapContainer>

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none" />
                    </div>

                    {/* Content Overlay */}
                    <div className="relative z-10 mt-auto flex flex-col p-6 gap-4">
                        {/* Logo/Branding */}
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-lg font-outline-2">
                                City Fog of War
                            </h2>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-slate-900/80 p-4 backdrop-blur-md border border-white/10">
                                <div className="text-xs uppercase tracking-wider text-slate-400">Distance</div>
                                <div className="text-2xl font-bold">{formatKm(run.distanceMeters)} <span className="text-sm font-normal text-slate-400">km</span></div>
                            </div>
                            <div className="rounded-xl bg-slate-900/80 p-4 backdrop-blur-md border border-white/10">
                                <div className="text-xs uppercase tracking-wider text-slate-400">Points</div>
                                <div className="text-2xl font-bold">{run.points.length}</div>
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
                            {new Date(run.startedAt).toLocaleDateString()} • {run.id.slice(-6)}
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
                                Share Snapshot
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
