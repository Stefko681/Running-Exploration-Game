
import { useEffect, useState } from "react";
import { ArrowRight, Map, Trophy, Shield } from "lucide-react";

interface LandingPageProps {
    onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-cyan-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-500/20 opacity-20 blur-[100px]"></div>
                <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] bg-blue-500/10 opacity-30 blur-[100px]"></div>
            </div>

            <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-12 sm:px-12 lg:pt-32">
                {/* Animated Badge */}
                <div
                    className={`inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-400 backdrop-blur-md transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                >
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
                    </span>
                    System Online
                </div>

                {/* Hero Headline */}
                <h1 className={`mt-8 max-w-3xl text-5xl font-black uppercase tracking-tighter text-white sm:text-7xl lg:text-8xl transition-all duration-700 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
                        Uncover
                    </span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">
                        Your City
                    </span>
                </h1>

                <p className={`mt-8 max-w-xl text-lg font-medium leading-relaxed text-slate-400 transition-all duration-700 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    The world is covered in fog. Run to reveal it. <br className="hidden sm:block" />
                    Turn every street into a conquest and become a legend.
                </p>

                {/* Call to Action */}
                <div className={`mt-10 flex flex-wrap gap-4 transition-all duration-700 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <button
                        onClick={onStart}
                        className="group relative flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-cyan-50 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.5)]"
                    >
                        Start Mission
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>

                {/* Feature Grid */}
                <div className={`mt-24 grid gap-8 sm:grid-cols-3 transition-all duration-1000 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                    <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-cyan-500/30 hover:bg-cyan-950/20">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                            <Map className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-100">Fog of War</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            Your map starts blank. Every step you take clears the fog permanently.
                        </p>
                    </div>

                    <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-blue-500/30 hover:bg-blue-950/20">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                            <Trophy className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-100">Rank Up</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            Earn XP for distance and exploration. Rise from <span className="text-white">Scout</span> to <span className="text-app-accent">Legend</span>.
                        </p>
                    </div>

                    <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-indigo-500/30 hover:bg-indigo-950/20">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                            <Shield className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-100">Conquer</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            Claim neighborhoods. Visualize your territory. Share your conquests.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
