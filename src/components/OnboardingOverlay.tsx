import { useEffect, useState } from "react";
import { Crosshair, Map as MapIcon, Shield } from "lucide-react";

const STORAGE_KEY = "fogrun:onboardingSeen";

export function OnboardingOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end bg-slate-950/80 backdrop-blur-sm sm:items-center animate-in fade-in duration-500">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-slate-900 p-0 shadow-2xl sm:rounded-3xl">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        {/* Top Accent Line */}
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500"></div>

        <div className="relative z-10 p-6 pt-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 shadow-[0_0_15px_-3px_rgba(34,211,238,0.4)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            Mission Briefing
          </div>

          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-lg">
            The City is <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">Uncharted</span>
          </h1>

          <p className="mt-4 text-base font-medium leading-relaxed text-slate-300">
            A dense fog covers the streets. Only your movement can clear it.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:border-white/10 hover:bg-white/10">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Crosshair size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Target Acquired</div>
                <div className="text-xs text-slate-400">Allow GPS access to track your position in real-time.</div>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:border-white/10 hover:bg-white/10">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <MapIcon size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Push Back the Fog</div>
                <div className="text-xs text-slate-400">Run to reveal the map. Every street conquered is yours forever.</div>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:border-white/10 hover:bg-white/10">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Shield size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Build Your Legend</div>
                <div className="text-xs text-slate-400">Rank up from Scout to Legend. Maintain your daily streak.</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-cyan-500/25 active:scale-[0.98]"
          >
            Start Mission
          </button>
        </div>
      </div>
    </div>
  );
}
