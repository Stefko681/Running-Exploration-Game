import { useState, useRef, useEffect } from "react";
import { ThemeId, useThemeStore } from "../state/useThemeStore";
import { ChevronDown, Check, Palette } from "lucide-react";

const THEMES: { id: ThemeId; label: string; color: string }[] = [
    { id: "cyberpunk", label: "Cyberpunk", color: "#22d3ee" },
    { id: "matrix", label: "Matrix", color: "#22c55e" },
    { id: "vaporwave", label: "Vaporwave", color: "#f472b6" },
    { id: "daylight", label: "Daylight", color: "#2563eb" },
];

export function ThemeSelector() {
    const currentTheme = useThemeStore((s) => s.theme);
    const setTheme = useThemeStore((s) => s.setTheme);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const activeTheme = THEMES.find(t => t.id === currentTheme) || THEMES[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 transition-all active:scale-95"
            >
                <div
                    className="h-3 w-3 rounded-full shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: activeTheme.color, color: activeTheme.color }}
                />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider hidden sm:inline">
                    {activeTheme.label}
                </span>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider sm:hidden">
                    Theme
                </span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 bg-slate-950/50 border-b border-white/5 text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                        <Palette size={12} />
                        Select Visual Theme
                    </div>
                    <div className="p-1">
                        {THEMES.map((t) => {
                            const active = currentTheme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setTheme(t.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${active
                                        ? "bg-slate-800 text-white"
                                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                                        }`}
                                >
                                    <div
                                        className="h-2.5 w-2.5 rounded-full shadow-[0_0_5px_currentColor]"
                                        style={{ backgroundColor: t.color, color: t.color }}
                                    />
                                    <span className="flex-1 text-xs font-bold uppercase tracking-wider">
                                        {t.label}
                                    </span>
                                    {active && <Check size={14} className="text-cyan-400" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
