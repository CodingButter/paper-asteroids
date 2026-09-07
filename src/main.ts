import { loadFont, loadImages } from './core/assets';
import { STAGE_H, STAGE_W } from './core/constants';
import { Game } from './core/game';
import { Renderer } from './core/renderer';
import { attachTouch } from './core/touch';
import { TitleScene } from './scenes/title';

const canvas = document.getElementById('game') as HTMLCanvasElement;

// The original had a crumpled-paper loading bar; we keep the beat.
const boot = new Renderer(canvas);
function drawLoading(frac: number): void {
  boot.begin();
  const c = boot.ctx;
  c.fillStyle = '#000';
  c.fillRect(0, 0, STAGE_W, STAGE_H);
  boot.paperStrip(STAGE_W / 2, STAGE_H / 2, 420, 50, 5);
  c.fillStyle = '#ff0000';
  c.fillRect(STAGE_W / 2 - 194, STAGE_H / 2 - 14, 388 * frac, 28);
}
drawLoading(0);

const [images] = await Promise.all([loadImages((d, t) => drawLoading(d / t)), loadFont().catch(() => undefined)]);

const game = new Game(canvas, images);
attachTouch(game.input);
game.setScene(new TitleScene(game));
game.start();
