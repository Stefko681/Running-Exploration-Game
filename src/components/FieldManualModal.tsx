import { X, Map as MapIcon, Trophy, Target, Award, Footprints } from "lucide-react";

type FieldManualModalProps = {
    onClose: () => void;
};

export function FieldManualModal({ onClose }: FieldManualModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <div className="bg-cyan-500/20 text-cyan-400 p-2 rounded-lg">
                            <MapIcon size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Field Manual</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-5 space-y-8 scrollbar-hide">

                    {/* Section 1: Objective */}
                    <section>
                        <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                            <Footprints size={16} /> 1. Objective
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Your mission is to physically explore the real world. As you move, you reveal the
                            <span className="text-white font-bold"> Fog of War</span> on the map.
                            The more area you uncover, the higher your rank.
                        </p>
                    </section>

                    {/* Section 2: Scoring (PTS) */}
                    <section className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                            <Trophy size={16} /> 2. Scoring System (PTS)
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-md mt-0.5">
                                    <Footprints size={14} />
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm">100 PTS per KM</div>
                                    <div className="text-slate-400 text-xs">Earn points for every kilometer of distance covered during a run.</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded-md mt-0.5">
                                    <MapIcon size={14} />
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm">50 PTS per New Area</div>
                                    <div className="text-slate-400 text-xs">
                                        The world is divided into small hexagonal cells. Uncovering a <span className="text-indigo-300">new cell</span> for the first time grants a significant bonus.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Supply Drops */}
                    <section>
                        <h3 className="text-amber-400 font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                            <Target size={16} /> 3. Supply Drops
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-2">
                            Every day, <span className="text-amber-400 font-bold">3 Supply Drops</span> appear within 1.5km of your location.
                        </p>
                        <ul className="list-disc list-inside text-slate-400 text-xs space-y-1 ml-1">
                            <li>Physically run to the drop location to collect it.</li>
                            <li>Collecting drops grants extra XP and Badge progress.</li>
                            <li>Collect all 3 to trigger a "Wave Clear" and spawn harder drops further away!</li>
                        </ul>
                    </section>

                    {/* Section 4: Ranks & Competition */}
                    <section>
                        <h3 className="text-purple-400 font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                            <Award size={16} /> 4. Ranks & Leagues
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Compete on the <span className="text-white font-bold">Global Leaderboard</span>.
                            Your total PTS determines your standing in the weekly Leagues (Bronze to Master).
                        </p>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-sm"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
}
