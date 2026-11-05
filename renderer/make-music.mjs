import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const SR = 44100;
const DUR = 18;
const N = Math.floor(SR * DUR);

const args = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const preset = arg('--preset', 'pulse');
const outName = arg('--name', preset === 'pulse' ? 'music-pulse' : `music-${preset}`);

const P = preset === 'pulse'
  ? { bpm: 120, kickStep: 0.5, hatStep: 0.25, arpStep: 0.25, bassStep: 0.5, clapStep: 2.0, energy: 1.0 }
  : { bpm: 84, kickStep: 0.714, hatStep: 0.357, arpStep: 0.357, bassStep: 0.714, clapStep: 2.857, energy: 0.55 };

const L = new Float64Array(N);
const R = new Float64Array(N);
let seed = 20261103;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const pan = (p) => {
  const a = (Math.max(-1, Math.min(1, p)) + 1) * Math.PI / 4;
  return [Math.cos(a), Math.sin(a)];
};
const add = (i, v, p = 0) => {
  if (i < 0 || i >= N) return;
  const [gl, gr] = pan(p);
  L[i] += v * gl;
  R[i] += v * gr;
};

const CHORDS = [
  { start: 0.0, dur: 4.5, root: 33, notes: [45, 48, 52, 55] },
  { start: 4.5, dur: 4.5, root: 29, notes: [41, 45, 48, 52] },
  { start: 9.0, dur: 4.5, root: 36, notes: [48, 52, 55, 59] },
  { start: 13.5, dur: 4.5, root: 31, notes: [43, 47, 50, 55] }
];

// Warm pad
for (const ch of CHORDS) {
  ch.notes.forEach((note, ni) => {
    const f = mtof(note);
    const n0 = Math.floor(ch.start * SR);
    const n1 = Math.min(N, Math.floor((ch.start + ch.dur + .6) * SR));
    let p1 = rnd() * Math.PI * 2, p2 = rnd() * Math.PI * 2;
    for (let i = n0; i < n1; i++) {
      const t = (i - n0) / SR;
      const env = Math.min(1, t / .7) * Math.min(1, (ch.dur + .6 - t) / .8);
      p1 += 2 * Math.PI * f / SR;
      p2 += 2 * Math.PI * (f * 1.003) / SR;
      const v = (Math.sin(p1) * .7 + Math.sin(p2) * .3 + .12 * Math.sin(p1 * 2)) * env * .032;
      add(i, v, (ni / Math.max(1, ch.notes.length - 1)) * 1.2 - .6);
    }
  });
}

// Bass pulse + kick
for (const ch of CHORDS) {
  for (let t = ch.start; t < ch.start + ch.dur; t += P.bassStep) {
    const n0 = Math.floor(t * SR);
    const n1 = Math.min(N, Math.floor((t + .42) * SR));
    const f = mtof(ch.root);
    let p = 0;
    for (let i = n0; i < n1; i++) {
      const x = (i - n0) / SR;
      const env = Math.exp(-x * 5.5) * Math.min(1, x / .008);
      p += 2 * Math.PI * f / SR;
      add(i, (Math.sin(p) + .18 * Math.sin(p * 2)) * env * .16, 0);
    }
  }
}
for (let t = 0; t < DUR - .2; t += P.kickStep) {
  const n0 = Math.floor(t * SR);
  const n1 = Math.min(N, Math.floor((t + .4) * SR));
  let p = 0;
  for (let i = n0; i < n1; i++) {
    const x = (i - n0) / SR;
    const f = 44 + 78 * Math.exp(-x * 24);
    p += 2 * Math.PI * f / SR;
    const env = Math.exp(-x * 8.5);
    add(i, (Math.sin(p) * .95 + .06 * noise() * Math.exp(-x * 90)) * env * .34 * P.energy, 0);
  }
}

// Hats
for (let t = 0; t < DUR; t += P.hatStep) {
  const n0 = Math.floor(t * SR);
  const n1 = Math.min(N, Math.floor((t + .06) * SR));
  let hp = 0, prev = 0;
  const p = (Math.round(t / P.hatStep) % 2 === 0) ? .26 : -.26;
  for (let i = n0; i < n1; i++) {
    const x = (i - n0) / SR;
    const n = noise();
    hp = .72 * (hp + n - prev); prev = n;
    add(i, hp * Math.exp(-x * 60) * .05 * P.energy, p);
  }
}

// Clap on 2 and 4
for (let t = 1; t < DUR; t += P.clapStep) {
  const n0 = Math.floor(t * SR);
  const n1 = Math.min(N, Math.floor((t + .18) * SR));
  let bp = 0;
  for (let i = n0; i < n1; i++) {
    const x = (i - n0) / SR;
    const n = noise();
    bp = .18 * n + .82 * bp;
    const env = Math.exp(-x * 20) * (1 - Math.exp(-x * 180));
    add(i, bp * env * .11 * P.energy, 0);
  }
}

// Arpeggio pluck
for (const ch of CHORDS) {
  const arp = [0, 2, 1, 3, 2, 1, 0, 2];
  const count = Math.floor((ch.dur + .2) / P.arpStep);
  for (let k = 0; k < count; k++) {
    const t = ch.start + k * P.arpStep;
    if (t >= DUR - .1) break;
    const note = ch.notes[arp[k % arp.length] % ch.notes.length] + (k % 4 === 0 ? 12 : 12);
    const f = mtof(note);
    const n0 = Math.floor(t * SR);
    const n1 = Math.min(N, Math.floor((t + .5) * SR));
    let p = 0;
    for (let i = n0; i < n1; i++) {
      const x = (i - n0) / SR;
      const env = Math.exp(-x * 7) * (1 - Math.exp(-x * 220));
      p += 2 * Math.PI * f / SR;
      add(i, Math.sin(p + .8 * Math.exp(-x * 8) * Math.sin(p * 2)) * env * .045, k % 2 ? .32 : -.32);
    }
  }
}

// Downlifters between pages
for (const t of [5.0, 11.0]) {
  const n0 = Math.floor(t * SR);
  const n1 = Math.min(N, Math.floor((t + .7) * SR));
  let lp = 0, prev = 0;
  for (let i = n0; i < n1; i++) {
    const x = (i - n0) / SR;
    const n = noise();
    lp = .08 * (lp + n - prev); prev = n;
    const f = 900 * Math.exp(-x * 3.5) + 80;
    const env = Math.sin(Math.PI * Math.min(1, x / .7)) ** 2;
    add(i, lp * env * .09, -.5 + x);
  }
}

// Normalize + fade
let peak = 1e-9;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const gain = .9 / peak;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  let f = 1;
  if (t < .35) f = t / .35;
  if (t > DUR - .9) f = Math.min(f, (DUR - t) / .9);
  f = f * f * (3 - 2 * f);
  L[i] = Math.tanh(L[i] * gain * 1.15) * f;
  R[i] = Math.tanh(R[i] * gain * 1.15) * f;
}

const outDir = path.join(HERE, 'assets');
fs.mkdirSync(outDir, { recursive: true });
const wavPath = path.join(outDir, `${outName}.wav`);
const bytes = 44 + N * 4;
const buf = Buffer.alloc(bytes);
buf.write('RIFF', 0); buf.writeUInt32LE(bytes - 8, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
let o = 44;
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), o); o += 2;
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), o); o += 2;
}
fs.writeFileSync(wavPath, buf);

// Waveform envelope
const FPS = 30;
const frames = Math.round(DUR * FPS);
const win = Math.floor(SR / FPS);
const raw = [];
for (let f = 0; f < frames; f++) {
  let sum = 0;
  const a = f * win, b = Math.min(N, a + win);
  for (let i = a; i < b; i++) sum += L[i] * L[i] + R[i] * R[i];
  raw.push(Math.sqrt(sum / Math.max(1, (b - a) * 2)));
}
const sorted = [...raw].sort((a, b) => a - b);
const p95 = sorted[Math.floor(sorted.length * .95)] || 1;
const env = raw.map(v => Math.pow(Math.min(1, v / p95), .72));
for (let i = 1; i < env.length - 1; i++) env[i] = env[i] * .7 + env[i - 1] * .15 + env[i + 1] * .15;
fs.writeFileSync(path.join(HERE, `waveform-${preset}.js`),
  'window.WAVEFORM=' + JSON.stringify(env.map(v => +v.toFixed(3))) + ';\n');

console.log(JSON.stringify({ preset, bpm: P.bpm, wav: wavPath, duration: DUR }));
