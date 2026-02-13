import { useEffect } from "react";
import { X, Map as MapIcon, Clock, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { RunSummary } from "../types";
import { formatKm } from "../utils/geo";

// Fix for default Leaflet icons in PWA/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

function MapFitter({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap();
    useEffect(() => {
        if (!bounds) return;
        map.fitBounds(bounds, { padding: [40, 40] });
    }, [map, bounds]);
    return null;
}

type Props = {
    run: RunSummary;
    onClose: () => void;
};

export function RunDetailModal({ run, onClose }: Props) {
    const positions: [number, number][] = run.points.map(p => [p.lat, p.lng]);
    const bounds = positions.length > 0 ? L.latLngBounds(positions) : null;
    const center: L.LatLngExpression = bounds ? bounds.getCenter() : [42.6977, 23.3219];

    const duration = Math.round((run.endedAt - run.startedAt) / 1000 / 60);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header / Map Preview */}
                <div className="relative h-64 overflow-hidden">
                    <MapContainer
                        center={center}
                        zoom={14}
                        zoomControl={false}
                        className="h-full w-full"
                        attributionControl={false}
                        key={run.id}
                    >
                        {bounds && <MapFitter bounds={bounds} />}
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {positions.length > 0 && (
                            <>
                                <Polyline
                                    positions={positions}
                                    pathOptions={{
                                        color: '#06b6d4',
                                        weight: 5,
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

                    {/* Gradient overlay for blending into stats below */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />

                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 z-[1000] p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stat Cards */}
                <div className="p-6 bg-slate-900">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-cyan-950/50 rounded-xl text-cyan-400">
                            <MapIcon size={24} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mission Debrief</div>
                            <div className="text-lg font-bold text-white">{new Date(run.startedAt).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                <Navigation size={12} />
                                <span>Distance</span>
                            </div>
                            <div className="text-xl font-black text-white">{formatKm(run.distanceMeters)} <span className="text-sm font-medium text-slate-500">km</span></div>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                <Clock size={12} />
                                <span>Duration</span>
                            </div>
                            <div className="text-xl font-black text-white">{duration} <span className="text-sm font-medium text-slate-500">min</span></div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-slate-950/50 rounded-xl border border-white/5 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400">Fog Cleared</span>
                        <span className="text-sm font-bold text-emerald-400">+{run.points.length} pts</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
