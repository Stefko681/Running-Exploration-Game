import { useEffect, useState } from "react";

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
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end bg-black/60 sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border border-slate-800 bg-slate-950/95 p-5 shadow-glow backdrop-blur sm:rounded-3xl">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
          Welcome runner
        </div>
        <h1 className="mt-2 text-lg font-semibold text-slate-50">
          Explore Sofia, clear the fog
        </h1>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li>1. Allow location access when your browser asks.</li>
          <li>2. Tap “Start run” and start moving — your path will glow on the map.</li>
          <li>3. As you run, the dark fog is erased along your route.</li>
          <li>4. Finished? Hit “Stop” and your run is saved in History.</li>
        </ul>
        <button
          type="button"
          onClick={dismiss}
          className="mt-4 w-full rounded-2xl bg-app-accentSoft px-4 py-2.5 text-sm font-semibold text-cyan-50 ring-1 ring-app-accent/60 transition-colors hover:bg-app-accent/30"
        >
          Got it, let&apos;s run
        </button>
      </div>
    </div>
  );
}

