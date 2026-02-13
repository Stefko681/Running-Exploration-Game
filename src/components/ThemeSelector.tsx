import { ThemeId, useThemeStore } from "../state/useThemeStore";

const THEMES: { id: ThemeId; label: string; color: string }[] = [
    { id: "cyberpunk", label: "Cyberpunk", color: "#22d3ee" },
    { id: "matrix", label: "Matrix", color: "#22c55e" },
    { id: "vaporwave", label: "Vaporwave", color: "#f472b6" },
    { id: "daylight", label: "Daylight", color: "#2563eb" },
];

export function ThemeSelector() {
    const currentTheme = useThemeStore((s) => s.theme);
    const setTheme = useThemeStore((s) => s.setTheme);

    return (
        <div className="mt-4 border-t border-slate-800/50 pt-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Visual Theme
            </div>
            <div className="grid grid-cols-4 gap-2">
                {THEMES.map((t) => {
                    const active = currentTheme === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 py-2 transition-all ${active
                                ? "ring-2 ring-app-accent ring-offset-1 ring-offset-slate-950"
                                : "hover:bg-slate-800"
                                }`}
                        >
                            <div
                                className="h-3 w-3 rounded-full shadow-[0_0_8px_currentColor]"
                                style={{ backgroundColor: t.color, color: t.color }}
                            />
                            <span
                                className={`text-[10px] font-medium uppercase tracking-wider ${active ? "text-slate-100" : "text-slate-400"
                                    }`}
                            >
                                {t.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
