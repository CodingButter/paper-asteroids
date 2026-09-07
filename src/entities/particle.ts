import { DEG } from '../core/constants';
import { randRange } from '../core/util';
import type { Renderer } from '../core/renderer';

/** A scrap of white paper thrown off by an explosion. */
export class Particle {
  private angle = randRange(0, 360);
  private life = randRange(10, 200);
  private rot = randRange(0, 360);
  private rotSpeed = randRange(-15, 15);
  private size = randRange(0.3, 1.0);
  private speed = randRange(3, 8);
  dead = false;

  constructor(
    public x: number,
    public y: number,
  ) {}

  update(): void {
    this.rot += this.rotSpeed;
    this.x += Math.sin(this.angle * DEG) * this.speed;
    this.y -= Math.cos(this.angle * DEG) * this.speed;
    if (--this.life < 0) this.dead = true;
  }

  draw(r: Renderer): void {
    const c = r.ctx;
    c.save();
    c.translate(this.x, this.y);
    c.rotate(this.rot * DEG);
    c.scale(this.size, this.size);
    c.fillStyle = '#fff';
    c.beginPath();
    // Traced from the original DefineShape 27.
    c.moveTo(1.25, -5.3);
    c.quadraticCurveTo(1.4, 0.55, 5.5, 4.75);
    c.lineTo(-6.3, 4.75);
    c.lineTo(-6.45, 4.35);
    c.quadraticCurveTo(-4.3, 1.6, -3.05, -1.1);
    c.lineTo(-7.6, -1.55);
    c.quadraticCurveTo(-5.85, -4.25, -6.45, -4.95);
    c.lineTo(1.1, -5.7);
    c.closePath();
    c.fill();
    c.restore();
  }
}

export function burst(list: Particle[], x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) list.push(new Particle(x, y));
}
