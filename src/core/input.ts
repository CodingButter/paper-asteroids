export type Action = 'left' | 'right' | 'thrust' | 'fire' | 'pause' | 'confirm' | 'mute' | 'quit';

const BINDINGS: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'thrust',
  KeyW: 'thrust',
  Space: 'fire',
  Escape: 'pause',
  KeyP: 'pause',
  KeyQ: 'quit',
  Enter: 'confirm',
  KeyM: 'mute',
};

/** Analog turn (-1 left .. 1 right) + throttle (0..1) from the touch thumbstick. */
export interface Stick {
  turn: number;
  throttle: number;
}

export class Input {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  /** Set by the touch layer while a finger is on the thumbstick; null otherwise. */
  stick: Stick | null = null;
  /** Raw text typed this tick (for the high score name entry). */
  typed = '';
  backspace = false;
  private textMode = false;

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (this.textMode) {
        if (e.key === 'Backspace') {
          this.backspace = true;
          e.preventDefault();
          return;
        }
        if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key)) {
          this.typed += e.key.toUpperCase();
          e.preventDefault();
          return;
        }
      }
      // Virtual keyboards often report an empty e.code; fall back to e.key for Enter.
      const a = BINDINGS[e.code] ?? (e.key === 'Enter' ? 'confirm' : undefined);
      if (!a) return;
      e.preventDefault();
      this.press(a);
    });
    target.addEventListener('keyup', (e) => {
      const a = BINDINGS[e.code] ?? (e.key === 'Enter' ? 'confirm' : undefined);
      if (a) this.release(a);
    });
    target.addEventListener('blur', () => this.down.clear());
  }

  /** Programmatic press (touch layer). */
  press(a: Action): void {
    if (!this.down.has(a)) this.pressed.add(a);
    this.down.add(a);
  }

  release(a: Action): void {
    this.down.delete(a);
  }

  setTextMode(on: boolean): void {
    this.textMode = on;
    this.typed = '';
    this.backspace = false;
  }

  isDown(a: Action): boolean {
    return this.down.has(a);
  }

  /** True only on the tick the key went down. */
  justPressed(a: Action): boolean {
    return this.pressed.has(a);
  }

  /** Call at the end of every tick. */
  flush(): void {
    this.pressed.clear();
    this.typed = '';
    this.backspace = false;
  }
}
