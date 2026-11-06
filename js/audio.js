// Soft, synthesised sounds (Web Audio). Nothing is loaded from the network.
let ctx, master;
let settings = { volume: 0.6, sTick: true, sMeow: true, sPurr: true, sChime: true, haptics: true };

export function configure(s) {
  settings = s;
  if (master) master.gain.value = s.volume;
}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    // gentle low-pass + compressor keeps everything soft
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 6000;
    const comp = ctx.createDynamicsCompressor();
    master.connect(lp).connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export const unlock = () => ac();

function noiseBuffer(c, secs = 1, brown = false) {
  const b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}

function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

export function haptic(ms = 12) {
  if (settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* ignore */ } }
}

// Tactile "tock + pop": a soft wooden click, a low thump and a tiny bubble.
export function tick() {
  haptic(12);
  if (!settings.sTick) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.005;
  const v = 1 + (Math.random() - 0.5) * 0.12; // slight pitch variation

  const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 0.08);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200 * v; bp.Q.value = 2.5;
  const ng = c.createGain(); env(ng, t, 0.002, 0.35, 0.035);
  n.connect(bp).connect(ng).connect(master); n.start(t); n.stop(t + 0.08);

  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(190 * v, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.09);
  const og = c.createGain(); env(og, t, 0.003, 0.5, 0.09);
  o.connect(og).connect(master); o.start(t); o.stop(t + 0.12);

  const p = c.createOscillator(); p.type = 'sine';
  p.frequency.setValueAtTime(700 * v, t + 0.02); p.frequency.exponentialRampToValueAtTime(1300 * v, t + 0.06);
  const pg = c.createGain(); env(pg, t + 0.02, 0.004, 0.12, 0.05);
  p.connect(pg).connect(master); p.start(t + 0.02); p.stop(t + 0.1);
}

// Soft little "mrrp-meow": a voiced source through moving formants.
export function meow() {
  if (!settings.sMeow) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.01;
  const dur = 0.42;
  const base = 520 + Math.random() * 80;
  const o = c.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(base * 0.85, t);
  o.frequency.linearRampToValueAtTime(base * 1.25, t + dur * 0.35);
  o.frequency.linearRampToValueAtTime(base * 0.8, t + dur);
  const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6;
  f1.frequency.setValueAtTime(700, t); f1.frequency.linearRampToValueAtTime(1500, t + dur * 0.4); f1.frequency.linearRampToValueAtTime(800, t + dur);
  const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 8;
  f2.frequency.setValueAtTime(1800, t); f2.frequency.linearRampToValueAtTime(2600, t + dur * 0.4); f2.frequency.linearRampToValueAtTime(1500, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
  g.gain.setValueAtTime(0.5, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
  o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

// Tiny "hup!" as the cat burps out a star.
export function burp() {
  if (!settings.sMeow) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.01;
  const o = c.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.12);
  const g = c.createGain(); env(g, t, 0.01, 0.35, 0.12);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + 0.18);
  sparkle(t + 0.1, 0.06);
}

function sparkle(t, vol = 0.08) {
  const c = ctx;
  [2093, 2637, 3136].forEach((f, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = c.createGain(); env(g, t + i * 0.05, 0.005, vol, 0.25);
    o.connect(g).connect(master); o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.3);
  });
}

// Big-star chime: a warm major arpeggio with long tails.
export function chime() {
  haptic(30);
  if (!settings.sChime) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.02;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    ['sine', 'triangle'].forEach((type, j) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f * (j ? 2 : 1);
      const g = c.createGain(); env(g, t + i * 0.11, 0.01, j ? 0.04 : 0.18, 1.2);
      o.connect(g).connect(master); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 1.4);
    });
  });
  sparkle(t + 0.5, 0.05);
}

// Purr: brown noise, low-passed and amplitude-modulated ~24 Hz.
let purrNodes = null;
export function purrStart() {
  if (!settings.sPurr || purrNodes) return;
  const c = ac(); if (!c) return;
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 2, true); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  const am = c.createGain(); am.gain.value = 0.5;
  const lfo = c.createOscillator(); lfo.frequency.value = 24;
  const lfoG = c.createGain(); lfoG.gain.value = 0.5;
  lfo.connect(lfoG).connect(am.gain);
  const out = c.createGain(); out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.exponentialRampToValueAtTime(0.9, c.currentTime + 0.35);
  src.connect(lp).connect(am).connect(out).connect(master);
  src.start(); lfo.start();
  purrNodes = { src, lfo, out };
}
export function purrStop() {
  if (!purrNodes) return;
  const { src, lfo, out } = purrNodes; purrNodes = null;
  const t = ctx.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value, t);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  src.stop(t + 0.55); lfo.stop(t + 0.55);
}

export function softTap() {
  haptic(6);
  if (!settings.sTick) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.005;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.05);
  const g = c.createGain(); env(g, t, 0.003, 0.12, 0.05);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.08);
}

// Soft "swoosh" as a ticked step folds away.
export function whoosh() {
  if (!settings.sTick) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.01;
  const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 0.4);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(400, t + 0.3);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  n.connect(bp).connect(g).connect(master); n.start(t); n.stop(t + 0.4);
}
