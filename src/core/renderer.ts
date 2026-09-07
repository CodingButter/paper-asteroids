import { STAGE_H, STAGE_W } from './constants';

/**
 * Owns the canvas. Renders at logical 1024x768 and letterboxes into the window,
 * using devicePixelRatio so the paper textures stay crisp on HiDPI screens.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private scale = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    const w = Math.floor(STAGE_W * this.scale);
    const h = Math.floor(STAGE_H * this.scale);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.style.marginTop = `${Math.floor((window.innerHeight - h) / 2)}px`;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
  }

  /** Convert a mouse event's position into logical stage coordinates. */
  toStage(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / this.scale, y: (e.clientY - rect.top) / this.scale };
  }

  /** Apply the stage->canvas transform. Call at the start of every frame. */
  begin(): void {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(this.scale * dpr, 0, 0, this.scale * dpr, 0, 0);
  }

  /** Draw an image centred on (x, y), rotated by `rot` degrees and scaled uniformly. */
  sprite(
    img: HTMLImageElement,
    x: number,
    y: number,
    rot: number,
    scale: number,
    opts: { alpha?: number; shadow?: boolean } = {},
  ): void {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate((rot * Math.PI) / 180);
    c.scale(scale, scale);
    if (opts.alpha !== undefined) c.globalAlpha = opts.alpha;
    if (opts.shadow !== false) this.paperShadow(c);
    c.drawImage(img, -img.width / 2, -img.height / 2);
    c.restore();
  }

  /** The DropShadowFilter every paper cutout wore in the original. */
  paperShadow(c: CanvasRenderingContext2D = this.ctx, distance = 12): void {
    const a = (40 * Math.PI) / 180;
    c.shadowColor = 'rgba(0,0,0,0.63)';
    c.shadowBlur = 6;
    c.shadowOffsetX = Math.cos(a) * distance;
    c.shadowOffsetY = Math.sin(a) * distance;
  }

  text(
    str: string,
    x: number,
    y: number,
    size: number,
    opts: { color?: string; align?: CanvasTextAlign; shadow?: boolean; alpha?: number } = {},
  ): void {
    const c = this.ctx;
    c.save();
    c.font = `${size}px Ransom, Impact, sans-serif`;
    c.fillStyle = opts.color ?? '#fff';
    c.textAlign = opts.align ?? 'center';
    c.textBaseline = 'middle';
    if (opts.alpha !== undefined) c.globalAlpha = opts.alpha;
    if (opts.shadow) this.paperShadow(c, 6);
    c.fillText(str, x, y);
    c.restore();
  }

  /** A torn-paper strip used for buttons and panels. */
  paperStrip(x: number, y: number, w: number, h: number, seed = 1): void {
    const c = this.ctx;
    c.save();
    this.paperShadow(c, 8);
    c.fillStyle = '#f2f2f2';
    c.beginPath();
    // Deterministic jagged edge so it doesn't shimmer between frames.
    let s = seed;
    const jitter = () => {
      s = (s * 9301 + 49297) % 233280;
      return (s / 233280 - 0.5) * 6;
    };
    const steps = Math.max(4, Math.floor(w / 18));
    c.moveTo(x - w / 2, y - h / 2 + jitter());
    for (let i = 1; i <= steps; i++) c.lineTo(x - w / 2 + (w * i) / steps, y - h / 2 + jitter());
    c.lineTo(x + w / 2 + jitter(), y + h / 2);
    for (let i = steps - 1; i >= 0; i--) c.lineTo(x - w / 2 + (w * i) / steps, y + h / 2 + jitter());
    c.closePath();
    c.fill();
    c.restore();
  }
}
