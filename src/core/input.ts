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

export class Input {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
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
      const a = BINDINGS[e.code];
      if (!a) return;
      e.preventDefault();
      if (!this.down.has(a)) this.pressed.add(a);
      this.down.add(a);
    });
    target.addEventListener('keyup', (e) => {
      const a = BINDINGS[e.code];
      if (a) this.down.delete(a);
    });
    target.addEventListener('blur', () => this.down.clear());
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
