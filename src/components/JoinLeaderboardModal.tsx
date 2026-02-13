import { useState } from "react";
import { User, Shield, CheckCircle2, X } from "lucide-react";

interface JoinLeaderboardModalProps {
    onJoin: (username: string) => void;
    onClose: () => void;
}

export function JoinLeaderboardModal({ onJoin, onClose }: JoinLeaderboardModalProps) {
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length < 3) {
            setError("Operator name must be at least 3 characters.");
            return;
        }
        if (trimmed.length > 20) {
            setError("Operator name must be under 20 characters.");
            return;
        }
        onJoin(trimmed);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl overflow-hidden">
                {/* Decoration */}
                <div className="absolute -right-8 -top-8 text-white/5 rotate-12">
                    <Shield size={160} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                <User size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-white">Join the Elite</h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">
                        Enter your unique Operator Designation to register your progress on the global leaderboard.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                Operator Name
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (error) setError("");
                                }}
                                placeholder="e.g. GhostRunner_01"
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold"
                            />
                            {error && (
                                <p className="mt-2 text-xs text-rose-500 font-medium animate-in slide-in-from-top-1">
                                    {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            Initialize Profile
                        </button>

                        <p className="text-[10px] text-center text-slate-600 font-mono uppercase tracking-tighter mt-4">
                            Securing encrypted transmission...
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
