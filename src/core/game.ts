import { AudioSystem } from './audio';
import type { Images } from './assets';
import { TICK_MS } from './constants';
import { Input } from './input';
import { Renderer } from './renderer';
import { HighScores } from './highscores';

export interface Scene {
  enter(): void;
  exit(): void;
  /** Fixed-step update at TICK_RATE. */
  update(): void;
  /** `alpha` is the interpolation fraction into the next tick (unused by design: 45Hz is smooth enough). */
  draw(): void;
}

export class Game {
  readonly renderer: Renderer;
  readonly input = new Input();
  readonly audio = new AudioSystem();
  readonly scores = new HighScores();
  private scene: Scene | null = null;
  private acc = 0;
  private last = 0;

  constructor(
    canvas: HTMLCanvasElement,
    readonly images: Images,
  ) {
    this.renderer = new Renderer(canvas);
    // Any first interaction unlocks audio.
    const unlock = () => this.audio.unlock();
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
  }

  setScene(next: Scene): void {
    this.scene?.exit();
    this.scene = next;
    next.enter();
  }

  start(): void {
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    // Cap so a backgrounded tab doesn't fast-forward the simulation.
    this.acc += Math.min(now - this.last, 250);
    this.last = now;
    while (this.acc >= TICK_MS) {
      if (this.input.justPressed('mute')) this.audio.toggleMute();
      this.scene?.update();
      this.input.flush();
      this.acc -= TICK_MS;
    }
    this.renderer.begin();
    this.scene?.draw();
    requestAnimationFrame(this.frame);
  };
}
