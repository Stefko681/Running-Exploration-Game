import { useState } from "react";
import { Check, X, Shield, Info } from "lucide-react";
import { useLeaderboardStore } from "../state/useLeaderboardStore";
import { BADGE_DEFINITIONS, COMBAT_STYLES } from "../utils/badges";

type Props = {
    onClose: () => void;
};

export function IdentityEditor({ onClose }: Props) {
    const { combatStyle, badges, updateProfile, username } = useLeaderboardStore();

    const [selectedStyle, setSelectedStyle] = useState(combatStyle || "Balanced");
    const [selectedBadges, setSelectedBadges] = useState<string[]>(badges || []);
    const [selectedUsername, setSelectedUsername] = useState(username !== "Guest" && username !== "Operator" ? username : "");

    const toggleBadge = (id: string) => {
        if (selectedBadges.includes(id)) {
            setSelectedBadges(selectedBadges.filter(b => b !== id));
        } else {
            if (selectedBadges.length < 3) {
                setSelectedBadges([...selectedBadges, id]);
            }
        }
    };

    const handleSave = async () => {
        // Enforce 3 char minimum for username if set, else keep old or default
        const finalUsername = selectedUsername.trim().length >= 3 ? selectedUsername.trim() : undefined;
        await updateProfile(selectedStyle, selectedBadges, finalUsername);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-white/5 bg-slate-800/50 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield size={18} className="text-cyan-400" />
                        Edit Identity
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Scroll */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Username Input */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Operator Name</label>
                        <input
                            type="text"
                            value={selectedUsername}
                            onChange={(e) => setSelectedUsername(e.target.value)}
                            placeholder="Enter callsign..."
                            maxLength={16}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold tracking-wide focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 placeholder:text-slate-700 uppercase"
                        />
                        <div className="mt-1 text-[10px] text-slate-600 flex justify-between">
                            <span>{selectedUsername.length}/16 chars</span>
                            {selectedUsername.length > 0 && selectedUsername.length < 3 && <span className="text-rose-500">Min 3 chars</span>}
                        </div>
                    </div>

                    {/* Combat Style */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Combat Style</label>
                        <div className="grid grid-cols-2 gap-2">
                            {COMBAT_STYLES.map(style => (
                                <button
                                    key={style}
                                    onClick={() => setSelectedStyle(style)}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold text-left transition-all border ${selectedStyle === style
                                        ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-900/20"
                                        : "bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700"
                                        }`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Badges */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Badges ({selectedBadges.length}/3)</label>
                            {selectedBadges.length === 3 && <span className="text-[10px] text-orange-400 font-bold">Max Reached</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {BADGE_DEFINITIONS.map(badge => {
                                const isSelected = selectedBadges.includes(badge.id);
                                const isDisabled = !isSelected && selectedBadges.length >= 3;

                                return (
                                    <button
                                        key={badge.id}
                                        onClick={() => !isDisabled && toggleBadge(badge.id)}
                                        disabled={isDisabled}
                                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isSelected
                                            ? `bg-slate-800 ${badge.color.replace('text-', 'border-')} ring-1 ring-white/20`
                                            : isDisabled ? "opacity-30 grayscale cursor-not-allowed border-transparent" : "bg-slate-800/50 border-transparent hover:bg-slate-800"
                                            }`}
                                    >
                                        <div className={`p-1.5 rounded-md ${badge.bg} ${badge.color}`}>
                                            <badge.icon size={14} />
                                        </div>
                                        <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-400"}`}>
                                            {badge.label}
                                        </span>
                                        {isSelected && <Check size={14} className="ml-auto text-emerald-400" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg flex gap-3 items-start">
                        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-200">
                            These settings customize how you appear to other players on the Global Leaderboard.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-800/50">
                    <button
                        onClick={handleSave}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
