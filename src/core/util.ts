/** Uniform random in [min, max + 1) — matches the original randRange quirk used for positions. */
export function randRange(min: number, max: number): number {
  return Math.random() * (max - min + 1) + min;
}

/** Integer random in [min, max]. */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wrap(v: number, margin: number, size: number): number {
  if (v < -margin) return size + margin;
  if (v > size + margin) return -margin;
  return v;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
