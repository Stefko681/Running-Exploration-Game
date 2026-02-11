import { X, Map as MapIcon, Clock, Navigation } from "lucide-react";
import { RunSummary } from "../types";
import { formatKm } from "../utils/geo";

type Props = {
    run: RunSummary;
    onClose: () => void;
};

export function RunDetailModal({ run, onClose }: Props) {

    // Calculate bounds for SVG
    const lats = run.points.map(p => p.lat);
    const lngs = run.points.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const width = maxLng - minLng;
    const height = maxLat - minLat;

    // Aspect ratio and padding
    const padding = Math.max(width, height) * 0.1;

    // Normalize points to 0-100 range (SVG coordinate space)
    // Flip Y because SVG 0 is top
    const normalize = (val: number, min: number, range: number) => (val - min) / range * 100;

    const svgPoints = run.points.map(p => {
        const x = normalize(p.lng, minLng - padding, width + padding * 2);
        const y = 100 - normalize(p.lat, minLat - padding, height + padding * 2); // Flip Y
        return `${x},${y}`;
    }).join(" ");

    const duration = Math.round((run.endedAt - run.startedAt) / 1000 / 60);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header / Map Preview */}
                <div className="relative h-64 bg-slate-950 flex items-center justify-center overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />

                    {/* The Path */}
                    <svg viewBox="0 0 100 100" className="w-full h-full p-8 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                        <polyline
                            points={svgPoints}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animate-in fade-in duration-1000"
                        />
                        {/* Start Point */}
                        <circle cx={svgPoints.split(" ")[0].split(",")[0]} cy={svgPoints.split(" ")[0].split(",")[1]} r="1.5" fill="#4ade80" />
                        {/* End Point */}
                        <circle cx={svgPoints.split(" ").slice(-1)[0].split(",")[0]} cy={svgPoints.split(" ").slice(-1)[0].split(",")[1]} r="1.5" fill="#f87171" />
                    </svg>

                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
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
