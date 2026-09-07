import { DEG, STAGE_H, STAGE_W } from '../core/constants';
import type { Images } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { randInt, randRange } from '../core/util';
import { Bullet } from './bullet';

export type EnemyKind = 'big' | 'small';

const CONFIG = {
  // The big saucer drifts and fires in random directions.
  big: { speed: 2.5, scale: 0.343, radius: 40, bulletLife: 40, particles: 12, points: 125, loop: 'enemyLow' },
  // The little one is faster, fires at the player (with some spread), and is worth more.
  small: { speed: 3.2, scale: 0.258, radius: 22, bulletLife: 20, particles: 8, points: 150, loop: 'enemyHigh' },
} as const;

const FIRE_EVERY = 50;

export class Enemy {
  x = -200;
  y = randRange(20, STAGE_H - 20);
  private vx: number;
  private vy = 0;
  private wander = randInt(20, 150);
  private moving = true;
  private fireIn = FIRE_EVERY;
  dead = false;

  constructor(readonly kind: EnemyKind) {
    const dir = randRange(0, 5) < 2 ? 1 : -1;
    this.vx = CONFIG[kind].speed * dir;
  }

  get cfg() {
    return CONFIG[this.kind];
  }

  get radius(): number {
    return this.cfg.radius;
  }

  /** Returns a bullet when it's time to shoot. */
  update(target: { x: number; y: number } | null): Bullet | null {
    this.x += this.vx;
    this.y += this.vy;

    // Alternate between drifting straight and a random vertical wobble.
    if (--this.wander <= 0) {
      this.vy = this.moving ? 0 : randRange(-3, 3);
      this.moving = !this.moving;
      this.wander = randInt(20, 150);
    }

    const halfW = this.radius;
    if (this.x < -halfW) this.x = STAGE_W + halfW;
    if (this.x > STAGE_W + halfW) this.x = -halfW;
    if (this.y < halfW / 2) this.vy = 0.2;
    if (this.y > STAGE_H - halfW / 2) this.vy = -0.2;

    if (--this.fireIn <= 0) {
      this.fireIn = FIRE_EVERY;
      let angle: number;
      if (this.kind === 'small' && target) {
        angle = Math.atan2(target.y - this.y, target.x - this.x) / DEG + 90 + randRange(-20, 20);
      } else {
        angle = randRange(0, 360);
      }
      return new Bullet(this.x, this.y, angle, this.cfg.bulletLife, false);
    }
    return null;
  }

  draw(r: Renderer, images: Images): void {
    r.sprite(this.kind === 'big' ? images.ufoBig : images.ufoSmall, this.x, this.y, 0, this.cfg.scale);
  }
}
