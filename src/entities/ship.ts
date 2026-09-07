import { DEG, STAGE_H, STAGE_W } from '../core/constants';
import type { Images } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { wrap } from '../core/util';

// The rocket bitmap is drawn tilted; the original placed it with a ~38° rotation at ~0.5 scale.
export const SHIP_SCALE = 0.5;
export const SHIP_ART_ROT = 38;
const FLAME_SCALE = 0.57;
const ROT_SPEED = 6.5;
const THRUST = 0.5;
const MAX_SPEED = 7.54;
const FRICTION = 0.98;
export const FIRE_RATE = 30;
const INVULN_TICKS = 100;

export type ShipState = 'spawning' | 'alive' | 'dying' | 'gone';

export class Ship {
  x = STAGE_W / 2;
  y = STAGE_H / 2;
  vx = 0;
  vy = 0;
  angle = 0;
  thrusting = false;
  state: ShipState = 'spawning';
  private invuln = INVULN_TICKS;
  private alpha = 1;
  private alphaUp = false;
  private flicker = 0;
  readonly radius = 18;

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  get canAct(): boolean {
    return this.state === 'alive' || this.state === 'spawning';
  }

  get vulnerable(): boolean {
    return this.state === 'alive';
  }

  steer(left: boolean, right: boolean, thrust: boolean): void {
    if (!this.canAct) return;
    if (right) this.angle += ROT_SPEED;
    if (left) this.angle -= ROT_SPEED;
    this.thrusting = thrust;
    if (thrust && this.speed < MAX_SPEED) {
      this.vx += Math.sin(this.angle * DEG) * THRUST;
      this.vy -= Math.cos(this.angle * DEG) * THRUST;
    }
  }

  /** Muzzle position: half a ship-width ahead of the nose. */
  muzzle(): { x: number; y: number } {
    const d = 34;
    return { x: this.x + Math.sin(this.angle * DEG) * d, y: this.y - Math.cos(this.angle * DEG) * d };
  }

  kill(): void {
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.state = 'dying';
  }

  update(): void {
    this.x = wrap(this.x + this.vx, 30, STAGE_W);
    this.y = wrap(this.y + this.vy, 30, STAGE_H);
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.flicker++;

    if (this.state === 'spawning') {
      // Pulse between 30% and 80% alpha while invulnerable, exactly like the original.
      if (this.alpha < 0.3) this.alphaUp = true;
      if (this.alpha > 0.8) this.alphaUp = false;
      this.alpha += this.alphaUp ? 0.1 : -0.1;
      if (--this.invuln <= 0) {
        this.state = 'alive';
        this.alpha = 1;
      }
    }
  }

  draw(r: Renderer, images: Images): void {
    if (this.state === 'dying' || this.state === 'gone') return;
    if (this.thrusting) {
      // The flame is a yellow paper scrap tucked under the tail; jitter it a little.
      const s = FLAME_SCALE + ((this.flicker >> 1) % 2) * 0.08;
      const c = r.ctx;
      c.save();
      c.translate(this.x, this.y);
      c.rotate(this.angle * DEG);
      c.translate(0, 48);
      r.sprite(images.flame, 0, 0, SHIP_ART_ROT + ((this.flicker >> 1) % 2 ? 5 : -5), s, {
        alpha: this.alpha,
        shadow: false,
      });
      c.restore();
    }
    r.sprite(images.ship, this.x, this.y, this.angle + SHIP_ART_ROT, SHIP_SCALE, { alpha: this.alpha });
  }
}
