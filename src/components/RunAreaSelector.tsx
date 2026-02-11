import { useSettingsStore } from "../state/useSettingsStore";

const PRESETS: { id: "near" | "city" | "wide"; label: string; zoom: number }[] = [
  { id: "near", label: "Near", zoom: 16 },
  { id: "city", label: "City", zoom: 13 },
  { id: "wide", label: "Wide", zoom: 10 }
];

export function RunAreaSelector() {
  const runZoom = useSettingsStore((s) => s.runZoom);
  const setRunZoom = useSettingsStore((s) => s.setRunZoom);

  return (
    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
      <span className="uppercase tracking-[0.16em]">Run area</span>
      <div className="inline-flex rounded-full bg-slate-900/80 p-0.5 ring-1 ring-slate-800">
        {PRESETS.map((p) => {
          const active = runZoom === p.zoom;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setRunZoom(p.zoom)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                active
                  ? "bg-app-accentSoft text-cyan-100"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

