import { DEG, STAGE_H, STAGE_W } from '../core/constants';
import type { Images } from '../core/assets';
import type { Renderer } from '../core/renderer';
import { clamp, randInt, randRange, wrap } from '../core/util';

const MAX_SPEED = 3;
/** Collision radius of a full-size (scale 1) rock. The art is ~197x145, torn edges. */
const BASE_RADIUS = 72;

export type AsteroidSize = 'big' | 'mid' | 'small';

export class Asteroid {
  private variant = randInt(1, 4) as 1 | 2 | 3 | 4;
  private rot = randRange(0, 360);
  private rotSpeed: number;
  private vx: number;
  private vy: number;
  dead = false;
  /** Set when an enemy (not the player) destroys it, so no points are awarded. */
  killedByEnemy = false;

  constructor(
    public x: number,
    public y: number,
    /** 1 = full size, 0.5, 0.25. */
    readonly scale: number,
    heading: number,
  ) {
    const pct = scale * 100;
    this.rotSpeed = randRange(-0.6, 0.6) * ((150 - pct) / 100);
    // Smaller rocks are faster — this is the original (120 - scale) / 18 curve.
    const ss = (120 - pct) / 18;
    const sx = randRange(ss, ss + 3);
    const sy = randRange(ss, ss + 3);
    this.vx = clamp(Math.sin(heading * DEG) * sy, -MAX_SPEED, MAX_SPEED);
    this.vy = clamp(-Math.cos(heading * DEG) * sx, -MAX_SPEED, MAX_SPEED);
  }

  get radius(): number {
    return BASE_RADIUS * this.scale;
  }

  get size(): AsteroidSize {
    return this.scale > 0.85 ? 'big' : this.scale > 0.35 ? 'mid' : 'small';
  }

  get heading(): number {
    return Math.atan2(this.vx, -this.vy) / DEG;
  }

  update(): void {
    this.rot += this.rotSpeed;
    const m = this.radius;
    this.x = wrap(this.x + this.vx, m, STAGE_W);
    this.y = wrap(this.y + this.vy, m, STAGE_H);
  }

  /** Two half-size children, deflected ±15–26° off the parent's heading. Small rocks don't split. */
  split(): Asteroid[] {
    if (this.scale <= 0.4) return [];
    const h = this.heading;
    return [
      new Asteroid(this.x, this.y, this.scale / 2, h + randRange(15, 26)),
      new Asteroid(this.x, this.y, this.scale / 2, h - randRange(15, 26)),
    ];
  }

  draw(r: Renderer, images: Images): void {
    // Variant 4's bitmap is larger than the others and was placed at ~0.57 in the original.
    const art = this.variant === 4 ? 0.57 : 1;
    r.sprite(images[`asteroid${this.variant}`], this.x, this.y, this.rot, this.scale * art);
  }
}

/** Spawns rocks in the outer thirds of the stage so the ship never starts inside one. */
export function spawnField(count: number): Asteroid[] {
  const out: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() < 0.5 ? randRange(0, STAGE_W / 3) : randRange(STAGE_W / 1.5, STAGE_W);
    const y = Math.random() < 0.5 ? randRange(0, STAGE_H / 4) : randRange((STAGE_H / 4) * 3, STAGE_H);
    out.push(new Asteroid(x, y, 1, randRange(0, 360)));
  }
  return out;
}
