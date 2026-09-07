const BASE = import.meta.env.BASE_URL;
// Volumes are the original setVolume() percentages from the AS2 source.
export const SOUND_SRC = {
  bigRip: [BASE + 'sfx/bigRip.mp3', 0.6],
  midRip: [BASE + 'sfx/midRip.mp3', 0.6],
  lilRip: [BASE + 'sfx/lilRip.mp3', 0.6],
  explosion: [BASE + 'sfx/esplosion.mp3', 1.0],
  shooter: [BASE + 'sfx/shooter.mp3', 0.18],
  thrust: [BASE + 'sfx/thrust.mp3', 0.3],
  enemyLow: [BASE + 'sfx/enemyLow.mp3', 0.5],
  enemyHigh: [BASE + 'sfx/enemyHigh.mp3', 0.5],
  jamHum: [BASE + 'sfx/jamHum.mp3', 0.3],
  scoHum: [BASE + 'sfx/scoHum.mp3', 0.5],
} as const;

export type SoundKey = keyof typeof SOUND_SRC;

interface Loop {
  source: AudioBufferSourceNode;
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundKey, AudioBuffer>();
  private loops = new Map<SoundKey, Loop>();
  private _muted = localStorage.getItem('paperAsteroids.muted') === '1';

  get muted(): boolean {
    return this._muted;
  }

  /** Must be called from a user gesture so the browser allows playback. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this._muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    void this.loadAll();
  }

  private async loadAll(): Promise<void> {
    const ctx = this.ctx!;
    await Promise.all(
      (Object.entries(SOUND_SRC) as [SoundKey, readonly [string, number]][]).map(async ([key, [src]]) => {
        const res = await fetch(src);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(key, buf);
      }),
    );
  }

  toggleMute(): void {
    this._muted = !this._muted;
    localStorage.setItem('paperAsteroids.muted', this._muted ? '1' : '0');
    if (this.master) this.master.gain.value = this._muted ? 0 : 1;
  }

  play(key: SoundKey): void {
    const buf = this.buffers.get(key);
    if (!buf || !this.ctx || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = SOUND_SRC[key][1];
    src.connect(gain).connect(this.master);
    src.start();
  }

  loop(key: SoundKey): void {
    if (this.loops.has(key)) return;
    const buf = this.buffers.get(key);
    if (!buf || !this.ctx || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = SOUND_SRC[key][1];
    src.connect(gain).connect(this.master);
    src.start();
    this.loops.set(key, { source: src });
  }

  stop(key: SoundKey): void {
    const l = this.loops.get(key);
    if (!l) return;
    l.source.stop();
    this.loops.delete(key);
  }

  stopAllLoops(): void {
    for (const key of [...this.loops.keys()]) this.stop(key);
  }
}
