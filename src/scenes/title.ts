import { STAGE_H, STAGE_W } from '../core/constants';
import type { Game, Scene } from '../core/game';
import { spawnField, type Asteroid } from '../entities/asteroid';
import { PlayScene } from './play';
import { drawBackButton, drawBackground, drawButton, drawHighScores, drawHint, drawTitle, inBackButton } from './ui';

export class TitleScene implements Scene {
  private rocks: Asteroid[] = [];
  private t = 0;

  constructor(private g: Game) {}

  enter(): void {
    this.rocks = spawnField(4);
    this.g.renderer.canvas.onclick = (e) => {
      if (inBackButton(this.g.renderer.toStage(e))) location.href = import.meta.env.BASE_URL;
      else this.startGame();
    };
  }

  exit(): void {
    this.g.renderer.canvas.onclick = null;
  }

  private started = false;

  private startGame(): void {
    // A tap arrives as both a canvas click and a touch "fire"; only start once.
    if (this.started) return;
    this.started = true;
    this.g.audio.unlock();
    this.g.setScene(new PlayScene(this.g));
  }

  update(): void {
    this.t++;
    for (const a of this.rocks) a.update();
    if (this.g.input.justPressed('fire') || this.g.input.justPressed('confirm')) this.startGame();
  }

  draw(): void {
    const g = this.g;
    const r = g.renderer;
    drawBackground(g);
    for (const a of this.rocks) a.draw(r, g.images);
    drawTitle(r, STAGE_W / 2, 135);
    drawButton(r, 'PLAY NOW!', STAGE_W / 2, STAGE_H / 2 - 40, this.t);
    drawHighScores(r, g.scores, STAGE_W / 2, STAGE_H / 1.6);
    drawBackButton(r);
    drawHint(
      r,
      document.body.classList.contains('touch')
        ? 'Thumbstick to fly  ·  tap anywhere to shoot'
        : 'ARROWS / WASD to fly  ·  SPACE to shoot  ·  P pause  ·  M mute',
    );
  }
}
