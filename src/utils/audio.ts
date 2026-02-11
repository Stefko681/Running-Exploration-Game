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
    }
};
