import { STAGE_H, STAGE_W } from '../core/constants';
import type { Game, Scene } from '../core/game';
import { dist2 } from '../core/util';
import { Asteroid, spawnField } from '../entities/asteroid';
import { Bullet } from '../entities/bullet';
import { Enemy, type EnemyKind } from '../entities/enemy';
import { burst, Particle } from '../entities/particle';
import { FIRE_RATE, Ship, SHIP_ART_ROT, SHIP_SCALE } from '../entities/ship';
import { GameOverScene } from './gameover';
import { drawBackground } from './ui';

const START_LIVES = 3;
const START_ROCKS = 4;
const MAX_ROCKS = 8;
/** Ticks the ship stays exploded before respawn / game over. */
const DEATH_TICKS = 40;
const RESPAWN_DELAY = 3;
/** Ticks before the next wave once the field is clear. */
const WAVE_DELAY = 68;
/** Ticks (while the ship is alive) before the first saucer, and between saucers. */
const FIRST_ENEMY = 1300;
const ENEMY_INTERVAL = 500;
/** Heartbeat: starts slow, speeds up with each rock destroyed, resets each wave. */
const BEAT_START = 35;
const BEAT_MIN = 16.5;

const POINTS = { big: 20, mid: 50, small: 100 } as const;
const RIP = { big: 'bigRip', mid: 'midRip', small: 'lilRip' } as const;
const DEBRIS = { big: 18, mid: 12, small: 6 } as const;

export class PlayScene implements Scene {
  private ship = new Ship();
  private rocks: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private enemy: Enemy | null = null;
  private nextEnemyKind: EnemyKind = 'big';
  private enemyTimer = FIRST_ENEMY;

  private score = 0;
  private lives = START_LIVES;
  private wave = 0;
  private waveTimer = 0;
  private deathTimer = 0;
  private respawnTimer = 0;
  private fireTimer = 0;
  private paused = false;

  private beatInterval = BEAT_START;
  private beatTimer = BEAT_START;
  private beatStep = 0.08;
  private beatHigh = false;
  private thrustPlaying = false;

  constructor(private g: Game) {}

  enter(): void {
    this.newWave();
    this.g.renderer.canvas.onclick = (e) => this.onClick(e);
  }

  exit(): void {
    this.g.audio.stopAllLoops();
    this.g.renderer.canvas.onclick = null;
  }

  /** Pause menu layout (stage coords). */
  private static readonly RESUME_Y = STAGE_H / 2 + 10;
  private static readonly QUIT_Y = STAGE_H / 2 + 70;

  private onClick(e: MouseEvent): void {
    if (!this.paused) return;
    const { x, y } = this.g.renderer.toStage(e);
    if (Math.abs(x - STAGE_W / 2) > 130) return;
    if (Math.abs(y - PlayScene.RESUME_Y) < 22) this.paused = false;
    else if (Math.abs(y - PlayScene.QUIT_Y) < 22) this.quit();
  }

  /** Leave the game and go back to the dedication page. */
  private quit(): void {
    this.g.audio.stopAllLoops();
    location.href = import.meta.env.BASE_URL;
  }

  private newWave(): void {
    this.wave++;
    this.rocks = spawnField(Math.min(START_ROCKS + this.wave - 1, MAX_ROCKS));
    this.beatInterval = BEAT_START;
    this.beatStep = 0.08;
  }

  // ---- update -------------------------------------------------------------

  update(): void {
    const { input, audio } = this.g;
    if (input.justPressed('pause')) {
      this.paused = !this.paused;
      if (this.paused) this.stopThrust();
    }
    if (this.paused) {
      if (input.justPressed('quit')) this.quit();
      return;
    }

    this.updateShip();
    this.updateEnemy();
    for (const r of this.rocks) r.update();
    for (const b of this.bullets) b.update();
    for (const p of this.particles) p.update();
    this.collide();

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.rocks = this.rocks.filter((r) => !r.dead);
    if (this.enemy?.dead) {
      audio.stop(this.enemy.cfg.loop);
      this.enemy = null;
    }

    if (this.rocks.length === 0 && ++this.waveTimer >= WAVE_DELAY) {
      this.waveTimer = 0;
      this.newWave();
    }
  }

  private updateShip(): void {
    const { input, audio } = this.g;
    const ship = this.ship;

    if (ship.state === 'dying') {
      this.stopThrust();
      if (++this.deathTimer >= DEATH_TICKS) {
        this.deathTimer = 0;
        this.lives--;
        if (this.lives <= 0) {
          this.g.setScene(new GameOverScene(this.g, this.score));
          return;
        }
        ship.state = 'gone';
        this.respawnTimer = RESPAWN_DELAY;
      }
      return;
    }
    if (ship.state === 'gone') {
      if (--this.respawnTimer <= 0) this.ship = new Ship();
      return;
    }

    if (input.stick) ship.steerAnalog(input.stick.turn, input.stick.throttle);
    else ship.steer(input.isDown('left'), input.isDown('right'), input.isDown('thrust'));
    ship.update();

    if (ship.thrusting && !this.thrustPlaying) {
      this.thrustPlaying = true;
      audio.loop('thrust');
    } else if (!ship.thrusting) {
      this.stopThrust();
    }

    if (input.isDown('fire')) {
      if (--this.fireTimer <= 0) {
        this.fireTimer = FIRE_RATE;
        const m = ship.muzzle();
        this.bullets.push(new Bullet(m.x, m.y, ship.angle, 45, true));
        audio.play('shooter');
      }
    } else {
      this.fireTimer = 0;
    }

    // Heartbeat: "hum"... "hum"... alternating between the two recorded voices.
    if (--this.beatTimer <= 0) {
      this.beatTimer = this.beatInterval;
      audio.play(this.beatHigh ? 'jamHum' : 'scoHum');
      this.beatHigh = !this.beatHigh;
    }
  }

  private stopThrust(): void {
    if (!this.thrustPlaying) return;
    this.thrustPlaying = false;
    this.g.audio.stop('thrust');
  }

  private updateEnemy(): void {
    const { audio } = this.g;
    if (this.enemy) {
      const shot = this.enemy.update(this.ship.canAct ? this.ship : null);
      if (shot) this.bullets.push(shot);
      return;
    }
    if (this.ship.state === 'alive' && --this.enemyTimer <= 0) {
      this.enemyTimer = ENEMY_INTERVAL;
      this.enemy = new Enemy(this.nextEnemyKind);
      this.nextEnemyKind = this.nextEnemyKind === 'big' ? 'small' : 'big';
      audio.loop(this.enemy.cfg.loop);
    }
  }

  // ---- collisions -----------------------------------------------------------

  private hit(a: { x: number; y: number; radius: number }, b: { x: number; y: number; radius: number }): boolean {
    const r = a.radius + b.radius;
    return dist2(a.x, a.y, b.x, b.y) < r * r;
  }

  private collide(): void {
    const ship = this.ship;
    const enemy = this.enemy;

    // Bullets vs rocks / enemy / ship.
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const r of this.rocks) {
        if (r.dead || !this.hit(b, r)) continue;
        b.dead = true;
        r.killedByEnemy = !b.fromPlayer;
        this.destroyRock(r);
        break;
      }
      if (b.dead) continue;
      if (b.fromPlayer && enemy && !enemy.dead && this.hit(b, enemy)) {
        b.dead = true;
        this.score += enemy.cfg.points;
        this.destroyEnemy();
      } else if (!b.fromPlayer && ship.vulnerable && this.hit(b, ship)) {
        b.dead = true;
        this.killShip();
      }
    }

    // Enemy vs rocks: both go, no points.
    if (enemy && !enemy.dead) {
      for (const r of this.rocks) {
        if (r.dead || !this.hit(enemy, r)) continue;
        r.killedByEnemy = true;
        this.destroyRock(r);
        this.destroyEnemy();
        break;
      }
    }

    if (!ship.vulnerable) return;
    for (const r of this.rocks) {
      if (r.dead || !this.hit(ship, r)) continue;
      this.killShip();
      // The rock that got you breaks too — unless it was your last life.
      if (this.lives > 1) {
        r.killedByEnemy = true;
        this.destroyRock(r);
      }
      return;
    }
    if (enemy && !enemy.dead && this.hit(ship, enemy)) {
      this.killShip();
      if (this.lives > 1) this.destroyEnemy();
    }
  }

  private destroyRock(r: Asteroid): void {
    r.dead = true;
    const size = r.size;
    if (!r.killedByEnemy) this.score += POINTS[size];
    this.g.audio.play(RIP[size]);
    burst(this.particles, r.x, r.y, DEBRIS[size]);
    this.rocks.push(...r.split());
    if (this.beatInterval > BEAT_MIN) {
      this.beatInterval -= this.beatStep;
      this.beatStep += 0.06;
    }
  }

  private destroyEnemy(): void {
    const e = this.enemy;
    if (!e || e.dead) return;
    e.dead = true;
    this.g.audio.play('explosion');
    burst(this.particles, e.x, e.y, e.cfg.particles);
    this.enemyTimer = ENEMY_INTERVAL;
  }

  private killShip(): void {
    this.g.audio.play('explosion');
    burst(this.particles, this.ship.x, this.ship.y, 12);
    this.ship.kill();
  }

  // ---- draw -----------------------------------------------------------------

  draw(): void {
    const g = this.g;
    const r = g.renderer;
    drawBackground(g);

    for (const a of this.rocks) a.draw(r, g.images);
    this.enemy?.draw(r, g.images);
    for (const b of this.bullets) b.draw(r);
    this.ship.draw(r, g.images);
    for (const p of this.particles) p.draw(r);

    // HUD
    r.text(`Score ${this.score}`, 50, 30, 35, { align: 'left', shadow: true });
    for (let i = 0; i < this.lives; i++) {
      r.sprite(g.images.ship, 70 + i * 36, 80, SHIP_ART_ROT, SHIP_SCALE * 0.6);
    }
    if (this.rocks.length === 0) {
      r.text(`WAVE ${this.wave + 1}`, STAGE_W / 2, STAGE_H / 2 - 120, 48, { shadow: true });
    }
    if (g.audio.muted) r.text('MUTED', STAGE_W - 50, 30, 21, { align: 'right', color: '#aaa' });

    if (this.paused) {
      r.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      r.ctx.fillRect(0, 0, STAGE_W, STAGE_H);
      r.text('PAUSED', STAGE_W / 2, STAGE_H / 2 - 70, 48, { shadow: true });
      r.paperStrip(STAGE_W / 2, PlayScene.RESUME_Y, 260, 44, 11);
      r.text('RESUME  (P)', STAGE_W / 2, PlayScene.RESUME_Y + 2, 30, { color: '#000' });
      r.paperStrip(STAGE_W / 2, PlayScene.QUIT_Y, 260, 44, 4);
      r.text('QUIT  (Q)', STAGE_W / 2, PlayScene.QUIT_Y + 2, 30, { color: '#ff0000' });
    }
  }
}
