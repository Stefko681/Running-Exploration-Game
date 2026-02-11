import { X, Trophy, Map, Footprints, Flame, Shield, Zap, Mountain } from "lucide-react";
import { formatKm } from "../utils/geo";
import { LeaderboardRow } from "../services/leaderboardService";

type Props = {
    runnerData?: LeaderboardRow & { rank?: number };
    onClose: () => void;
};

export function RunnerProfileModal({ runnerData, onClose }: Props) {
    if (!runnerData) return null;

    // Adapt LeaderboardRow to the shape we need
    const runner = {
        id: runnerData.user_id,
        name: runnerData.username,
        score: runnerData.score,
        distance: runnerData.distance,
        league: runnerData.league,
        // Simulate persona properties deterministically below, or use defaults
        persona: "balanced"
    };

    // Hash function for determinism
    const safeId = typeof runner.id === 'string' ? runner.id : "default_id";
    const safeName = typeof runner.name === 'string' ? runner.name : "Unknown";

    const hash = safeId.split("").reduce((a: number, b: string) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    const rand = (mod: number) => Math.abs((hash + mod) % mod);

    const totalRuns = Math.floor(runner.distance / 2.5);

    // Simulate extra flavor
    if (runner.persona === "balanced") { // Always true initially
        const personas = ["explorer", "sprinter", "marathoner", "completionist"];
        runner.persona = personas[rand(personas.length)];
    }

    const possibleBadges = [
        { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/20", label: "Fast" },
        { icon: Mountain, color: "text-purple-400", bg: "bg-purple-400/20", label: "Climber" },
        { icon: Flame, color: "text-orange-400", bg: "bg-orange-400/20", label: "Hot Streak" },
        { icon: Shield, color: "text-blue-400", bg: "bg-blue-400/20", label: "Veteran" },
        { icon: Footprints, color: "text-emerald-400", bg: "bg-emerald-400/20", label: "Traveler" },
    ];

    const badgeCount = 1 + rand(3);
    const badgeStartIndex = rand(possibleBadges.length);
    const badges = [];
    for (let i = 0; i < badgeCount; i++) {
        badges.push(possibleBadges[(badgeStartIndex + i) % possibleBadges.length]);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header / Banner */}
                <div className="relative h-32 bg-gradient-to-br from-slate-800 to-slate-900">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)]" />
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                        <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center shadow-xl">
                            <span className="text-3xl font-black text-slate-500">{safeName.substring(0, 2).toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-12 pb-6 px-6 text-center">
                    <h2 className="text-xl font-bold text-white">{safeName}</h2>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-6">{runner.league} League Operator</div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5">
                            <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                            <div className="text-sm font-bold text-white">{runner.score.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Score</div>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5">
                            <Map className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                            <div className="text-sm font-bold text-white">{formatKm(runner.distance)}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Dist</div>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5">
                            <Footprints className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                            <div className="text-sm font-bold text-white">{totalRuns}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Runs</div>
                        </div>
                    </div>

                    {/* Persona / Badges */}
                    <div className="text-left mb-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Combat Style</h3>
                        <div className="flex flex-wrap gap-2">
                            <div className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-white/5 capitalize">
                                {runner.persona.replace("_", " ")}
                            </div>
                            {badges.map((b, i) => (
                                <div key={i} className={`px-2 py-1 rounded text-xs border border-white/5 flex items-center gap-1 ${b.bg} ${b.color}`}>
                                    <b.icon size={10} />
                                    {b.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
