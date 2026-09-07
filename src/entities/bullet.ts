import { DEG, STAGE_H, STAGE_W } from '../core/constants';
import type { Renderer } from '../core/renderer';
import { wrap } from '../core/util';

const SPEED = 10;

export class Bullet {
  private vx: number;
  private vy: number;
  dead = false;
  readonly radius = 3;

  constructor(
    public x: number,
    public y: number,
    angle: number,
    private life: number,
    /** Player bullets score; enemy bullets don't, and can kill the player. */
    readonly fromPlayer: boolean,
  ) {
    this.vx = Math.sin(angle * DEG) * SPEED;
    this.vy = -Math.cos(angle * DEG) * SPEED;
  }

  update(): void {
    if (--this.life < 0) {
      this.dead = true;
      return;
    }
    this.x = wrap(this.x + this.vx, 5, STAGE_W);
    this.y = wrap(this.y + this.vy, 5, STAGE_H);
  }

  draw(r: Renderer): void {
    const c = r.ctx;
    c.save();
    r.paperShadow(c, 4);
    c.fillStyle = this.fromPlayer ? '#fff' : '#ffd23f';
    c.beginPath();
    c.arc(this.x, this.y, 2.6, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}
