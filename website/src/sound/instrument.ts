/**
 * The lattice as an instrument. Six arms, six strings: each pluck plays a note of a D major
 * pentatonic scale. No audio files — every note is synthesised here with Karplus–Strong (a
 * delay line fed with noise and gently low-passed, which is how a plucked string decays),
 * encoded as a tiny WAV and handed to Howler, which handles playback, pooling and the browser's
 * autoplay unlock.
 *
 * Sound is opt-in and remembered (soundCues from @snowbros/adapters): nothing is synthesised,
 * downloaded or played until the visitor turns it on. The page is complete without it.
 */
import { soundCues } from '@snowbros/adapters';
import type { Scope } from '@snowbros/core';

const RATE = 22050;
// D4 E4 F#4 A4 B4 D5 — any combination sounds consonant, so strums never clash.
const NOTES = [293.66, 329.63, 369.99, 440, 493.88, 587.33];
type Cue = `arm${0 | 1 | 2 | 3 | 4 | 5}`;

/** Karplus–Strong pluck: a seeded noise burst circulating through an averaging delay line. */
function pluckSamples(freq: number, seconds: number, seed: number): Float32Array {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  const period = Math.max(2, Math.round(RATE / freq));
  const line = new Float32Array(period);
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s / 2147483647) * 2 - 1;
  };
  // A softer excitation (two-tap averaged noise) sounds like a fingertip, not a pick.
  let prev = 0;
  for (let i = 0; i < period; i++) {
    const r = rand();
    line[i] = (r + prev) * 0.5;
    prev = r;
  }
  const decay = 0.996;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const next = (idx + 1) % period;
    const v = line[idx]!;
    out[i] = v;
    line[idx] = decay * 0.5 * (v + line[next]!);
    idx = next;
  }
  // Short attack ramp (no click) and a release fade at the tail.
  const attack = Math.floor(RATE * 0.004);
  const release = Math.floor(RATE * 0.25);
  for (let i = 0; i < attack; i++) out[i]! *= i / attack;
  for (let i = 0; i < release; i++) out[n - 1 - i]! *= i / release;
  return out;
}

function wavUrl(samples: Float32Array): string {
  const bytes = 44 + samples.length * 2;
  const buf = new ArrayBuffer(bytes);
  const v = new DataView(buf);
  const str = (o: number, t: string) => {
    for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, bytes - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  let peak = 0;
  for (const x of samples) peak = Math.max(peak, Math.abs(x));
  const gain = peak > 0 ? 0.8 / peak : 0;
  for (let i = 0; i < samples.length; i++)
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i]! * gain)) * 0x7fff, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export interface Instrument {
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
  pluck(arm: number, strength: number): void;
  subscribe(cb: (on: boolean) => void): () => void;
}

/**
 * Creates the instrument. Howler is imported and notes are synthesised only once sound is first
 * enabled, so visitors who never turn sound on pay nothing.
 */
export function createInstrument(scope: Scope): Instrument {
  type Howl = import('howler').Howl;
  let howls: Record<Cue, Howl> | null = null;
  let cues: ReturnType<typeof soundCues<Cue>> | null = null;
  const urls: string[] = [];
  const listeners = new Set<(on: boolean) => void>();
  let wanted = false;
  try {
    wanted = localStorage.getItem('sb-sound') === 'on';
  } catch {
    // storage blocked: stay silent
  }

  const load = async () => {
    if (cues) return cues;
    const { Howl } = await import('howler');
    const entries = NOTES.map((f, i) => {
      const url = wavUrl(pluckSamples(f, 1.6, 11 + i * 7));
      urls.push(url);
      return [`arm${i}`, new Howl({ src: [url], format: ['wav'], volume: 0.5, pool: 4 })] as const;
    });
    howls = Object.fromEntries(entries) as Record<Cue, Howl>;
    cues = soundCues(howls, { defaultOn: false, throttle: 45 });
    scope.add(cues);
    scope.add(() => {
      if (howls) for (const h of Object.values(howls)) h.unload();
      for (const u of urls) URL.revokeObjectURL(u);
    });
    return cues;
  };
  if (wanted) void load();

  return {
    get enabled() {
      return cues?.enabled ?? wanted;
    },
    setEnabled(on) {
      wanted = on;
      if (on)
        void load().then((c) => {
          c.setEnabled(true);
          // Confirm with a soft chord so turning sound on is itself audible feedback.
          for (const [i, delay] of [
            [0, 0],
            [2, 70],
            [4, 140],
          ] as const)
            setTimeout(() => this.pluck(i, 0.5), delay);
        });
      else cues?.setEnabled(false);
      for (const l of listeners) l(on);
    },
    pluck(arm, strength) {
      if (!cues?.enabled || !howls) return;
      const cue = `arm${((arm % 6) + 6) % 6}` as Cue;
      howls[cue].volume(0.18 + strength * 0.5);
      cues.play(cue);
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
