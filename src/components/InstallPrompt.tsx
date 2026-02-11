import { Download, X } from "lucide-react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { useState } from "react";

export function InstallPrompt() {
    const { deferredPrompt, promptInstall } = useInstallPrompt();
    const [dismissed, setDismissed] = useState(false);

    if (!deferredPrompt || dismissed) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="mx-auto max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                        <Download size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-100">Install App</h3>
                        <p className="mt-1 text-xs text-slate-400">
                            Install CityQuest for a better fullscreen experience and offline access.
                        </p>
                        <div className="mt-3 flex gap-3">
                            <button
                                onClick={promptInstall}
                                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-cyan-950 transition-transform active:scale-95"
                            >
                                Install Now
                            </button>
                            <button
                                onClick={() => setDismissed(true)}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/5"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="-mr-1 -mt-1 rounded-full p-2 text-slate-500 hover:bg-white/5"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
