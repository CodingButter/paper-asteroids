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

  enter(): void {
    this.g.input.setTextMode(this.entering);
    this.g.renderer.canvas.onclick = () => {
      if (!this.entering) this.restart();
    };
  }

  exit(): void {
    this.g.input.setTextMode(false);
    this.g.renderer.canvas.onclick = null;
  }

  private restart(): void {
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
      drawHint(r, 'Type up to 5 letters, then press ENTER');
    } else {
      drawHighScores(r, g.scores, cx, panelY);
      if (!g.scores.entries.some((e) => e.score === this.score)) {
        r.text('TRY HARDER!', cx, panelY - 45, 32, { shadow: true });
      }
      drawHint(r, 'SPACE / ENTER / click to play again');
    }
  }
}
