import { STAGE_H, STAGE_W } from '../core/constants';
import type { Game, Scene } from '../core/game';
import { MAX_NAME } from '../core/highscores';
import { PlayScene } from './play';
import { drawBackground, drawButton, drawHighScores, drawHint, drawTitle } from './ui';

/**
 * Game over. If the score makes the board, the player types a 5-letter name
 * (the original capped it at 5 too) and hits Enter; otherwise "TRY HARDER!".
 */
export class GameOverScene implements Scene {
  private t = 0;
  private name = '';
  private entering: boolean;

  constructor(
    private g: Game,
    private score: number,
  ) {
    this.entering = g.scores.qualifies(score);
  }

  private done = false;
  /** Off-screen text field so phones can summon a keyboard for the name. */
  private field: HTMLInputElement | null = null;

  enter(): void {
    this.g.input.setTextMode(this.entering);
    if (this.entering) {
      const f = document.createElement('input');
      f.maxLength = MAX_NAME;
      f.autocapitalize = 'characters';
      f.autocomplete = 'off';
      f.enterKeyHint = 'done';
      // 16px: anything smaller makes iOS zoom the page when the field takes focus.
      f.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;font-size:16px;';
      // Virtual keyboards don't give usable keydown events; read the value instead.
      f.addEventListener('input', () => {
        this.name = f.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, MAX_NAME);
      });
      document.body.appendChild(f);
      this.field = f;
    }
    this.g.renderer.canvas.onclick = () => {
      if (this.entering) this.field?.focus();
      else this.restart();
    };
  }

  exit(): void {
    this.g.input.setTextMode(false);
    this.g.renderer.canvas.onclick = null;
    this.field?.remove();
    this.field = null;
  }

  private restart(): void {
    if (this.done) return;
    this.done = true;
    this.g.setScene(new PlayScene(this.g));
  }

  update(): void {
    const input = this.g.input;
    this.t++;
    if (this.entering) {
      if (input.backspace) this.name = this.name.slice(0, -1);
      if (input.typed) this.name = (this.name + input.typed).slice(0, MAX_NAME);
      if (input.justPressed('confirm')) {
        this.g.scores.add(this.name.trim() || '?????', this.score);
        this.entering = false;
        input.setTextMode(false);
        this.field?.blur();
      }
      return;
    }
    if (input.justPressed('fire') || input.justPressed('confirm')) this.restart();
  }

  draw(): void {
    const g = this.g;
    const r = g.renderer;
    const cx = STAGE_W / 2;
    drawBackground(g);
    drawTitle(r, cx, 135, false);

    r.text(`Score ${this.score}`, cx, STAGE_H / 2 - 105, 60, { shadow: true });
    drawButton(r, 'PLAY AGAIN', cx, STAGE_H / 2 - 25, this.t);

    const panelY = STAGE_H / 1.6;
    if (this.entering) {
      r.paperStrip(cx, panelY + 30, 300, 130, 3);
      r.text('NEW HIGH SCORE!', cx, panelY - 15, 24, { color: '#000' });
      r.text('Enter your name', cx, panelY + 15, 21, { color: '#000' });
      const cursor = (this.t >> 4) % 2 ? '_' : ' ';
      r.text(this.name + cursor, cx, panelY + 55, 32, { color: '#ff0000' });
      drawHint(r, document.body.classList.contains('touch') ? 'Tap the card to type your name, then press Done' : 'Type up to 5 letters, then press ENTER');
    } else {
      drawHighScores(r, g.scores, cx, panelY);
      if (!g.scores.entries.some((e) => e.score === this.score)) {
        r.text('TRY HARDER!', cx, panelY - 45, 32, { shadow: true });
      }
      drawHint(r, document.body.classList.contains('touch') ? 'Tap to play again' : 'SPACE / ENTER / click to play again');
    }
  }
}
