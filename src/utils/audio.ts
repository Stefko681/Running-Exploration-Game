// Simple oscillator-based synth for sci-fi UI sounds
// No external assets required!

const AudioContextClass =
    (window.AudioContext || (window as any).webkitAudioContext);

let ctx: AudioContext | null = null;
let enabled = false;

// Initialize on first user interaction
export function initAudio() {
    if (enabled) return;
    try {
        ctx = new AudioContextClass();
        enabled = true;
    } catch (e) {
        console.error("Audio init failed", e);
    }
}

function playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!ctx || !enabled) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
}

export const audio = {
    startRun: () => {
        initAudio();
        // Power up sound: Low to High
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    },

    stopRun: () => {
        initAudio();
        // Power down: High to Low
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    },

    unlock: () => {
        // High-pitched "bing"
        playTone(1200, "sine", 0.15, 0.05);
    },

    click: () => {
        // Soft click
        playTone(800, "sine", 0.05, 0.02);
    },

    levelUp: () => {
        // Success chord
        if (!ctx) initAudio();
        setTimeout(() => playTone(440, "sine", 0.1), 0);
        setTimeout(() => playTone(554, "sine", 0.1), 100);
        setTimeout(() => playTone(659, "sine", 0.4), 200);
    },

    // --- Background GPS Keep-Alive ---
    // Plays a silent audio file in a loop to keep the iOS Safari process active
    startBackgroundLoop: () => {
        if (backgroundAudio) return;
        try {
            backgroundAudio = new Audio(SILENT_MP3);
            backgroundAudio.loop = true;
            backgroundAudio.volume = 0.01; // Non-zero volume is required for iOS
            backgroundAudio.play().catch(e => console.warn("Background audio blocked", e));
        } catch (e) {
            console.error("Failed to start background audio", e);
        }
    },

    stopBackgroundLoop: () => {
        if (backgroundAudio) {
            backgroundAudio.pause();
            backgroundAudio.currentTime = 0;
            backgroundAudio = null;
        }
    }
};

// 1-second of silence (MP3)
const SILENT_MP3 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP7AAAAAAAAAAAAF//OEAAAAAAALgAAAAAAAC7gAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAA0AAAAuAAAAAAAAu4AAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAAZAAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QACkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAA5AAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAEkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEABZAAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAGkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAB5AAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAIkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEACZAAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAKkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAC5AAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAMkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEADZAAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAOoAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAD5AAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAQkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAEZAAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QASkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAE5AAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAUkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAFZAAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAWkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAF5AAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAYkAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAGZAAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAakAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAG5AAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAcHAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAHZAAAAuAAAAAAAALuAAAAAAAIB/5H///4T/5L///+s1gAAAAAAAAD/84QAekAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAHpAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA//OEAHpAAAAuAAAAAAAALuAAAAAAAgH/kf///+E/+S////rNYAAAAAAAAA";

let backgroundAudio: HTMLAudioElement | null = null;
