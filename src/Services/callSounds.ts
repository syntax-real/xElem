let callCtx: AudioContext | null = null;
let callPlaying = false;
let callTimeout: ReturnType<typeof setTimeout> | null = null;

function playBeep(ctx: AudioContext) {
    if (!callPlaying) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.setValueAtTime(0.3, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 600;
    gain2.gain.setValueAtTime(0, now + 0.5);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.55);
    gain2.gain.setValueAtTime(0.3, now + 0.8);
    gain2.gain.linearRampToValueAtTime(0, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.5);
    osc2.stop(now + 0.9);

    callTimeout = setTimeout(() => { if (callPlaying) playBeep(ctx); }, 2000);
}

export function playCallRingtone() {
    try {
        stopCallRingtone();
        const ctx = new AudioContext();
        callCtx = ctx;
        callPlaying = true;
        ctx.resume().then(() => playBeep(ctx));
    } catch {
    }
}

export function stopCallRingtone() {
    try {
        callPlaying = false;
        if (callTimeout) { clearTimeout(callTimeout); callTimeout = null; }
        if (callCtx) { callCtx.close().catch(() => {}); callCtx = null; }
    } catch {
        // silent fail
    }
}

let dialCtx: AudioContext | null = null;
let dialPlaying = false;
let dialTimeout: ReturnType<typeof setTimeout> | null = null;

function playRingback(ctx: AudioContext) {
    if (!dialPlaying) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 425;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.setValueAtTime(0.15, now + 0.9);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);

    dialTimeout = setTimeout(() => { if (dialPlaying) playRingback(ctx); }, 4000);
}

export function playDialTone() {
    try {
        stopDialTone();
        const ctx = new AudioContext();
        dialCtx = ctx;
        dialPlaying = true;
        ctx.resume().then(() => playRingback(ctx));
    } catch {
    }
}

export function stopDialTone() {
    try {
        dialPlaying = false;
        if (dialTimeout) { clearTimeout(dialTimeout); dialTimeout = null; }
        if (dialCtx) { dialCtx.close().catch(() => {}); dialCtx = null; }
    } catch {
    }
}

export function playUnavailableSound(): Promise<void> {
    return new Promise((resolve) => {
        try {
            const ctx = new AudioContext();
            const now = ctx.currentTime;

            [0, 0.4, 0.8].forEach((delay, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 480 - i * 40;
                gain.gain.setValueAtTime(0.2, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.3);
            });

            setTimeout(() => { ctx.close().catch(() => {}); resolve(); }, 1500);
        } catch {
            resolve();
        }
    });
}
