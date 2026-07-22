// Tiny WebAudio SFX engine — no asset files, all synthesized. Lazily created
// on first use (browsers require a user gesture before audio can start).

type SfxName = "select" | "place" | "clear" | "combo" | "win" | "lose" | "error" | "power";

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setAudioEnabled(v: boolean): void {
  enabled = v;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

export function play(name: SfxName, combo = 1): void {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  switch (name) {
    case "select":
      tone(520, 0, 0.08, "sine", 0.12);
      break;
    case "place":
      tone(360, 0, 0.09, "triangle", 0.12);
      break;
    case "clear": {
      const base = 540 + Math.min(6, combo) * 60;
      tone(base, 0, 0.12, "triangle", 0.18);
      tone(base * 1.25, 0.06, 0.14, "sine", 0.14);
      tone(base * 1.5, 0.12, 0.16, "sine", 0.12);
      break;
    }
    case "combo":
      tone(700 + Math.min(6, combo) * 80, 0, 0.16, "square", 0.1);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.28, "triangle", 0.16));
      break;
    case "lose":
      [400, 320, 240].forEach((f, i) => tone(f, i * 0.14, 0.3, "sawtooth", 0.12));
      break;
    case "error":
      tone(180, 0, 0.14, "sawtooth", 0.1);
      break;
    case "power":
      tone(660, 0, 0.1, "sine", 0.14);
      tone(990, 0.08, 0.14, "sine", 0.12);
      break;
  }
}

export function vibrate(ms: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}
