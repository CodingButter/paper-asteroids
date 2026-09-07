import { STAGE_H, STAGE_W } from '../core/constants';
import type { Game } from '../core/game';
import type { Renderer } from '../core/renderer';
import { MAX_ENTRIES, type HighScores } from '../core/highscores';

export function drawBackground(g: Game): void {
  g.renderer.ctx.drawImage(g.images.background, 0, 0, STAGE_W, STAGE_H);
}

/** "PAPER ASTEROIDS" title block, centred at (cx, cy). */
export function drawTitle(r: Renderer, cx: number, cy: number, withCredit = true): void {
  r.text('paperGAMES', cx - 300, cy - 110, 40, { align: 'left', shadow: true });
  r.text('presents', cx - 300, cy - 75, 21, { align: 'left', shadow: true });
  r.text('PAPER', cx - 300, cy - 15, 48, { align: 'left', shadow: true });
  r.text('ASTEROIDS', cx, cy + 60, 90, { shadow: true });
  if (withCredit) r.text('Created By: Jelly Sandwitch ltd 2009', cx, cy + 130, 22, { color: '#ff0000', shadow: true });
}

/** A torn paper strip with red text — the original "PLAY NOW!" / "PLAY AGAIN" button. */
export function drawButton(r: Renderer, label: string, cx: number, cy: number, pulse: number): void {
  const w = 260 + Math.sin(pulse / 10) * 4;
  r.paperStrip(cx, cy, w, 44, 7);
  r.text(label, cx, cy + 2, 36, { color: '#ff0000' });
}

export function drawHighScores(r: Renderer, scores: HighScores, cx: number, cy: number): void {
  const { entries } = scores;
  r.paperStrip(cx, cy + 50, 340, 170, 3);
  r.text(scores.online ? 'WORLD HIGH SCORES' : 'HIGH SCORES', cx, cy - 15, 24, { color: '#000' });
  for (let i = 0; i < MAX_ENTRIES; i++) {
    const e = entries[i];
    const y = cy + 15 + i * 24;
    r.text(`${i + 1}. ${e ? e.name : '---'}`, cx - 120, y, 21, { color: '#000', align: 'left' });
    r.text(e ? String(e.score) : '0', cx + 120, y, 21, { color: '#000', align: 'right' });
  }
}

export function drawHint(r: Renderer, str: string): void {
  const c = r.ctx;
  c.save();
  c.font = '16px system-ui, sans-serif';
  c.fillStyle = '#999';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(str, STAGE_W / 2, STAGE_H - 24);
  c.restore();
}

/** Quiet "back to the dedication page" link, centred just above the control hints. */
export const BACK_RECT = { x: STAGE_W / 2 - 90, y: STAGE_H - 66, w: 180, h: 28 };
export function drawBackButton(r: Renderer): void {
  const c = r.ctx;
  c.save();
  c.font = '16px system-ui, sans-serif';
  c.fillStyle = '#ddd';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const cx = BACK_RECT.x + BACK_RECT.w / 2;
  const cy = BACK_RECT.y + BACK_RECT.h / 2;
  c.fillText('Back to the story', cx, cy);
  c.fillRect(cx - 58, cy + 10, 116, 1);
  c.restore();
}
export function inBackButton(p: { x: number; y: number }): boolean {
  const { x, y, w, h } = BACK_RECT;
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}
