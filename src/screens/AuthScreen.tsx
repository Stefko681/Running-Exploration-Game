import { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../services/supabase";
import { useLeaderboardStore } from "../state/useLeaderboardStore";
import { X } from "lucide-react";

type AuthScreenProps = {
    onClose: () => void;
};

export function AuthScreen({ onClose }: AuthScreenProps) {
    const { session } = useLeaderboardStore();

    // Close if session is established
    useEffect(() => {
        if (session) {
            onClose();
        }
    }, [session, onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                {/* Header */}
                <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        🔐 Operator Login
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="mb-6 text-sm text-slate-400">
                        Sign in to sync your progress, climb the leaderboard, and secure your operator profile.
                    </p>

                    <Auth
                        supabaseClient={supabase}
                        appearance={{
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#22d3ee', // Cyan-400
                                        brandAccent: '#06b6d4', // Cyan-500
                                        inputText: 'white',
                                        inputBackground: '#1e293b', // Slate-800
                                        inputBorder: '#334155', // Slate-700
                                        messageText: '#94a3b8',
                                        anchorTextColor: '#22d3ee',
                                    },
                                },
                            },
                            className: {
                                container: 'font-sans',
                                button: 'rounded-xl',
                                input: 'rounded-xl',
                            }
                        }}
                        providers={['google']}
                        theme="dark"
                        showLinks={true}
                        magicLink={true}
                        redirectTo={window.location.origin}
                    />

                    <div className="mt-6 border-t border-slate-800 pt-4 text-center">
                        <button
                            onClick={onClose}
                            className="text-xs text-slate-500 hover:text-slate-300 underline"
                        >
                            Continue as Guest (No Cloud Save)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
